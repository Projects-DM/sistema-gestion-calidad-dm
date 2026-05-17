import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { dynamicService } from '../services/dynamicService';
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
  AlertCircle,
  Activity,
  FileCheck
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

export default function Dashboard() {
  const { profile, rol } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    stats: { todayResponses: 0, totalResponses: 0, incumplimientos: 0, alertasActivas: 0 },
    recent: []
  });

  useEffect(() => {
    async function loadDashboard() {
      const stats = await dynamicService.getDashboardStats();
      const recent = await dynamicService.getRecentResponses(5);
      setDashboardData({ stats, recent });
    }
    loadDashboard();
  }, []);
  
  const filteredModules = modules.filter(mod => 
    !mod.roles || mod.roles.includes(rol)
  );

  const stats = [
    { label: 'Registros Hoy', value: dashboardData.stats.todayResponses, icon: TrendingUp, trend: 'Actividad Diaria', color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Total Registros', value: dashboardData.stats.totalResponses, icon: FileCheck, trend: 'Histórico', color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Incumplimientos', value: dashboardData.stats.incumplimientos, icon: AlertTriangle, trend: 'Requiere revisión', color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Alertas Activas', value: dashboardData.stats.alertasActivas, icon: AlertCircle, trend: 'Crítico', color: 'text-red-600', bg: 'bg-red-100' },
  ];

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
              <p className={`text-xs font-medium mt-1 ${stat.trend === 'Crítico' ? 'text-red-600' : 'text-gray-500'}`}>
                {stat.trend}
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

      {/* Recent Activity Section */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-accent rounded-full"></div>
          Actividad Reciente
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {dashboardData.recent.map((record) => (
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

          {dashboardData.recent.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 text-sm shadow-sm">
              No hay actividad reciente registrada en el sistema.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
