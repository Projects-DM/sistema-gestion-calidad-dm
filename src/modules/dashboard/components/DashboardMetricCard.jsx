import React from 'react';

/**
 * Tarjeta de KPI/Métrica para el Dashboard.
 * Optimizada para dispositivos móviles con diseño altamente responsivo y compacto.
 */
export function DashboardMetricCard({ label, value, icon: Icon, trend, color, bg }) {
  return (
    <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] flex items-center justify-between group hover:border-primary/20 transition-colors w-full min-w-0">
      <div className="min-w-0 flex-1 pr-2">
        <p className="text-xs sm:text-sm font-medium text-gray-500 mb-0.5 truncate">{label}</p>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{value}</h3>
        <p className={`text-[10px] sm:text-xs font-medium mt-0.5 truncate ${trend === 'Crítico' ? 'text-red-600' : 'text-gray-500'}`}>
          {trend}
        </p>
      </div>
      <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${bg} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color}`} />
      </div>
    </div>
  );
}

export default DashboardMetricCard;
