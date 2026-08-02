/**
 * ExistingRouteRegistry
 *
 * Sprint 188 — Route Resolution & Existing Navigation Binding Certification.
 *
 * SINGLE SOURCE OF TRUTH of the routes ALREADY registered in the certified
 * Router (src/App.jsx). Nothing here invents routes — it mirrors, verbatim,
 * the exact route patterns the application actually registers:
 *
 *   <Router basename="/sistema-gestion-calidad-dm">
 *     <Route path="login" element={<Login />} />
 *     <Route path="/" element={<ProtectedRoute><DashboardLayout/></ProtectedRoute>}>
 *       <Route index element={<Navigate to="/dashboard" replace />} />
 *       <Route path="dashboard" element={<Dashboard />} />
 *       <Route path="configuracion" element={...} />
 *       <Route path="usuarios" element={...} />
 *       <Route path="runtime-playground" element={<RuntimePlaygroundSandbox />} />
 *       <Route path=":moduleSlug" element={<DynamicModule />} />        ← CANONICAL MODULE ROUTE
 *       <Route path=":moduleId" element={<DynamicModuleById />} />
 *       <Route path="modulo/:moduleSlug/:formSlug" element={<DynamicForm />} />  ← FORM ROUTE
 *
 * The canonical module route is `:moduleSlug` → path `/${moduleSlug}`
 * (NOT `/modulo/:slug`). The `modulo/:moduleSlug/:formSlug` route exists
 * ONLY for DynamicForm (it requires TWO path segments after the module).
 *
 * build() functions reproduce EXACTLY how the existing Router interprets
 * the registered pattern — they are derived from the registry, never
 * hardcoded inside navigation callers.
 */

export const ROUTER_BASENAME = '/sistema-gestion-calidad-dm';

export const EXISTING_ROUTE_REGISTRY = Object.freeze({
  login: Object.freeze({
    name: 'login',
    pattern: 'login',
    target: 'Login',
    build: () => '/login',
  }),
  dashboard: Object.freeze({
    name: 'dashboard',
    pattern: 'dashboard',
    target: 'Dashboard',
    build: () => '/dashboard',
  }),
  configuracion: Object.freeze({
    name: 'configuracion',
    pattern: 'configuracion',
    target: 'Configuration',
    build: () => '/configuracion',
  }),
  usuarios: Object.freeze({
    name: 'usuarios',
    pattern: 'usuarios',
    target: 'Users',
    build: () => '/usuarios',
  }),
  runtimePlayground: Object.freeze({
    name: 'runtime-playground',
    pattern: 'runtime-playground',
    target: 'RuntimePlaygroundSandbox',
    build: () => '/runtime-playground',
  }),
  module: Object.freeze({
    name: 'module',
    pattern: ':moduleSlug',
    target: 'DynamicModule',
    build: (moduleSlug) => `/${moduleSlug}`,
  }),
  moduleById: Object.freeze({
    name: 'module-by-id',
    pattern: ':moduleId',
    target: 'DynamicModuleById',
    build: (moduleId) => `/${moduleId}`,
  }),
  form: Object.freeze({
    name: 'form',
    pattern: 'modulo/:moduleSlug/:formSlug',
    target: 'DynamicForm',
    build: (moduleSlug, formSlug) => `/modulo/${moduleSlug}/${formSlug}`,
  }),
});

export function getExistingRoute(routeName) {
  return EXISTING_ROUTE_REGISTRY[routeName] ?? null;
}

export function listExistingRoutes() {
  return Object.values(EXISTING_ROUTE_REGISTRY).map((route) => ({
    name: route.name,
    pattern: route.pattern,
    target: route.target,
  }));
}

export default EXISTING_ROUTE_REGISTRY;
