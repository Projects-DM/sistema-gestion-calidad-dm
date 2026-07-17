
import { Activity } from 'lucide-react';

/**
 * Panel de Actividad Reciente del Dashboard.
 * Renderiza los últimos registros completados en el SGC.
 */
export function DashboardRecentActivity({ recent = [] }) {
  return (
    <div className="pt-4">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <div className="w-1.5 h-6 bg-accent rounded-full"></div>
        Actividad Reciente
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {recent.map((record) => (
          <div key={record.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:border-primary/30 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-gray-900 line-clamp-2 mb-2 h-10">
              {record.sgc_forms?.name || 'Formulario Desconocido'}
            </p>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                {record.sgc_forms?.engine_type?.replace('Base', '')}
              </span>
              <span className="text-xs font-medium text-gray-500">
                {new Date(record.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}

        {recent.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 text-sm shadow-sm">
            No hay actividad reciente registrada en el sistema.
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardRecentActivity;
