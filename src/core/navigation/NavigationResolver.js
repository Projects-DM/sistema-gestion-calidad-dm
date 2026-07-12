/**
 * NavigationResolver
 *
 * Adaptador PÚRÓ para centralizar decisiones de navegación duplicadas.
 * - No importa Runtime
 * - No importa Auth
 * - No importa Metadata
 * - No conoce módulos
 * - No ejecuta navegación (solo resuelve decisiones)
 */

/**
 * @param {Array<string>|undefined|null} requiredRoles
 * @param {string|undefined|null} userRole
 * @returns {boolean}
 */
function canAccessRole(requiredRoles, userRole) {
  if (!requiredRoles) return true;
  if (requiredRoles.length === 0) return true;
  return requiredRoles.includes(userRole);
}

/**
 * resolveDefaultTab
 * Replica la lógica existente: la pestaña inicial por módulo es "forms".
 *
 * @returns {'forms'|'records'|'repositorio'}
 */
function resolveDefaultTab() {
  return 'forms';
}

/**
 * resolveFallbackTab
 * Replica exactamente el fallback existente en DynamicModule:
 * - si el repositorio NO está disponible y el activeTab es "repositorio" => "forms"
 * - en cualquier otro caso => mantener el tab
 *
 * @param {'forms'|'records'|'repositorio'} currentTab
 * @param {boolean} isRepositorioTabAvailable
 * @returns {'forms'|'records'|'repositorio'}
 */
function resolveFallbackTab(currentTab, isRepositorioTabAvailable) {
  if (!isRepositorioTabAvailable && currentTab === 'repositorio') return 'forms';
  return currentTab;
}

/**
 * canActivateTab
 * Replica las reglas actuales:
 * - "repositorio" requiere disponibilidad
 * - "forms" y "records" siempre se activan
 *
 * @param {'forms'|'records'|'repositorio'} tab
 * @param {boolean} isRepositorioTabAvailable
 * @returns {boolean}
 */
function canActivateTab(tab, isRepositorioTabAvailable) {
  if (tab === 'repositorio') return !!isRepositorioTabAvailable;
  return true;
}

/**
 * resolveRedirect
 * Replica exactamente los redireccionamientos existentes en DynamicForm:
 * - si un formulario no pasa autorización => alert ya se muestra en el caller y luego
 *   navigate(`/${moduleSlug}`, { replace: true })
 *
 * Este método solo responde la decisión de redirect (sin navegar).
 *
 * @param {Object} params
 * @param {string} params.moduleSlug
 * @returns {{to: string, replace: boolean} | null}
 */
function resolveRedirect({ moduleSlug } = {}) {
  if (!moduleSlug) return null;
  return { to: `/${moduleSlug}`, replace: true };
}

/**
 * shouldRedirect
 * Replica la condición actual:
 * - DynamicForm redirecciona si !canAccessRole(form.roles_allowed, rol)
 *
 * @param {Array<string>|undefined|null} requiredRoles
 * @param {string|undefined|null} userRole
 * @returns {boolean}
 */
function shouldRedirect(requiredRoles, userRole) {
  return !canAccessRole(requiredRoles, userRole);
}

export const NavigationResolver = {
  resolveDefaultTab,
  resolveFallbackTab,
  canActivateTab,
  resolveRedirect,
  shouldRedirect,

  // Re-export intencionalmente la semántica pura de roles usada por el componente.
  canAccessRole,
};

export { canAccessRole };

