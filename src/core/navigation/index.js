/**
 * Core Navigation — Existing Route Binding (Sprint 188)
 *
 * Facade for the certified Existing Navigation Resolution layer:
 *   - ExistingRouteRegistry      — SSOT mirror of the registered Router routes
 *   - ExistingModuleRouteResolver — canonicalRoute derived ONLY from existing routes
 *   - NavigationResolver         — legacy pure navigation decisions (unchanged)
 */

export { EXISTING_ROUTE_REGISTRY, ROUTER_BASENAME, getExistingRoute, listExistingRoutes } from './ExistingRouteRegistry.js';
export {
  ExistingModuleRouteResolver,
  resolveModuleRoute,
  resolveFormRoute,
  resolveActionRoute,
} from './ExistingModuleRouteResolver.js';
export { NavigationResolver } from './NavigationResolver.js';
