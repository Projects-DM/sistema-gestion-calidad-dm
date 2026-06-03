import { useState, useEffect } from 'react';
import { dynamicService } from '../services/dynamicService';
import { useAuth } from '../hooks/useAuth';
import { runtimeActivationLayer } from '../runtime/integration/RuntimeActivationLayer';
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

export default function DynamicRecordsView({ moduleId }) {
  const { user, rol } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

        record.sgc_response_values?.forEach(val => {
          const field = val.sgc_form_fields;
          if (!field) return;

          if (field.field_type === 'boolean' && val.value_boolean === false) {
            status = status === 'critico' ? 'critico' : 'advertencia';
            criticalIssues.push(`${field.label} (No Cumple)`);
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

        return { ...record, computedStatus: status, criticalIssues };
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
  const [bulkComment, setBulkComment] = useState('');
  
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

  const handleBulkVerify = async (status) => {
    if (!bulkComment.trim() && status === 'rechazado') {
      alert('Debe incluir un comentario para rechazar registros.');
      return;
    }

    // Check if there are any critical records in the selection that require individual review
    const hasCritical = records.filter(r => selectedIds.includes(r.id)).some(r => r.computedStatus === 'critico');
    if (hasCritical && status === 'aprobado') {
      const confirm = window.confirm('Ha seleccionado registros CRÍTICOS para aprobar masivamente. Estos normalmente requieren revisión individual. ¿Desea continuar?');
      if (!confirm) return;
    }

    try {
      setVerifying(true);
      await dynamicService.verifyMultipleFormResponses(selectedIds, user.id, status, bulkComment || 'Verificación masiva rápida');
      
      // Update local state to reflect changes immediately
      const updatedRecords = records.map(r => {
        if (selectedIds.includes(r.id)) {
          return {
            ...r,
            status,
            verification_comment: bulkComment || 'Verificación masiva rápida',
            verified_at: new Date().toISOString(),
            verifier: { nombre: user.user_metadata?.nombre || 'Tú' }
          };
        }
        return r;
      });
      
      setRecords(updatedRecords);
      setSelectedIds([]);
      setBulkComment('');
      alert('Registros actualizados exitosamente.');
    } catch (e) {
      alert('Error en verificación masiva: ' + e.message);
    } finally {
      setVerifying(false);
    }
  };

  // Filtering Logic
  const filteredRecords = records.filter(rec => {
    if (filter === 'todos') return true;
    if (filter === 'pendientes') return rec.status === 'pendiente_revision';
    if (filter === 'aprobados') return rec.status === 'aprobado';
    if (filter === 'rechazados') return rec.status === 'rechazado';
    if (filter === 'criticos') return rec.computedStatus === 'critico';
    if (filter === 'hoy') {
      const today = new Date().setHours(0,0,0,0);
      const recDate = new Date(rec.created_at).setHours(0,0,0,0);
      return today === recDate;
    }
    return true;
  });

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
            placeholder="Buscar por formulario, usuario o hallazgo..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-sm transition-colors flex-1 sm:flex-none">
            <Filter className="w-4 h-4" /> Filtros Avanzados
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 font-bold text-sm transition-colors flex-1 sm:flex-none">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {isVerificador && selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-blue-800 font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>{selectedIds.length} registros seleccionados</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <input 
              type="text"
              value={bulkComment}
              onChange={e => setBulkComment(e.target.value)}
              placeholder="Comentario global (opcional)..."
              className="px-4 py-2 rounded-xl border border-blue-200 text-sm focus:ring-2 focus:ring-blue-500 flex-1 sm:w-64"
            />
            <div className="flex gap-2">
              <button 
                onClick={() => handleBulkVerify('aprobado')}
                disabled={verifying}
                className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex-1 sm:flex-none"
              >
                Aprobar
              </button>
              <button 
                onClick={() => handleBulkVerify('rechazado')}
                disabled={verifying}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex-1 sm:flex-none"
              >
                Rechazar
              </button>
            </div>
          </div>
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
                <th className="px-6 py-4">Evidencias</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((rec) => {
                const isOwnRecord = rec.created_by === user.id;
                const canVerifyRecord = isVerificador && !isOwnRecord;
                
                return (
                  <tr key={rec.id} className={`hover:bg-gray-50/80 transition-colors ${selectedIds.includes(rec.id) ? 'bg-blue-50/30' : ''}`}>
                    {isVerificador && (
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          className={`rounded border-gray-300 text-primary focus:ring-primary ${!canVerifyRecord && rec.status === 'pendiente_revision' ? 'opacity-30 cursor-not-allowed' : ''}`}
                          checked={selectedIds.includes(rec.id)}
                          disabled={!canVerifyRecord && rec.status === 'pendiente_revision'}
                          title={!canVerifyRecord && rec.status === 'pendiente_revision' ? "No puedes verificar tus propios registros" : ""}
                          onChange={() => toggleSelection(rec.id)}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4" onClick={() => !isVerificador && handleOpenModal(rec)}>
                      <div className="flex items-center gap-2 text-gray-900 font-medium">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(rec.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 ml-6">
                        {new Date(rec.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-bold text-gray-900">
                        <FileText className="w-4 h-4 text-primary" />
                        {rec.sgc_forms?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4 text-gray-400" />
                          {rec.profiles?.nombre || 'Usuario Desconocido'}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-6">
                          {rec.profiles?.rol || 'Rol Desconocido'}
                        </span>
                      </div>
                    </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={rec.computedStatus} />
                  </td>
                  <td className="px-6 py-4">
                    <ValidationBadge status={rec.status} />
                  </td>
                  <td className="px-6 py-4">
                    {rec.sgc_evidences?.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Paperclip className="w-3.5 h-3.5" /> {rec.sgc_evidences.length} Adjuntos
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Sin evidencias</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenModal(rec)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center justify-center"
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

                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                      Respuestas Registradas
                    </h4>
                    <div className="space-y-4">
                      {selectedRecord.sgc_response_values?.map((val, idx) => {
                        const field = val.sgc_form_fields;
                        let displayValue = val.value_text || val.value_number || '';
                        if (field.field_type === 'boolean') {
                          displayValue = val.value_boolean ? 'Sí / Cumple' : 'No / No Cumple';
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
                              <span className={`text-sm font-bold ${field.field_type === 'boolean' && !val.value_boolean ? 'text-red-600' : 'text-gray-900'}`}>
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
