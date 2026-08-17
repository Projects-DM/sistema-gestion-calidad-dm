
import SignaturePad from '../SignaturePad';

export default function BaseGeneric({ fields, values, onChange, comments, onCommentChange }) {
  const renderField = (field) => {
    switch(field.field_type) {
      case 'text':
        return (
          <input 
            type="text"
            required={field.required}
            value={values[field.id] || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        );
      case 'number':
        return (
          <input 
            type="number"
            required={field.required}
            value={values[field.id] || ''}
            onChange={(e) => onChange(field.id, parseFloat(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        );
      case 'boolean':
        const isCompliance = field.options?.choices?.length > 0;
        if (isCompliance) {
          return (
            <div className="space-y-3">
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
                    className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300"
                  />
                  <span className="text-sm font-medium text-green-700">Cumple</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.id}
                    checked={values[field.id] === 'No cumple'}
                    onChange={() => onChange(field.id, 'No cumple')}
                    className="w-5 h-5 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span className="text-sm font-medium text-red-700">No cumple</span>
                </label>
              </div>
              {values[field.id] === 'No cumple' && (
                <div className="pl-1">
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox"
              checked={values[field.id] || false}
              onChange={(e) => onChange(field.id, e.target.checked)}
              className="w-5 h-5 text-primary rounded focus:ring-primary border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Sí / No</span>
          </label>
        );
      case 'select':
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
      case 'textarea':
        return (
          <textarea 
            required={field.required}
            value={values[field.id] || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary min-h-[100px]"
          />
        );
      case 'signature':
        return (
          <SignaturePad
            required={field.required}
            onChange={(url) => onChange(field.id, url)}
            label="Firme en el cuadro inferior"
          />
        );
      case 'informative':
        return null;
      default:
        return (
          <input 
            type="text"
            required={field.required}
            value={values[field.id] || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {fields.map(field => (
        field.field_type === 'informative' ? (
          <div key={field.id} className="md:col-span-2 pt-2">
            <div className="text-base font-bold text-gray-900 border-b-2 border-primary/30 pb-1">
              {field.label}
            </div>
          </div>
        ) : (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            {renderField(field)}
          </div>
        )
      ))}
    </div>
  );
}
