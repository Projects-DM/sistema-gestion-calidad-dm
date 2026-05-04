import { Truck, History, FileBarChart, Search, ChevronRight, Route as RouteIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const submodules = [
  { 
    id: 1, 
    path: '/trazabilidad/despachos', 
    name: 'Despachos', 
    icon: Truck, 
    color: 'bg-accent text-white', 
    desc: 'Registro diario de vehículos, productos y conductores.',
    action: 'Registrar Despacho',
    roles: ['administrador', 'calidad', 'operativo', 'consulta', 'conductor']
  },
  { 
    id: 2, 
    path: '/trazabilidad/despachos', 
    name: 'Historial', 
    icon: History, 
    color: 'bg-white text-gray-700 border border-gray-200', 
    desc: 'Consulta cronológica de todos los despachos realizados.',
    action: 'Ver Historial',
    roles: ['administrador', 'calidad', 'operativo', 'consulta']
  },
  { 
    id: 3, 
    path: '/trazabilidad/despachos', 
    name: 'Reportes', 
    icon: FileBarChart, 
    color: 'bg-white text-gray-700 border border-gray-200', 
    desc: 'Análisis, estadísticas y exportación de datos en PDF/Excel.',
    action: 'Generar Reporte',
    roles: ['administrador', 'calidad', 'operativo']
  },
  { 
    id: 4, 
    path: '/trazabilidad/despachos', 
    name: 'Buscar Registros', 
    icon: Search, 
    color: 'bg-white text-gray-700 border border-gray-200', 
    desc: 'Búsqueda avanzada por lote, fecha, cliente o vehículo.',
    action: 'Buscar',
    roles: ['administrador', 'calidad', 'operativo', 'consulta']
  },
];

export default function Traceability() {
  const { rol } = useAuth();
  
  const filteredSubmodules = submodules.filter(sub => 
    !sub.roles || sub.roles.includes(rol)
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-primary rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium mb-4">
            <RouteIcon className="w-4 h-4 text-accent" />
            Módulo 10
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Programa de Trazabilidad</h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Gestione el rastreo de productos a lo largo de toda la cadena de distribución. Registre, controle y audite cada etapa del proceso de despacho.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-accent rounded-full"></div>
          Submódulos Disponibles
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredSubmodules.map((sub) => (
            <Link 
              to={sub.path} 
              key={sub.id}
              className={`group flex flex-col bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform duration-300 ${sub.color}`}>
                <sub.icon className="w-7 h-7" />
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{sub.name}</h3>
              <p className="text-sm text-gray-500 mb-6 flex-1">{sub.desc}</p>
              
              <div className="flex items-center text-sm font-bold text-primary group-hover:text-accent transition-colors mt-auto">
                {sub.action}
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
