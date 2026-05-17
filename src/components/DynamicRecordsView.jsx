import { useState, useEffect } from 'react';
import { dynamicService } from '../services/dynamicService';
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
  X
} from 'lucide-react';

export default function DynamicRecordsView({ moduleId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal for details
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    if (moduleId) {
      loadRecords();
    }
  }, [moduleId]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await dynamicService.getModuleResponses(moduleId);
      
      // Process data to calculate status based on values
      const processed = data.map(record => {
        let status = 'cumple'; // cumple, advertencia, critico
        let criticalIssues = [];

        record.sgc_response_values?.forEach(val => {
          const field = val.sgc_form_fields;
          if (!field) return;

          // Boolean logic (Cumple/No Cumple)
          if (field.field_type === 'boolean' && val.value_boolean === false) {
            status = status === 'critico' ? 'critico' : 'advertencia';
            criticalIssues.push(`${field.label} (No Cumple)`);
          }

          // Number logic (Min/Max bounds)
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

  const StatusBadge = ({ status }) => {
    switch (status) {
      case 'cumple':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200"><CheckCircle className="w-3.5 h-3.5" /> Cumple</span>;
      case 'advertencia':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200"><AlertTriangle className="w-3.5 h-3.5" /> Alerta</span>;
      case 'critico':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3.5 h-3.5" /> Crítico</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center py-12 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p>Cargando historial de registros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
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
            <Filter className="w-4 h-4" /> Filtros
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 font-bold text-sm transition-colors flex-1 sm:flex-none">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Fecha y Hora</th>
                <th className="px-6 py-4">Formulario</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Evidencias</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4">
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
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4 text-gray-400" />
                      {rec.profiles?.nombre || 'Usuario Desconocido'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={rec.computedStatus} />
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
                      onClick={() => setSelectedRecord(rec)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center justify-center"
                      title="Ver Detalles"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
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
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Detalle del Registro
                </h3>
                <p className="text-sm text-gray-500 mt-1">{selectedRecord.sgc_forms?.name}</p>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
              
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
                  <p className="text-xs text-gray-500 font-medium mb-1">Estado</p>
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
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-gray-50 gap-2">
                        <span className="text-sm font-medium text-gray-700">{field.label}</span>
                        <span className={`text-sm font-bold ${field.field_type === 'boolean' && !val.value_boolean ? 'text-red-600' : 'text-gray-900'}`}>
                          {displayValue}
                        </span>
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

            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
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
