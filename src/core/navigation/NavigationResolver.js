/**
 * NavigationResolver
 *
 * Adaptador PÚRÓ para centralizar decisiones de navegación duplicadas.
 *
 * Reglas de responsabilidad (refinamiento Sprint 54.R):
 * - NavigationResolver responde ÚNICAMENTE decisiones de navegación.
 * - No contiene lógica de autorización (RBAC/permisos/roles).
 * - No importa Auth/Runtime/Metadata/Business Logic.
 * - Depende únicamente de datos recibidos por parámetros.
 */

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
 * isTabAvailable
 * Refuerzo semántico: no "activa" tab; solo responde disponibilidad.
 *
 * @param {'forms'|'records'|'repositorio'} tab
 * @param {boolean} isRepositorioTabAvailable
 * @returns {boolean}
 */
function isTabAvailable(tab, isRepositorioTabAvailable) {
  if (tab === 'repositorio') return !!isRepositorioTabAvailable;
  return true;
}

/**
 * resolveRedirect
 * Replica exactamente los redireccionamientos existentes en DynamicForm:
 * - redirige hacia `/${moduleSlug}` con { replace: true }
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
 * Decisión de navegación por autorización: el caller provee la condición.
 *
 * @param {boolean} shouldRedirectNow
 * @returns {boolean}
 */
function shouldRedirect(shouldRedirectNow) {
  return !!shouldRedirectNow;
}

export const NavigationResolver = {
  resolveDefaultTab,
  resolveFallbackTab,
  isTabAvailable,
  resolveRedirect,
  shouldRedirect,
};

