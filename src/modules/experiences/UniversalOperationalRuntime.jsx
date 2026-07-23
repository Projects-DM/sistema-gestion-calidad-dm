import { useState, useEffect } from 'react';
import { Plus, Download, FileText, Search, Filter, Save, X, CheckCircle, AlertTriangle, ShieldAlert, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import RoleGate from '../../components/RoleGate';
import UniversalImportWorkflow from './UniversalImportWorkflow';
import { createOperationalRecordsService } from '../../services/operationalRecordsService.js';
import { OperationalExperienceRegistry } from '../../core/capabilities/experiences/OperationalExperienceRegistry.js';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  evaluateRecord,
  applyFormAutomations,
  getFormVisibility,
} from '../../core/capabilities/experiences/rules/UniversalOperationalRulesEngine.js';

function detectInputType(field, contract) {
  const normalizer = contract.documentContract.fieldNormalizers?.[field];
  if (normalizer?.name === 'toYmd') return 'date';
  if (normalizer?.name === 'toHm') return 'time';
  if (normalizer?.name === 'toNumber') return 'number';
  return 'text';
}

function buildEmptyForm(canonicalFields, contract) {
  const form = {};
  for (const f of canonicalFields) {
    const type = detectInputType(f, contract);
    if (type === 'date') {
      form[f] = format(new Date(), 'yyyy-MM-dd');
    } else if (type === 'time') {
      form[f] = format(new Date(), 'HH:mm');
    } else {
      form[f] = '';
    }
  }
  return form;
}

function getFieldLabel(field, contract) {
  return contract.ui?.fieldDisplay?.[field]?.label
    || contract.documentContract.synonyms?.[field]?.[0]
    || field;
}

function getFieldOptions(field, contract) {
  return contract.ui?.fieldDisplay?.[field]?.options || null;
}

function getAutocompleteSource(field, contract) {
  return contract.ui?.fieldDisplay?.[field]?.autocomplete || null;
}

function getTableFields(contract) {
  return contract.ui?.tableFields || contract.documentContract.canonicalFields || [];
}

export default function UniversalOperationalRuntime({ experienceKey, moduleSlug, moduleName }) {
  const contract = OperationalExperienceRegistry.getExperienceContract(experienceKey);
  const { canonicalFields, synonyms, fieldNormalizers } = contract.documentContract;
  const tableFields = getTableFields(contract);
  const persistenceConfig = contract.persistence || { tableName: experienceKey, prefix: experienceKey.slice(0, 3).toUpperCase() };
  const service = createOperationalRecordsService(persistenceConfig.tableName, {
    prefix: persistenceConfig.prefix,
    fieldMapping: contract.ui?.fieldMapping,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [banner, setBanner] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState([]);
  const [complianceWarnings, setComplianceWarnings] = useState([]);
  const [visibility, setVisibility] = useState({});

  const { isAdmin } = useAuth();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        setBanner({ type: 'error', message: 'Supabase no configurado.' });
        return;
      }
      setLoading(true);
      try {
        const data = await service.fetch();
        if (!cancelled) setRecords(data);
      } catch (err) {
        if (!cancelled) setBanner({ type: 'error', message: err?.message || 'Error al cargar registros.' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isFormOpen) {
      let initial;
      if (editingRecord) {
        initial = {};
        for (const f of canonicalFields) initial[f] = editingRecord[f] ?? '';
      } else {
        initial = buildEmptyForm(canonicalFields, contract);
      }
      const automated = applyFormAutomations(initial, contract);
      const vis = getFormVisibility(automated, contract);
      setFormData(automated);
      setVisibility(vis);
      setFormErrors([]);
      setComplianceWarnings([]);
    }
  }, [isFormOpen, editingRecord]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      setVisibility(getFormVisibility(next, contract));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { isValid, allErrors, complianceIssues } = evaluateRecord(formData, contract);
    setFormErrors(allErrors);
    setComplianceWarnings(complianceIssues);
    if (!isValid) {
      setBanner({ type: 'error', message: `${allErrors.length} error(es) de validación. Revise el formulario.` });
      return;
    }
    if (!isSupabaseConfigured()) {
      setBanner({ type: 'error', message: 'Configure Supabase para guardar.' });
      return;
    }
    setSaving(true);
    try {
      if (editingRecord) {
        const updated = await service.update(editingRecord.id, formData);
        setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
        setBanner({ type: 'success', message: 'Registro actualizado.' });
      } else {
        const inserted = await service.insert(formData);
        setRecords(prev => [inserted, ...prev]);
        setBanner({ type: 'success', message: 'Registro guardado.' });
      }
      setIsFormOpen(false);
      setEditingRecord(null);
    } catch (err) {
      setBanner({ type: 'error', message: err?.message || 'Error al guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try {
      await service.delete(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      setBanner({ type: 'success', message: 'Registro eliminado.' });
    } catch (err) {
      setBanner({ type: 'error', message: 'Error al eliminar: ' + err.message });
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleExcelImported = async (rows) => {
    if (!isSupabaseConfigured()) {
      setBanner({ type: 'error', message: 'Configure Supabase para importar.' });
      return;
    }
    if (!rows?.length) {
      setBanner({ type: 'error', message: 'No se importaron filas.' });
      return;
    }
    setSaving(true);
    try {
      const inserted = await service.insertBatch(rows);
      setRecords(prev => [...inserted, ...prev]);
      setIsExcelOpen(false);
      setBanner({ type: 'success', message: `Importación exitosa: ${inserted.length} registros.` });
    } catch (err) {
      setBanner({ type: 'error', message: err?.message || 'Error al importar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!records?.length) {
      setBanner({ type: 'error', message: 'No hay registros para exportar.' });
      return;
    }
    try {
      const { default: jsPDF } = await import('jspdf');
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(contract.metadata.name || 'Registros', 14, 22);
        doc.setFontSize(10);
        doc.text(`Exportado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);
        const cols = tableFields.map(f => getFieldLabel(f, contract));
        const data = records.map(r => tableFields.map(f => String(r[f] ?? '')));
        doc.autoTable({ head: [cols], body: data, startY: 36 });
        doc.save(`${experienceKey}-${format(new Date(), 'yyyyMMdd')}.pdf`);
      });
      setBanner({ type: 'success', message: 'PDF generado.' });
    } catch {
      setBanner({ type: 'error', message: 'No se pudo generar el PDF.' });
    }
  };

  const filteredRecords = records.filter(r =>
    canonicalFields.some(f =>
      String(r[f] ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{contract.metadata.name || experienceKey}</h2>
          {contract.metadata.description && (
            <p className="text-sm text-gray-500 mt-1">{contract.metadata.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isFormOpen && (
            <>
              {contract.capabilities?.supportsExport && (
                <RoleGate allowedRoles={['administrador', 'calidad']}>
                  <button onClick={handleExportPdf} disabled={loading || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium border border-gray-200 text-sm disabled:opacity-50">
                    <FileText className="w-4 h-4" /> PDF
                  </button>
                </RoleGate>
              )}
              {contract.capabilities?.supportsImport && (
                <RoleGate allowedRoles={['administrador', 'calidad']}>
                  <button onClick={() => setIsExcelOpen(true)} disabled={loading || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium border border-gray-200 text-sm disabled:opacity-50">
                    <Download className="w-4 h-4" /> Importar
                  </button>
                </RoleGate>
              )}
              <RoleGate allowedRoles={['administrador', 'operativo', 'calidad']}>
                <button onClick={() => setIsFormOpen(true)} disabled={loading || saving}
                  className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-light text-white rounded-xl font-bold shadow-md shadow-primary/20 text-sm disabled:opacity-50">
                  <Plus className="w-4 h-4" /> Nuevo
                </button>
              </RoleGate>
            </>
          )}
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div className={`rounded-2xl border px-5 py-4 text-sm flex items-start gap-3 ${
          banner.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {banner.type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5" /> : <AlertTriangle className="w-5 h-5 mt-0.5" />}
          <div className="flex-1">
            <p className="font-bold">{banner.type === 'success' ? 'Listo' : 'Atención'}</p>
            <p className="text-xs mt-1">{banner.message}</p>
          </div>
          <button onClick={() => setBanner(null)} className="p-1.5 rounded-lg hover:bg-black/5"><X className="w-4 h-4" /></button>
        </div>
      )}

      {isFormOpen ? (
        /* Generic Form */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-primary px-8 py-5 flex items-center justify-between text-white">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingRecord ? 'Editar' : 'Nuevo'} {contract.metadata.name || 'Registro'}
              </h2>
            </div>
            <button onClick={() => { setIsFormOpen(false); setEditingRecord(null); }} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              {canonicalFields.filter(f => visibility[f] !== false).map((field) => {
                const type = detectInputType(field, contract);
                const label = getFieldLabel(field, contract);
                const options = getFieldOptions(field, contract);
                const autocomplete = getAutocompleteSource(field, contract);
                const inputId = `ufield-${field}-${moduleSlug}`;
                const err = formErrors.find(e => e.field === field);
                const warn = complianceWarnings.find(c => c.field === field);
                return (
                  <div key={field} className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase">{label}</label>
                    {options ? (
                      <select value={formData[field] ?? ''} onChange={e => handleChange(field, e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : autocomplete ? (
                      <>
                        <input list={inputId} value={formData[field] ?? ''} onChange={e => handleChange(field, e.target.value)}
                          className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                        <datalist id={inputId}>
                          {autocomplete.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                      </>
                    ) : type === 'date' ? (
                      <input type="date" value={formData[field] ?? ''} onChange={e => handleChange(field, e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                    ) : type === 'time' ? (
                      <input type="time" value={formData[field] ?? ''} onChange={e => handleChange(field, e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                    ) : type === 'number' ? (
                      <input type="number" step="any" value={formData[field] ?? ''} onChange={e => handleChange(field, e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                    ) : (
                      <input type="text" value={formData[field] ?? ''} onChange={e => handleChange(field, e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                    )}
                    {err && <p className="text-xs text-red-600 mt-0.5">{err.message}</p>}
                    {warn && <p className="text-xs text-accent mt-0.5">{warn.message}</p>}
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex items-center justify-end gap-3 border-t pt-6">
              <button type="button" onClick={() => { setIsFormOpen(false); setEditingRecord(null); }}
                className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-light text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Guardando…' : (editingRecord ? 'Actualizar' : 'Guardar')}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Data Table */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
            <div className="relative w-full sm:w-96">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder={`Buscar en ${canonicalFields.length} campos...`}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm">
              <Filter className="w-4 h-4" /> Filtros
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">ID</th>
                  {tableFields.map(f => (
                    <th key={f} className="p-4">{getFieldLabel(f, contract)}</th>
                  ))}
                  <th className="p-4 pr-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={tableFields.length + 2} className="p-10 text-center text-sm text-gray-500">Cargando...</td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan={tableFields.length + 2} className="p-10 text-center text-sm text-gray-500">
                    {searchTerm ? 'Sin resultados.' : `No hay registros. Cree uno o importe.`}
                  </td></tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="p-4 pl-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-bold">
                          {record.displayId || record.id?.slice(0, 8)}
                        </span>
                      </td>
                      {tableFields.map(f => (
                        <td key={f} className="p-4 text-sm text-gray-900 max-w-[200px] truncate">
                          {detectInputType(f, contract) === 'date' ? String(record[f] ?? '').slice(0, 10) : String(record[f] ?? '')}
                        </td>
                      ))}
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <RoleGate allowedRoles={['administrador']}>
                            <button onClick={() => handleEdit(record)}
                              className="p-1.5 text-gray-400 hover:text-primary bg-white border border-gray-200 rounded-lg shadow-sm" title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </RoleGate>
                          <RoleGate allowedRoles={['administrador']}>
                            <button onClick={() => handleDelete(record.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 bg-white border border-gray-200 rounded-lg shadow-sm" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </RoleGate>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {contract.capabilities?.supportsImport && (
        <UniversalImportWorkflow open={isExcelOpen} onClose={() => setIsExcelOpen(false)} onImported={handleExcelImported} contract={contract} />
      )}
    </div>
  );
}
