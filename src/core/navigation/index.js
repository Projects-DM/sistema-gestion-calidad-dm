/**
 * Core Navigation — Existing Route Binding (Sprint 188)
 *                  + Core Shell Navigation (Sprint 190)
 *
 * Facade for the certified Existing Navigation Resolution layer:
 *   - ExistingRouteRegistry      — SSOT mirror of the registered Router routes
 *   - ExistingModuleRouteResolver — canonicalRoute derived ONLY from existing routes
 *   - NavigationResolver         — legacy pure navigation decisions (unchanged)
 *
 * One-Shot Navigation Consumption (Sprint 190):
 *   - NavigationStateContract    — the certified navigation-state shape
 *   - NavigationStateConsumer    — consume location.state EXACTLY once
 *   - NavigationStateLifecycle   — clean the Router state after consumption
 *   - NavigationStateBoundary    — single mount guard (no loops, no re-inject)
 */

export { EXISTING_ROUTE_REGISTRY, ROUTER_BASENAME, getExistingRoute, listExistingRoutes } from './ExistingRouteRegistry.js';
export {
  ExistingModuleRouteResolver,
  resolveModuleRoute,
  resolveFormRoute,
  resolveActionRoute,
} from './ExistingModuleRouteResolver.js';
export { NavigationResolver } from './NavigationResolver.js';
export {
  NavigationStateContract,
  NAVIGATION_STATE_KEYS,
  isNavigationState,
  extractNavigationState,
  validateNavigationState,
} from './NavigationStateContract.js';
export { NavigationStateConsumer, createNavigationStateConsumer } from './NavigationStateConsumer.js';
export { NavigationStateLifecycle, createNavigationLifecycle } from './NavigationStateLifecycle.js';
export { NavigationStateBoundary, createNavigationBoundary } from './NavigationStateBoundary.js';
