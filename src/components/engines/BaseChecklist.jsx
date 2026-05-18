import React from 'react';
import SignaturePad from '../SignaturePad';

export default function BaseChecklist({ fields, values, onChange }) {
  const renderFieldInput = (field) => {
    if (field.field_type === 'boolean') {
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
          <div key={field.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border ${values[field.id] === false ? 'border-red-300 bg-red-50/50' : 'border-gray-100'} gap-4 transition-colors`}>
            <label className="text-sm font-semibold text-gray-700 flex-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className={`w-full ${field.field_type === 'boolean' ? 'sm:w-auto flex sm:justify-end' : 'flex-1 max-w-md'}`}>
              {renderFieldInput(field)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
