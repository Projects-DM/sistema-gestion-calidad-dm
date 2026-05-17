import React from 'react';

export default function BaseGeneric({ fields, values, onChange }) {
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
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox"
              checked={values[field.id] || false}
              onChange={(e) => onChange(field.id, e.target.checked)}
              className="w-5 h-5 text-primary rounded focus:ring-primary border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Cumple / Sí</span>
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
        <div key={field.id} className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          {renderField(field)}
        </div>
      ))}
    </div>
  );
}
