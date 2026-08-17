import { useState, useEffect, useRef, useMemo } from 'react';
import { dynamicService } from '../services/dynamicService';
import { useAuth } from '../hooks/useAuth';
import { runtimeActivationLayer } from '../runtime/integration/RuntimeActivationLayer';
import { exportService } from '../shared/services/exportService';
import { buildExportFileName } from '../shared/utils/exportFileNameBuilder';
import { useAlertRuntime } from '../hooks/useAlertRuntime';
import { alertVisualClasses, resolveAlertIcon } from '../utils/alertVisual';
import { buildEvidenceReportModel } from '../shared/report/evidenceReportModel';
import { renderEvidenceReport } from '../shared/report/evidenceReportRenderer';
import { applyFilters, uniqueSorted } from '../shared/filters/filterCore';
import { toFilterable, statusLabel, hallazgoLabel } from '../shared/filters/sgcFilterAdapter';

import { 

  Search, 
  Filter, 
  Eye, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Calendar,
  User,
  Paperclip,
  Download,
  Loader2,
  X,
  History,
  ShieldCheck
} from 'lucide-react';

export default function DynamicRecordsView({ moduleId, moduleName: moduleNameProp = '' }) {
  const { user, rol } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sprint 184 — Operational UI Consumption.
  // Consumes ONLY the Runtime Visibility surface for the Dynamic Records engine.
  const { visibility } = useAlertRuntime({
    moduleId,
    module: null,
  });
  const recordBadge = visibility?.badges?.dynamicRecords ?? null;
  
  // Modal for details
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalTab, setModalTab] = useState('details'); // details, audit
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Verification State
  const [verifyStatus, setVerifyStatus] = useState('aprobado');
  const [verifyComment, setVerifyComment] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (moduleId) {
      loadRecords();
    }
  }, [moduleId]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await dynamicService.getModuleResponses(moduleId);
      
      const processed = data.map(record => {
        let status = 'cumple'; 
        let criticalIssues = [];
        const complianceCounts = { total: 0, cumple: 0, noCumple: 0 };

        record.sgc_response_values?.forEach(val => {
          const field = val.sgc_form_fields;
          if (!field) return;

          if (field.field_type === 'boolean') {
            // Count compliance booleans
            if (val.value_json?.value) {
              complianceCounts.total++;
              if (val.value_json.value === 'Cumple') complianceCounts.cumple++;
              else if (val.value_json.value === 'No cumple') complianceCounts.noCumple++;
            } else if (val.value_boolean !== null) {
              complianceCounts.total++;
              if (val.value_boolean === true) complianceCounts.cumple++;
              else complianceCounts.noCumple++;
            }

            const nonCompliant = val.value_boolean === false ||
              (val.value_json?.value === 'No cumple');
            if (nonCompliant) {
              status = status === 'critico' ? 'critico' : 'advertencia';
              criticalIssues.push(`${field.label} (No Cumple)`);
            }
          }

          if (field.field_type === 'number' && val.value_number !== null) {
            const min = field.options?.min;
            const max = field.options?.max;
            if ((min !== undefined && val.value_number < min) || 
                (max !== undefined && val.value_number > max)) {
              status = 'critico';
              criticalIssues.push(`${field.label} (${val.value_number} fuera de rango)`);
            }
          }
        });

        const formComplianceStatus = complianceCounts.total > 0
          ? (complianceCounts.noCumple > 0 ? 'NO CONFORME' : 'CONFORME')
          : null;

        return { ...record, computedStatus: status, criticalIssues, complianceCounts, formComplianceStatus };
      });

      setRecords(processed);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (recordId) => {
    const logs = await dynamicService.getAuditLogs(recordId);
    setAuditLogs(logs);
  };

  const handleOpenModal = (rec) => {
    setSelectedRecord(rec);
    setModalTab('details');
    loadAuditLogs(rec.id);
  };

  const handleVerify = async () => {
    if (!verifyComment.trim()) {
      alert('Por favor ingrese un comentario de verificación.');
      return;
    }
    
    try {
      setVerifying(true);
      const internalEvent = await dynamicService.verifyFormResponse(selectedRecord.id, user.id, verifyStatus, verifyComment);
      if (internalEvent) {
        await runtimeActivationLayer.activate(internalEvent);
      }
      
      // Update local state
      const updatedRec = {
        ...selectedRecord,
        status: verifyStatus,
        verification_comment: verifyComment,
        verified_at: new Date().toISOString(),
        verifier: { nombre: user.user_metadata?.nombre || 'Tú' } // Mock name for UI updates instantly
      };
      setSelectedRecord(updatedRec);
      setRecords(records.map(r => r.id === updatedRec.id ? updatedRec : r));
      loadAuditLogs(selectedRecord.id);
      
      setVerifyComment('');
      alert('Registro verificado exitosamente');
    } catch (e) {
      alert('Error verificando registro: ' + e.message);
    } finally {
      setVerifying(false);
    }
  };

  const ValidationBadge = ({ status }) => {
    switch (status) {
      case 'aprobado':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wider"><ShieldCheck className="w-3 h-3" /> Aprobado</span>;
      case 'rechazado':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider"><XCircle className="w-3 h-3" /> Rechazado</span>;
      case 'corregido':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider"><CheckCircle className="w-3 h-3" /> Corregido</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider"><AlertTriangle className="w-3 h-3" /> Pendiente</span>;
    }
  };

  const StatusBadge = ({ status }) => {
    switch (status) {
      case 'cumple':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200"><CheckCircle className="w-3.5 h-3.5" /> Cumple</span>;
      case 'advertencia':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle className="w-3.5 h-3.5" /> Alerta</span>;
      case 'critico':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3.5 h-3.5" /> Crítico</span>;
      default:
        return null;
    }
  };

  const [filter, setFilter] = useState('todos'); // todos, pendientes, aprobados, rechazados, criticos, hoy
  const [selectedIds, setSelectedIds] = useState([]);  
  // Sprint 315 — secuencia del identificador documental del informe (por sesión)
  const reportSequenceRef = useRef(0);
  // Sprint 317 — Advanced Filtering. Estado local del panel: 0 consultas nuevas.
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({}); // formulario | usuario | estado | verificacion | hallazgo | desde | hasta
  // Selection logic
  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  // Sprint 317 — opciones derivadas del dataset cargado (metadata-driven, sin query).
  const formularioOptions = useMemo(() => uniqueSorted(records.map(r => r.sgc_forms?.name)), [records]);
  const usuarioOptions = useMemo(() => uniqueSorted(records.map(r => r.profiles?.nombre)), [records]);
  const estadoOptions = useMemo(() => uniqueSorted(records.map(r => r.status)), [records]);
  const hallazgoOptions = useMemo(() => uniqueSorted(records.map(r => r.computedStatus)), [records]);
  const verificacionOptions = ['pendiente', 'verificado'];

  // Sprint 317 — pipeline determinista y local: quick → search → advanced (0 queries).
  // applyFilters usa Array.prototype.filter sobre el dataset ya cargado y ordenado
  // (created_at DESC): conserva el orden de la fuente y devuelve los mismos objetos.
  const filteredRecords = useMemo(() =>
    applyFilters(records, toFilterable, { quick: filter, search: searchTerm, fields: filters }),
    [records, filter, searchTerm, filters],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center py-12 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p>Cargando historial de registros...</p>
      </div>
    );
  }

  const isVerificador = rol === 'administrador' || rol === 'calidad';

  return (
    <div className="space-y-6">
      
      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {['todos', 'hoy', 'pendientes', 'aprobados', 'rechazados', 'criticos'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border ${
              filter === f 
                ? 'bg-primary text-white border-primary shadow-sm' 
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por formulario, usuario o hallazgo..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowFilters(prev => !prev)}
            className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-xl font-medium text-sm transition-colors flex-1 sm:flex-none ${
              showFilters
                ? 'bg-primary text-white border-primary'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-4 h-4" /> Filtros Avanzados
          </button>
          <button 
            onClick={() => {
              const selectedRecords = records.filter((r) => selectedIds.includes(r.id));
              if (!selectedRecords.length) {
                // Reutiliza el patrón de notificación existente en este módulo
                alert('Seleccione al menos un registro para exportar.');
                return;
              }

              // Exportación sin consultas adicionales: usa data ya cargada en memoria
              const moduleName = selectedRecords?.[0]?.sgc_forms?.name || 'Reporte';
              const resolvedModuleId = moduleId || selectedRecords?.[0]?.sgc_forms?.module_id || '';




              // Exportación sin React: reutiliza motor desacoplado

              const nombreArchivo = buildExportFileName({
                moduleId,
                moduleName,
                formatos: 'xlsx',
              });


              console.log("selectedIds", selectedIds);
              console.log("selectedRecords.length", selectedRecords.length);
              console.log("selectedRecords", selectedRecords);

              try {
                exportService({
                  registros: selectedRecords,
                  formato: 'xlsx',
                  nombreArchivo,
                });
              } catch (error) {
                console.error("EXPORT ERROR");
                console.error(error);
                console.error(error.stack);
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 font-bold text-sm transition-colors flex-1 sm:flex-none"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>

          {/* Sprint 315 — Evidence Report Professional Renderer.
              Genera el INFORME DE EVIDENCIA DE REGISTROS con la MISMA
              selección que la exportación XLSX (0 consultas nuevas). */}
          <button
            onClick={async () => {
              const selectedRecords = records.filter((r) => selectedIds.includes(r.id));
              if (!selectedRecords.length) {
                alert('Seleccione al menos un registro para generar el informe.');
                return;
              }

              // Sprint 331 — el modelo necesita la metadata de campos (informativos
              // + orden canónico por order_index). Una consulta por formulario de
              // la selección; fallo → estructura vacía (fallback sin informativos).
              const formIds = [...new Set(
                selectedRecords.map((r) => r?.sgc_forms?.id).filter(Boolean),
              )];
              const entries = await Promise.all(formIds.map(async (id) => {
                try {
                  const fields = await dynamicService.getFormFields(id);
                  return [id, fields];
                } catch {
                  return [id, []];
                }
              }));
              const formFieldsByForm = Object.fromEntries(entries);

              const resolvedModuleId = moduleId || selectedRecords?.[0]?.sgc_forms?.module_id || '';
              reportSequenceRef.current += 1;
              const model = buildEvidenceReportModel({
                registros: selectedRecords,
                moduleId: resolvedModuleId,
                moduleName: moduleNameProp,
                now: new Date(),
                documentSequence: reportSequenceRef.current,
                formFieldsByForm,
              });

              const doc = renderEvidenceReport({ model });
              const nombreArchivo = buildExportFileName({
                moduleId: resolvedModuleId,
                moduleName: model.module.name || 'Informe',
                formatos: 'pdf',
              });
              doc.save(nombreArchivo);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-sm transition-colors flex-1 sm:flex-none"
          >
            <FileText className="w-4 h-4" /> Informe de Evidencia
          </button>

        </div>
      </div>

      {/* Sprint 317 — contador de resultados vs selección (§17) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-gray-500">
        <span><strong className="text-gray-700">{filteredRecords.length}</strong> registros encontrados</span>
        {selectedIds.length > 0 && (
          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">
            {selectedIds.length} seleccionados
          </span>
        )}
      </div>

      {/* Sprint 317 — panel de filtros avanzados (patrón visual Despachos/UOR, 0 queries) */}
      {showFilters && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" /> Filtros avanzados
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Formulario</label>
              <select
                value={filters.formulario || ''}
                onChange={e => setFilters(prev => ({ ...prev, formulario: e.target.value }))}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700"
              >
                <option value="">Todos</option>
                {formularioOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Usuario</label>
              <select
                value={filters.usuario || ''}
                onChange={e => setFilters(prev => ({ ...prev, usuario: e.target.value }))}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700"
              >
                <option value="">Todos</option>
                {usuarioOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Estado</label>
              <select
                value={filters.estado || ''}
                onChange={e => setFilters(prev => ({ ...prev, estado: e.target.value }))}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700"
              >
                <option value="">Todos</option>
                {estadoOptions.map(o => <option key={o} value={o}>{statusLabel(o)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Verificación</label>
              <select
                value={filters.verificacion || ''}
                onChange={e => setFilters(prev => ({ ...prev, verificacion: e.target.value }))}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700"
              >
                <option value="">Todas</option>
                {verificacionOptions.map(o => (
                  <option key={o} value={o}>{o === 'pendiente' ? 'Pendiente de verificación' : 'Verificado'}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Hallazgo</label>
              <select
                value={filters.hallazgo || ''}
                onChange={e => setFilters(prev => ({ ...prev, hallazgo: e.target.value }))}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700"
              >
                <option value="">Todos</option>
                {hallazgoOptions.map(o => <option key={o} value={o}>{hallazgoLabel(o)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Desde</label>
              <input
                type="date"
                value={filters.desde || ''}
                onChange={e => setFilters(prev => ({ ...prev, desde: e.target.value }))}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Hasta</label>
              <input
                type="date"
                value={filters.hasta || ''}
                onChange={e => setFilters(prev => ({ ...prev, hasta: e.target.value }))}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => setFilters({})}
              className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
            >
              Limpiar filtros
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="px-3 py-2 text-xs font-bold text-white bg-primary rounded-lg"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}

      {/* Selection Info */}
      {isVerificador && selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <span className="text-blue-800 font-bold text-sm">{selectedIds.length} registros seleccionados</span>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
              <tr>
                {isVerificador && (
                  <th className="px-4 py-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                <th className="px-6 py-4">Fecha y Hora</th>
                <th className="px-6 py-4">Formulario</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Verificación</th>
                <th className="px-6 py-4 hidden sm:table-cell">Evidencias</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((rec) => {
                return (
                  <tr key={rec.id} className={`hover:bg-gray-50/80 transition-colors ${selectedIds.includes(rec.id) ? 'bg-blue-50/30' : ''}`}>
                    {isVerificador && (
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedIds.includes(rec.id)}
                          onChange={() => toggleSelection(rec.id)}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4" onClick={() => !isVerificador && handleOpenModal(rec)}>
                      <div className="flex items-center gap-2 text-gray-900 font-medium">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        {new Date(rec.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 ml-6 hidden sm:block">
                        {new Date(rec.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="flex items-center gap-2 font-bold text-gray-900">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{rec.sgc_forms?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[160px]">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="truncate">{rec.profiles?.nombre || 'Usuario Desconocido'}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-6 truncate hidden md:block">
                          {rec.profiles?.rol || 'Rol Desconocido'}
                        </span>
                      </div>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      <StatusBadge status={rec.computedStatus} />
                      {recordBadge?.show === true && recordBadge.badge && rec.computedStatus !== 'cumple' && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${alertVisualClasses(recordBadge.badge.color).badge}`}
                          title={recordBadge.badge.tooltip}
                        >
                          {(() => {
                            const IconComponent = resolveAlertIcon(recordBadge.badge.icon);
                            return <IconComponent className="w-3 h-3" />;
                          })()}
                          {recordBadge.badge.label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ValidationBadge status={rec.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                    {rec.sgc_evidences?.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Paperclip className="w-3.5 h-3.5" /> {rec.sgc_evidences.length} Adjuntos
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Sin evidencias</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button 
                      onClick={() => handleOpenModal(rec)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center justify-center shrink-0"
                      title="Ver Detalles"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-gray-900">No hay registros</p>
                    <p className="text-sm">Aún no se han completado formularios en este módulo.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <ValidationBadge status={selectedRecord.status} />
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {selectedRecord.sgc_forms?.name}
                  </h3>
                </div>
                <p className="text-sm text-gray-500">ID Registro: {selectedRecord.id.split('-')[0]}</p>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200 px-6 pt-2 bg-gray-50/30">
              <button 
                onClick={() => setModalTab('details')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${modalTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center gap-2"><Eye className="w-4 h-4" /> Respuestas y Evidencias</div>
              </button>
              <button 
                onClick={() => setModalTab('audit')}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${modalTab === 'audit' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center gap-2"><History className="w-4 h-4" /> Auditoría y Trazabilidad</div>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
              
              {modalTab === 'details' ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 font-medium mb-1">Fecha</p>
                      <p className="font-bold text-gray-900">{new Date(selectedRecord.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 font-medium mb-1">Hora</p>
                      <p className="font-bold text-gray-900">{new Date(selectedRecord.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 font-medium mb-1">Autor</p>
                      <p className="font-bold text-gray-900">{selectedRecord.profiles?.nombre}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 font-medium mb-1">Resultado</p>
                      <StatusBadge status={selectedRecord.computedStatus} />
                    </div>
                  </div>

                  {selectedRecord.criticalIssues?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <h4 className="font-bold text-red-800 flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5" /> Hallazgos Críticos detectados
                      </h4>
                      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {selectedRecord.criticalIssues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedRecord.complianceCounts?.total > 0 && (
                    <div className={`rounded-xl p-4 border ${selectedRecord.formComplianceStatus === 'NO CONFORME' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={`font-bold flex items-center gap-2 ${selectedRecord.formComplianceStatus === 'NO CONFORME' ? 'text-amber-800' : 'text-green-800'}`}>
                          {selectedRecord.formComplianceStatus === 'NO CONFORME' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                          Estado: {selectedRecord.formComplianceStatus}
                        </h4>
                        <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded-full border">
                          {selectedRecord.complianceCounts.total} checklist
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="font-medium text-green-700">{selectedRecord.complianceCounts.cumple} cumplen</span>
                        {selectedRecord.complianceCounts.noCumple > 0 && (
                          <span className="font-medium text-red-700">{selectedRecord.complianceCounts.noCumple} no cumplen</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                      Respuestas Registradas
                    </h4>
                    <div className="space-y-4">
                      {selectedRecord.sgc_response_values?.map((val, idx) => {
                        const field = val.sgc_form_fields;
                        let displayValue = val.value_text || val.value_number || '';
                        if (field.field_type === 'boolean') {
                          if (val.value_json) {
                            displayValue = val.value_json.value || '';
                            if (val.value_json.comment) {
                              displayValue += ` — ${val.value_json.comment}`;
                            }
                          } else if (val.value_boolean !== null) {
                            displayValue = val.value_boolean ? 'Cumple' : 'No cumple';
                          }
                        }
                        if (field.field_type === 'number' && field.options?.unit) {
                          displayValue = `${val.value_number} ${field.options.unit}`;
                        }

                        return (
                          <div key={idx} className={`flex flex-col py-3 border-b border-gray-50 gap-2 ${field.field_type !== 'signature' ? 'sm:flex-row sm:items-center justify-between' : ''}`}>
                            <span className="text-sm font-medium text-gray-700">{field.label}</span>
                            {field.field_type === 'signature' ? (
                              val.value_text ? (
                                <div className="bg-gray-50 rounded-xl border border-gray-200 p-2 w-48 mt-2">
                                  <img src={val.value_text} alt={`Firma de ${field.label}`} className="w-full h-auto filter contrast-125 mix-blend-multiply" />
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 italic">Sin firma</span>
                              )
                            ) : (
                              <span className={`text-sm font-bold ${field.field_type === 'boolean' && (val.value_boolean === false || val.value_json?.value === 'No cumple') ? 'text-red-600' : 'text-gray-900'}`}>
                                {displayValue}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedRecord.sgc_evidences?.length > 0 && (
                    <div>
                      <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                        <Paperclip className="w-4 h-4 text-gray-500" /> Evidencias Adjuntas
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {selectedRecord.sgc_evidences.map((ev, idx) => (
                          <a 
                            key={idx} 
                            href={ev.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group block relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 hover:shadow-md transition-all"
                          >
                            {ev.file_type?.startsWith('image') ? (
                              <img src={ev.file_url} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText className="w-10 h-10 text-gray-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Verification Section */}
                  {(rol === 'administrador' || rol === 'calidad') && selectedRecord.status === 'pendiente_revision' && (
                    <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6">
                      <h4 className="text-base font-bold text-blue-900 flex items-center gap-2 mb-4">
                        <ShieldCheck className="w-5 h-5" /> Verificación Documental
                      </h4>
                      {selectedRecord.created_by === user.id ? (
                        <div className="bg-white p-4 rounded-xl border border-amber-200 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-amber-800">No puedes verificar tus propios registros.</p>
                            <p className="text-xs text-amber-700 mt-1">
                              Por principio de segregación de funciones, los registros creados por ti deben ser verificados por otro usuario autorizado.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-blue-800 mb-1">Comentario de Verificación / Hallazgos</label>
                            <textarea 
                              value={verifyComment}
                              onChange={e => setVerifyComment(e.target.value)}
                              className="w-full p-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              rows="3"
                              placeholder="Ingrese las observaciones sobre este registro..."
                            ></textarea>
                          </div>
                          <div className="flex gap-4">
                            <button
                              onClick={() => { setVerifyStatus('aprobado'); handleVerify(); }}
                              disabled={verifying}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                            >
                              {verifying && verifyStatus === 'aprobado' ? <Loader2 className="w-4 h-4 inline animate-spin" /> : 'Aprobar Registro'}
                            </button>
                            <button
                              onClick={() => { setVerifyStatus('rechazado'); handleVerify(); }}
                              disabled={verifying}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                            >
                              {verifying && verifyStatus === 'rechazado' ? <Loader2 className="w-4 h-4 inline animate-spin" /> : 'Rechazar / Observación'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show verification details if already verified */}
                  {selectedRecord.status !== 'pendiente_revision' && (
                    <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-6">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                        <ShieldCheck className="w-4 h-4 text-gray-500" /> Registro Verificado
                      </h4>
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div><span className="text-gray-500">Verificado por:</span> <span className="font-bold">{selectedRecord.verifier?.nombre} ({selectedRecord.verifier?.rol})</span></div>
                        <div><span className="text-gray-500">Fecha:</span> <span className="font-bold">{new Date(selectedRecord.verified_at).toLocaleDateString()}</span></div>
                      </div>
                      <div className="text-sm bg-white p-3 rounded-lg border border-gray-100">
                        <span className="text-gray-500 italic">"{selectedRecord.verification_comment}"</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  {auditLogs.length > 0 ? (
                    <div className="relative border-l border-gray-200 ml-3 space-y-8 pb-4">
                      {auditLogs.map((log, idx) => (
                        <div key={log.id} className="relative pl-6">
                          <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                            log.action_type === 'create' ? 'bg-green-500' :
                            log.action_type === 'verify' ? 'bg-blue-500' : 'bg-amber-500'
                          }`}></div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              {log.profiles?.nombre}
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                {log.action_type}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 mb-2">
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm text-gray-700">
                              {log.reason}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-500 text-sm">
                      <History className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                      No hay historial de auditoría para este registro.
                    </div>
                  )}
                </div>
              )}

            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
