import React from 'react';

export default function BaseChecklist({ fields, values, onChange }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 text-sm">
        <strong>Motor de Checklist Activado:</strong> Modo de verificación punto a punto con opciones de Cumple / No Cumple.
      </div>
      
      <div className="space-y-4">
        {fields.map(field => (
          <div key={field.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <label className="text-sm font-semibold text-gray-700 flex-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio"
                  name={field.id}
                  checked={values[field.id] === true}
                  onChange={() => onChange(field.id, true)}
                  className="w-5 h-5 text-green-500 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-green-700">Cumple</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio"
                  name={field.id}
                  checked={values[field.id] === false}
                  onChange={() => onChange(field.id, false)}
                  className="w-5 h-5 text-red-500 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-red-700">No Cumple</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
