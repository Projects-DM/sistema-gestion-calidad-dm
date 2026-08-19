
import SignaturePad from '../SignaturePad';

export default function BaseChecklist({ fields, values, onChange, comments, onCommentChange }) {
  const renderFieldInput = (field) => {
    if (field.field_type === 'informative') return null;

    if (field.field_type === 'boolean') {
      const isCompliance = field.options?.choices?.length > 0;
      if (isCompliance) {
        return (
          <div className="space-y-3 w-full">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  checked={values[field.id] === 'Cumple'}
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
                  checked={values[field.id] === 'No cumple'}
                  onChange={() => onChange(field.id, 'No cumple')}
                  className="w-5 h-5 text-red-500 focus:ring-red-500 border-gray-300"
                />
                <span className="text-sm font-medium text-red-700">No cumple</span>
              </label>
            </div>
            {values[field.id] === 'No cumple' && (
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
        );
      }
      return (
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio"
              name={field.id}
              checked={values[field.id] === true}
              onChange={() => onChange(field.id, true)}
              className="w-5 h-5 text-green-500 focus:ring-green-500 border-gray-300"
            />
            <span className="text-sm font-medium text-green-700">Cumple</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio"
              name={field.id}
              checked={values[field.id] === false}
              onChange={() => onChange(field.id, false)}
              className="w-5 h-5 text-red-500 focus:ring-red-500 border-gray-300"
            />
            <span className="text-sm font-medium text-red-700">No Cumple</span>
          </label>
        </div>
      );
    }
    
    if (field.field_type === 'signature') {
      return (
        <div className="w-full mt-3">
          <SignaturePad
            required={field.required}
            onChange={(url) => onChange(field.id, url)}
            label="Firme en el cuadro inferior"
          />
        </div>
      );
    }

    if (field.field_type === 'select') {
      return (
        <select
          required={field.required}
          value={values[field.id] || ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Seleccione una opción</option>
          {(field.options?.choices || []).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    // fallback for text fields like 'observaciones'
    return (
      <textarea 
        required={field.required}
        value={values[field.id] || ''}
        onChange={(e) => onChange(field.id, e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm min-h-[80px]"
        placeholder="Ingrese detalles..."
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 text-sm">
        <strong>Motor de Checklist Activado:</strong> Modo de verificación punto a punto.
      </div>
      
      <div className="space-y-4">
        {fields.map(field => (
          field.field_type === 'informative' ? (
            <div key={field.id} className="p-2 min-w-0">
              <div className="text-base font-bold text-gray-900 border-b-2 border-blue-300 pb-1 break-words overflow-hidden">
                {field.label}
              </div>
            </div>
          ) : (
            <div key={field.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border ${values[field.id] === false || values[field.id] === 'No cumple' ? 'border-red-300 bg-red-50/50' : 'border-gray-100'} gap-4 transition-colors`}>
              <label className="text-sm font-semibold text-gray-700 flex-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <div className={`w-full ${field.field_type === 'boolean' ? 'sm:w-auto flex sm:justify-end' : 'flex-1 max-w-md'}`}>
                {renderFieldInput(field)}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
