import React from 'react';

export default function BaseMediciones({ fields, values, onChange }) {
  return (
    <div className="space-y-6">
      <div className="bg-cyan-50 text-cyan-800 p-4 rounded-xl border border-cyan-100 text-sm">
        <strong>Motor de Mediciones Activado:</strong> Registro de parámetros cuantitativos con soporte para rangos de tolerancia.
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map(field => (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <input 
                type="number"
                step="0.01"
                required={field.required}
                value={values[field.id] || ''}
                onChange={(e) => onChange(field.id, parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
              />
              {field.options?.unit && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  {field.options.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
