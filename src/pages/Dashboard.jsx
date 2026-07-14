import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard } from "lucide-react";
import { useDashboardMetrics } from '../modules/dashboard/hooks/useDashboardMetrics';
import { DashboardMetricCard } from '../modules/dashboard/components/DashboardMetricCard';
import { DashboardRecentActivity } from '../modules/dashboard/components/DashboardRecentActivity';
import { ModuleAdministrationApplicationService } from '../core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js';
import { ModuleCapabilityPersistenceAdapter } from '../core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js';
import { createApplicationRequest } from '../core/applicationLayer/common/contracts/ApplicationRequest.js';
import { createApplicationContext } from '../core/applicationLayer/common/contracts/ApplicationContext.js';
import { 
  Sparkles, 
  Droplets, 
  Wrench, 
  Route as RouteIcon, 
  AlertTriangle, 
  FileText,
  Settings,
  TrendingUp,
  FileCheck,
  AlertCircle,
  Loader2,
  ListChecks,
  History,
  BarChart3,
  Users,
  Package,
  Shield,
  Truck,
  Heart,
  GraduationCap,
  Building2
} from 'lucide-react';

const persistenceProvider = new ModuleCapabilityPersistenceAdapter();
const appService = new ModuleAdministrationApplicationService({ persistenceProvider });

const ICON_MAP = {
  LayoutDashboard, Droplets, Wrench, RouteIcon, AlertTriangle, FileText,
  Settings, Sparkles, ListChecks, History, BarChart3, Users, Package,
  Shield, Truck, Heart, GraduationCap, Building2,
};

const STATIC_MODULE_CARDS = [
  { path: '/configuracion', name: 'Configuración', icon: Settings, color: '#374151', desc: 'Usuarios y parámetros', roles: ['administrador'] },
];

export default function Dashboard() {
  const { rol, user } = useAuth();
  const { metrics, recentActivity, loading, error } = useDashboardMetrics();
  const [runtimeModules, setRuntimeModules] = useState([]);

  const appContext = useMemo(() => createApplicationContext({
    actorId: user?.id ?? null,
    source: 'ui-dashboard',
    actorRole: rol === 'administrador' ? 'admin' : rol,
  }), [user?.id, rol]);

  useEffect(() => {
    let cancelled = false;
    async function loadRuntimeModules() {
      try {
        const result = await appService.execute(
          createApplicationRequest({ operation: 'GET_RUNTIME_MODULES' }),
          appContext
        );
        if (!cancelled && result.success !== false) {
          setRuntimeModules(result.data || []);
        }
      } catch {
        // silent
      }
    }
    loadRuntimeModules();
    return () => { cancelled = true; };
  }, [appContext]);

  const allModules = useMemo(() => {
    const staticCards = STATIC_MODULE_CARDS.filter((m) => !m.roles || m.roles.includes(rol));
    const dynamicCards = runtimeModules.map((mod) => ({
      id: mod.id,
      path: `/${mod.slug}`,
      name: mod.name,
      icon: ICON_MAP[mod.icon] || FileText,
      color: mod.color || 'bg-blue-500',
      desc: mod.description || mod.name,
    }));
    const staticPaths = new Set(staticCards.map((m) => m.path));
    return [...dynamicCards.filter((m) => !staticPaths.has(m.path)), ...staticCards];
  }, [runtimeModules, rol]);

  const filteredModules = allModules;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-gray-500">Cargando panel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Error al cargar los datos del panel. Por favor intente de nuevo.
      </div>
    );
  }

  const kpis = [
    { label: 'Registros Hoy', value: metrics.todayRecords, icon: TrendingUp, trend: 'Actividad Diaria', color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Total Registros', value: metrics.totalRecords, icon: FileCheck, trend: 'Histórico', color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Incumplimientos', value: metrics.rejected, icon: AlertTriangle, trend: 'Desvíos Rechazados', color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Alertas Activas', value: metrics.critical, icon: AlertCircle, trend: 'Crítico', color: 'text-red-600', bg: 'bg-red-100' },
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

      {/* KPI Cards — Grid responsivo de 2 columnas compactas en móvil y 4 en desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi, idx) => (
          <DashboardMetricCard 
            key={idx}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            trend={kpi.trend}
            color={kpi.color}
            bg={kpi.bg}
          />
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
              key={mod.id || mod.path}
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
              
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ backgroundColor: mod.color || '#3B82F6' }}
              >
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
      <DashboardRecentActivity recent={recentActivity} />
      
    </div>
  );
}
