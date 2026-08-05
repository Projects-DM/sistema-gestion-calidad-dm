import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard } from "lucide-react";
import { useDashboardMetrics } from '../modules/dashboard/hooks/useDashboardMetrics';
import { DashboardMetricCard } from '../modules/dashboard/components/DashboardMetricCard';
import { DashboardRecentActivity } from '../modules/dashboard/components/DashboardRecentActivity';
import { CollapsiblePanel } from '../shared/components/CollapsiblePanel';
import { useAlertRuntime } from '../hooks/useAlertRuntime';
import { useDashboardSearch } from '../shared/components/DashboardSearchContext';
import { ModuleAdministrationApplicationService } from '../core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js';
import { ModuleCapabilityPersistenceAdapter } from '../core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js';
import { createApplicationRequest } from '../core/applicationLayer/common/contracts/ApplicationRequest.js';
import { createApplicationContext } from '../core/applicationLayer/common/contracts/ApplicationContext.js';
import { onModuleChange } from '../core/applicationLayer/moduleAdministration/ModuleChangeBus.js';
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

// Sprint 219 — Helpers de matching local (case-insensitive, accent-insensitive,
// partial) y generador de ids de destino para navegacion (scroll/highlight).
const normalizeToken = (s = '') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const idSlug = (p = '') => `dashboard-search-target-${p.replace(/[^a-zA-Z0-9]+/g, '-')}`;

export default function Dashboard() {
  const { rol, user } = useAuth();
  const { metrics, recentActivity, loading, error } = useDashboardMetrics();
  const [runtimeModules, setRuntimeModules] = useState([]);

  // Sprint 216 — El Dashboard recibe la intencion de busqueda VIA CONTEXTO
  // (nunca del input directamente) y conserva la propiedad del indice. El
  // filtrado/resultados se implementa en Sprint 217; aqui solo se establece
  // el canal de comunicacion (transporte).
  const { query: searchQuery } = useDashboardSearch();

  // Sprint 219 — Expansión controlada de los dominios (navegación por búsqueda)
  // y resaltado temporal del resultado (≈2s).
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [highlightId, setHighlightId] = useState(null);

  // Sprint 220 — Modelo de resultados: matches[] + selectedIndex + currentMatch.
  // Multiples coincidencias sobre el MISMO indice local certificado (Sprint 219).
  const [matches, setMatches] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sprint 184 — Operational UI Consumption.
  // Dashboard consumes ONLY AlertDashboardDataProvider metrics. It never
  // administers, configures or navigates alert data.
  const { dashboard: alertDashboard } = useAlertRuntime({
    module: null,
    moduleId: null,
  });
  const alertMetrics = alertDashboard?.metrics ?? null;

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
        } else if (!cancelled) {
          console.warn('[Dashboard] GET_RUNTIME_MODULES returned failure:', result.error);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to load runtime modules:', err?.message || err);
      }
    }
    loadRuntimeModules();
    return () => { cancelled = true; };
  }, [appContext]);

  useEffect(() => {
    const unsubscribe = onModuleChange(({ type }) => {
      appService.execute(
        createApplicationRequest({ operation: 'GET_RUNTIME_MODULES' }),
        appContext
      ).then((result) => {
        if (result.success !== false) {
          setRuntimeModules(result.data || []);
        } else {
          console.warn('[Dashboard] Re-fetch after', type, 'returned failure:', result.error);
        }
      }).catch((err) => {
        console.error('[Dashboard] Re-fetch after', type, 'failed:', err?.message || err);
      });
    });
    return unsubscribe;
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
  console.log('[TRACE][L10][Dashboard] filteredModules:', { length: filteredModules.length, modules: filteredModules.map(m => ({ path: m.path, name: m.name })) });

  // Sprint 219 — Indice de busqueda local (efimero, no persistido), construido
  // UNICAMENTE desde memoria: runtimeModules + metrics + alertMetrics. El Dashboard
  // sigue siendo consumidor: sin consultas a Runtime/Supabase y sin servicios.
  const searchIndex = useMemo(() => {
    const entries = [];
    allModules.forEach((m) =>
      entries.push({ id: idSlug(m.path), type: 'module', title: m.name, keywords: m.name, section: 'modules' })
    );
    entries.push({ id: idSlug('records-panel'), type: 'domain', title: 'Registros Operacionales', keywords: 'Registros Operacionales', section: 'records' });
    entries.push({ id: idSlug('records-panel'), type: 'kpi', title: 'Registros Hoy', keywords: 'Registros Actividad', section: 'records' });
    entries.push({ id: idSlug('records-panel'), type: 'kpi', title: 'Total Registros', keywords: 'Registros Historico', section: 'records' });
    entries.push({ id: idSlug('records-panel'), type: 'kpi', title: 'Incumplimientos', keywords: 'Rechazados Desvios', section: 'records' });
    if (alertMetrics) {
      entries.push({ id: idSlug('alerts-panel'), type: 'domain', title: 'Alertas Operacionales', keywords: 'Alertas Operacionales', section: 'alerts' });
      entries.push({ id: idSlug('alerts-panel'), type: 'kpi', title: 'Alertas Activas', keywords: 'Alertas', section: 'alerts' });
      entries.push({ id: idSlug('alerts-panel'), type: 'kpi', title: 'Alertas Críticas', keywords: 'Criticas Prioridad', section: 'alerts' });
      entries.push({ id: idSlug('alerts-panel'), type: 'kpi', title: 'Documentos por Vencer', keywords: 'Documentos Repositorio', section: 'alerts' });
      entries.push({ id: idSlug('alerts-panel'), type: 'kpi', title: 'Acciones Pendientes', keywords: 'Acciones Registros', section: 'alerts' });
    }
    entries.push({ id: idSlug('activity'), type: 'domain', title: 'Actividad Reciente', keywords: 'Actividad Reciente', section: 'activity' });
    return entries.map((e) => ({ ...e, hay: normalizeToken(`${e.title} ${e.keywords}`) }));
  }, [allModules, alertMetrics]);

  // Sprint 219 — Matching local: recolecta TODAS las coincidencias; Sprint 220
  // las navega. Sin persistencia y sin queries.
  useEffect(() => {
    const q = normalizeToken(searchQuery).trim();
    const list = q ? searchIndex.filter((e) => e.hay.includes(q)) : [];
    setMatches(list);
    setSelectedIndex(0);
  }, [searchQuery, searchIndex]);

  // Sprint 220 — Navegación automática al resultado actual (currentMatch):
  // expand panel → scroll → highlight (≈2s).
  const currentMatch = matches[selectedIndex] ?? null;
  useEffect(() => {
    if (!currentMatch) return;
    if (currentMatch.section === 'records') setRecordsOpen(true);
    else if (currentMatch.section === 'alerts') setAlertsOpen(true);
    setHighlightId(currentMatch.id);
    const scrollTimer = window.setTimeout(() => {
      document.getElementById(currentMatch.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    const clearTimer = window.setTimeout(() => setHighlightId(null), 2000);
    return () => { window.clearTimeout(scrollTimer); window.clearTimeout(clearTimer); };
  }, [selectedIndex, matches]);

  const goPrev = () => setSelectedIndex((i) => (i - 1 + matches.length) % matches.length);
  const goNext = () => setSelectedIndex((i) => (i + 1) % matches.length);

  const hl = (id) =>
    highlightId === id ? 'ring-2 ring-primary/60 bg-primary/5 shadow-md rounded-2xl' : '';

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10" data-search-query={searchQuery}>
      
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

      {/* Sprint 220 — Resultados de búsqueda: contador (n/N) + navegación
          anterior/siguiente. Solo presentación; navega los matches locales. */}
      {matches.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-2.5">
          <button
            type="button"
            onClick={goPrev}
            disabled={matches.length <= 1}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary disabled:opacity-40 hover:underline"
          >
            <span aria-hidden="true">◀</span> Anterior
          </button>
          <span className="text-sm font-semibold text-gray-700" data-testid="search-result-count">
            {matches.length} {matches.length === 1 ? 'resultado encontrado' : 'resultados encontrados'} · {selectedIndex + 1} / {matches.length}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={matches.length <= 1}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary disabled:opacity-40 hover:underline"
          >
            Siguiente <span aria-hidden="true">▶</span>
          </button>
        </div>
      )}

      {/* Sprint 213 — Registros Operacionales (dominio colapsable; reutiliza las
          mismas metricas de useDashboardMetrics. Solo presentacion, sin recalc.) */}
      {/* Sprint 214 — Collapsed by Default (Dashboard Overview First):
          paneles iniciados cerrados; el usuario expande por demanda. */}
      {/* Sprint 219 — Dominio controlado (recordsOpen/onExpandedChange) para que
          la busqueda local expanda automaticamente el panel al encontrar match. */}
      <div id={idSlug('records-panel')} className={hl(idSlug('records-panel'))}>
        <CollapsiblePanel title="Registros Operacionales" icon={FileCheck} accent="bg-blue-500" defaultOpen={false} expanded={recordsOpen} onExpandedChange={setRecordsOpen}>
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
        </CollapsiblePanel>
      </div>

      {/* Sprint 213 — Alertas Operacionales (reutiliza DashboardMetricCard y el
          facade certificado useAlertRuntime.dashboard.metrics; solo presentacion.) */}
      {/* Sprint 219 — Dominio controlado (alertsOpen/onExpandedChange) para la
          expansion automatica por busqueda local. */}
      {alertMetrics && (
        <div id={idSlug('alerts-panel')} className={hl(idSlug('alerts-panel'))}>
          <CollapsiblePanel title="Alertas Operacionales" icon={AlertTriangle} accent="bg-red-500" defaultOpen={false} expanded={alertsOpen} onExpandedChange={setAlertsOpen}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <DashboardMetricCard
              label="Alertas Activas"
              value={alertMetrics.activeAlerts}
              icon={AlertCircle}
              trend="Runtime"
              color="text-red-600"
              bg="bg-red-100"
            />
            <DashboardMetricCard
              label="Alertas Críticas"
              value={alertMetrics.criticalAlerts}
              icon={AlertTriangle}
              trend="Prioridad Alta/Crítica"
              color="text-red-600"
              bg="bg-red-100"
            />
            <DashboardMetricCard
              label="Documentos por Vencer"
              value={alertMetrics.expiringDocuments}
              icon={FileText}
              trend="Repositorio Documental"
              color="text-amber-600"
              bg="bg-amber-100"
            />
            <DashboardMetricCard
              label="Acciones Pendientes"
              value={alertMetrics.pendingActions}
              icon={ListChecks}
              trend="Registros"
              color="text-blue-600"
              bg="bg-blue-100"
            />
          </div>
          </CollapsiblePanel>
        </div>
      )}

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
              id={idSlug(mod.path)}
              key={mod.id || mod.path}
              className={`group relative bg-white rounded-2xl p-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${hl(idSlug(mod.path))} ${
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
      <div id={idSlug('activity')} className={hl(idSlug('activity'))}>
        <DashboardRecentActivity recent={recentActivity} />
      </div>
      
    </div>
  );
}
