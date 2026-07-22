
import { AlertTriangle, Info } from 'lucide-react';
import SignaturePad from '../SignaturePad';

export default function BaseMediciones({ fields, values, onChange, comments, onCommentChange }) {
  
  const getValidationState = (field, val) => {
    if (val === '' || val === null || isNaN(val)) return null;
    
    const min = field.options?.min;
    const max = field.options?.max;
    
    if (min !== undefined && val < min) return 'critical';
    if (max !== undefined && val > max) return 'critical';
    return 'ok';
  };

  return (
    <div className="space-y-6">
      <div className="bg-cyan-50 text-cyan-800 p-4 rounded-xl border border-cyan-100 text-sm flex gap-3">
        <Info className="w-5 h-5 shrink-0" />
        <div>
          <strong>Motor de Mediciones Activado:</strong> Registro de parámetros cuantitativos con soporte para rangos de tolerancia. 
          Los valores fuera de rango generarán una alerta crítica automática.
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map(field => {
          const val = values[field.id];
          
          // Special case for signature
          if (field.field_type === 'signature') {
            return (
              <div key={field.id} className="space-y-2 md:col-span-2 mt-4">
                <SignaturePad
                  required={field.required}
                  onChange={(url) => onChange(field.id, url)}
                  label={field.label}
                />
              </div>
            );
          }

          // Special case for text/textarea
          if (field.field_type === 'text' || field.field_type === 'textarea') {
            return (
              <div key={field.id} className="space-y-2 md:col-span-2">
                <label className="block text-sm font-bold text-gray-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <textarea 
                  required={field.required}
                  value={val !== undefined ? val : ''}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 min-h-[80px]"
                />
              </div>
            );
          }

          // Special case for boolean with compliance workflow
          if (field.field_type === 'boolean' && field.options?.choices?.length > 0) {
            return (
              <div key={field.id} className="space-y-2 md:col-span-2">
                <label className="block text-sm font-bold text-gray-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={field.id}
                        checked={val === 'Cumple'}
                        onChange={() => {
                          onChange(field.id, 'Cumple');
                          if (onCommentChange) onCommentChange(field.id, '');
                        }}
                        className="w-5 h-5 text-green-500 focus:ring-green-500 border-gray-300"
                      />
                      <span className="text-sm font-medium text-green-700">Cumple</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={field.id}
                        checked={val === 'No cumple'}
                        onChange={() => onChange(field.id, 'No cumple')}
                        className="w-5 h-5 text-red-500 focus:ring-red-500 border-gray-300"
                      />
                      <span className="text-sm font-medium text-red-700">No cumple</span>
                    </label>
                  </div>
                  {val === 'No cumple' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        {field.options?.commentPrompt || 'Explique la no conformidad'}
                      </label>
                      <textarea
                        required
                        value={comments?.[field.id] || ''}
                        onChange={(e) => onCommentChange?.(field.id, e.target.value)}
                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm min-h-[60px]"
                        placeholder="Describa el incumplimiento..."
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          }

          const state = getValidationState(field, val);
          
          let borderColor = 'border-gray-300 focus:ring-cyan-500 focus:border-cyan-500';
          let bgColor = 'bg-white';
          
          if (state === 'critical') {
            borderColor = 'border-red-500 focus:ring-red-500 focus:border-red-500';
            bgColor = 'bg-red-50';
          } else if (state === 'ok') {
            borderColor = 'border-green-500 focus:ring-green-500 focus:border-green-500';
          }

          return (
            <div key={field.id} className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input 
                  type="number"
                  step="0.01"
                  required={field.required}
                  value={val !== undefined ? val : ''}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    onChange(field.id, newVal);
                  }}
                  className={`w-full px-4 py-2 border rounded-lg font-mono transition-colors ${borderColor} ${bgColor}`}
                />
                {field.options?.unit && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    {field.options.unit}
                  </span>
                )}
              </div>
              
              {/* Alert message */}
              {state === 'critical' && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 mt-1">
                  <AlertTriangle className="w-4 h-4" />
                  Valor crítico. Fuera de rango permitido ({field.options?.min} - {field.options?.max}).
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
