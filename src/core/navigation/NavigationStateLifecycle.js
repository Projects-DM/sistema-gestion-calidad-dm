/**
 * NavigationStateLifecycle
 *
 * Sprint 190 — Dynamic Module One-Shot Navigation Consumption.
 *
 * Owns the post-consumption CLEANUP of the Router navigation state.
 *
 * After the navigation state is consumed once, the Shell asks this
 * lifecycle to clear the location.state using a NON-historical replace,
 * so the browser history is NOT affected but the navigation intent
 * disappears from the current entry.
 *
 * The Shell provides the React Router `navigate` function (it never
 * imports Router themselves). This module never reads Router, never
 * navigates imperatively on its own — it only issues the single
 * `replace(currentPath, { state: null })` the Shell requests.
 *
 * Boundary guarantees:
 *   - clearing is idempotent (never clears twice)
 *   - never pushes (no new history entry)
 *   - never re-injects any navigation state
 */

export function createNavigationLifecycle() {
  let cleared = false;

  /**
   * clearNavigationState
   * Replaces the current route path removing the navigation state.
   *
   * @param {object} opts
   * @param {Function} opts.navigate  React Router navigate()
   * @param {string}   opts.currentPath (e.g. location.pathname)
   * @returns {{ cleared: boolean, replaced: boolean, reasons: string[] }}
   */
  function clearNavigationState({ navigate, currentPath } = {}) {
    const reasons = [];
    if (cleared) return { cleared: true, replaced: false, reasons: ['already-cleared'] };
    if (typeof navigate !== 'function') {
      reasons.push('navigate-not-provided');
      return { cleared: false, replaced: false, reasons };
    }
    if (!currentPath) {
      reasons.push('current-path-missing');
      return { cleared: false, replaced: false, reasons };
    }

    // NON-historical replace: strips navigation state without adding to history.
    navigate(currentPath, { replace: true, state: null });
    cleared = true;
    return { cleared: true, replaced: true, reasons };
  }

  return {
    clear: clearNavigationState,
    cleared: () => cleared,
    reset: () => {
      cleared = false;
    },
  };
}

export const NavigationStateLifecycle = Object.freeze({
  create: createNavigationLifecycle,
});

export default NavigationStateLifecycle;