import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Sparkles, 
  Droplets, 
  Wrench, 
  Route as RouteIcon, 
  AlertTriangle, 
  FileText,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const modules = [
  { id: 1, path: '/operaciones', name: 'Operaciones', icon: Sparkles, color: 'bg-blue-500', desc: 'BPM, Limpieza, Plagas', roles: ['administrador', 'calidad', 'operativo', 'consulta'] },
  { id: 2, path: '/trazabilidad', name: 'Trazabilidad', icon: RouteIcon, color: 'bg-accent', desc: 'Despachos, lotes y entregas', featured: true, roles: ['administrador', 'calidad', 'operativo', 'consulta', 'conductor'] },
  { id: 3, path: '/medicion-control', name: 'Medición y Control', icon: Droplets, color: 'bg-cyan-500', desc: 'Temperatura, pH, Peso', roles: ['administrador', 'calidad', 'operativo', 'consulta'] },
  { id: 4, path: '/mantenimiento', name: 'Mantenimiento', icon: Wrench, color: 'bg-orange-500', desc: 'Equipos y calibraciones', roles: ['administrador', 'calidad', 'operativo', 'consulta'] },
  { id: 5, path: '/calidad', name: 'Calidad', icon: AlertTriangle, color: 'bg-amber-600', desc: 'PQRS, Recall, Auditorías', roles: ['administrador', 'calidad', 'operativo', 'consulta'] },
  { id: 6, path: '/gestion-documental', name: 'Gestión Documental', icon: FileText, color: 'bg-indigo-500', desc: 'Programas y registros', roles: ['administrador', 'calidad', 'operativo', 'consulta'] },
  { id: 7, path: '/configuracion', name: 'Configuración', icon: Settings, color: 'bg-slate-700', desc: 'Usuarios y parámetros', roles: ['administrador'] },
];

const stats = [
  { label: 'Registros Hoy', value: '124', icon: TrendingUp, trend: '+12%', color: 'text-green-600', bg: 'bg-green-100' },
  { label: 'Despachos Pendientes', value: '8', icon: Clock, trend: '-2%', color: 'text-amber-600', bg: 'bg-amber-100' },
  { label: 'Auditorías Aprobadas', value: '100%', icon: CheckCircle, trend: '0%', color: 'text-blue-600', bg: 'bg-blue-100' },
  { label: 'Alertas Activas', value: '0', icon: AlertCircle, trend: 'Normal', color: 'text-secondary', bg: 'bg-red-100' },
];

export default function Dashboard() {
  const { profile, rol } = useAuth();
  
  const filteredModules = modules.filter(mod => 
    !mod.roles || mod.roles.includes(rol)
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Panel Principal</h1>
          <p className="text-gray-500 mt-1">SISTEMA DE GESTIÓN DE CALIDAD - DM Distribuciones</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm inline-flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm font-medium text-gray-700">Sistema Operativo</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] flex items-center justify-between group hover:border-primary/20 transition-colors">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className={`text-xs font-medium mt-1 ${stat.trend.startsWith('+') ? 'text-green-600' : stat.trend.startsWith('-') ? 'text-red-600' : 'text-gray-500'}`}>
                {stat.trend} respecto a ayer
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Modules Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-primary rounded-full"></div>
          Módulos del Sistema
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredModules.map((mod) => (
            <Link 
              to={mod.path} 
              key={mod.id}
              className={`group relative bg-white rounded-2xl p-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
                mod.featured ? 'border-accent/50 shadow-md ring-1 ring-accent/10' : 'border-gray-100 hover:border-primary/30'
              }`}
            >
              {mod.featured && (
                <div className="absolute top-0 right-0">
                  <div className="bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider shadow-sm">
                    Destacado
                  </div>
                </div>
              )}
              
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${mod.color}`}>
                <mod.icon className="w-6 h-6" />
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">{mod.name}</h3>
              <p className="text-sm text-gray-500">{mod.desc}</p>
              
              <div className="absolute bottom-4 right-4 opacity-0 transform translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-primary">
                  <RouteIcon className="w-4 h-4 rotate-45" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
