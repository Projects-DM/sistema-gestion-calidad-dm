import { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { ModuleAdministrationApplicationService } from '../core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js';
import { ModuleCapabilityPersistenceAdapter } from '../core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js';
import { createApplicationRequest } from '../core/applicationLayer/common/contracts/ApplicationRequest.js';
import { createApplicationContext } from '../core/applicationLayer/common/contracts/ApplicationContext.js';
import { onModuleChange } from '../core/applicationLayer/moduleAdministration/ModuleChangeBus.js';
import {
  LayoutDashboard,
  Droplets,
  Wrench,
  Route as RouteIcon,
  AlertTriangle,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  User,
  Sparkles,
  Settings,
  FileText,
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
  Shield, Truck, Heart, GraduationCap, Building2, ShieldCheck,
};

const STATIC_MENU_ITEMS = [
  { path: 'dashboard', name: 'Panel Principal', icon: LayoutDashboard, roles: ['administrador', 'calidad', 'operativo', 'consulta', 'conductor'] },
  { path: 'configuracion', name: 'Configuración', icon: Settings, roles: ['administrador'] },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [runtimeModules, setRuntimeModules] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, user, rol } = useAuth();

  const appContext = useMemo(() => createApplicationContext({
    actorId: user?.id ?? null,
    source: 'ui-sidebar',
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
          console.warn('[Sidebar] GET_RUNTIME_MODULES returned failure:', result.error);
        }
      } catch (err) {
        console.error('[Sidebar] Failed to load runtime modules:', err?.message || err);
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
          console.warn('[Sidebar] Re-fetch after', type, 'returned failure:', result.error);
        }
      }).catch((err) => {
        console.error('[Sidebar] Re-fetch after', type, 'failed:', err?.message || err);
      });
    });
    return unsubscribe;
  }, [appContext]);

  const menuItems = useMemo(() => {
    const staticItems = STATIC_MENU_ITEMS.filter((item) => !item.roles || item.roles.includes(rol));
    const dynamicItems = runtimeModules.map((mod) => ({
      path: mod.slug,
      name: mod.name,
      icon: ICON_MAP[mod.icon] || FileText,
      color: mod.color,
      _runtime: true,
    }));
    const staticPaths = new Set(staticItems.map((i) => i.path));
    const filtered = dynamicItems.filter((item) => !staticPaths.has(item.path));
    return [...staticItems, ...filtered];
  }, [runtimeModules, rol]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const filteredMenuItems = menuItems;
  console.log('[TRACE][L10][Sidebar] filteredMenuItems:', { length: filteredMenuItems.length, items: filteredMenuItems.map(i => ({ path: i.path, name: i.name })) });

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-primary/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-primary text-white flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-20 shrink-0 flex items-center px-6 bg-primary-dark/50 border-b border-white/10">
          <ShieldCheck className="w-8 h-8 text-accent mr-3" />
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide">DM Distribuciones</h1>
            <p className="text-xs text-slate-400 font-medium tracking-widest">SISTEMA SGC</p>
          </div>
          <button
            className="lg:hidden ml-auto text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 custom-scrollbar px-4 space-y-1">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Módulos</p>
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname.endsWith('/' + item.path) ||
              location.pathname.startsWith('/' + item.path + '/') ||
              location.pathname === '/' + item.path;

            return (
              <NavLink
                key={item.path}
                to={`/${item.path}`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-3 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-5 h-5 mr-3 transition-colors ${
                    isActive ? 'text-accent' : 'text-slate-400 group-hover:text-accent'
                  }`}
                />
                <span className="text-sm">{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-white/50" />}
              </NavLink>
            );
          })}
        </div>

        <div className="shrink-0 p-4 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-4 flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary/20 border border-secondary/30 flex items-center justify-center mr-3 text-secondary-light overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.nombre || 'Cargando...'}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{profile?.rol || 'Usuario'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-20 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 z-30 sticky top-0 shadow-sm">
          <div className="flex items-center">
            <button
              className="lg:hidden mr-4 text-gray-500 hover:text-primary transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2 border border-gray-200 focus-within:border-primary/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10 transition-all w-80">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Buscar módulo, registro, lote..."
                className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-3 pr-6 border-r border-gray-200 hidden sm:flex">
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-900 uppercase">Centro de Operaciones</p>
                <p className="text-xs text-green-600 font-medium flex items-center justify-end gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Sistema en línea
                </p>
              </div>
            </div>

            <button className="relative p-2 text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-gray-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-secondary rounded-full border-2 border-white"></span>
            </button>

            <div className="hidden sm:block">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.nombre || 'User')}&background=1e293b&color=fff`}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-gray-200"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8 relative">
          {/* Global decorative background element */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/[0.02] rounded-full blur-3xl pointer-events-none"></div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

