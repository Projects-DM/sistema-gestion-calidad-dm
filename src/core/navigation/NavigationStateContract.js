/**
 * NavigationStateContract
 *
 * Sprint 190 — Dynamic Module One-Shot Navigation Consumption.
 *
 * Defines the OFFICIAL shape of the navigation state that the Dynamic
 * Module consumes from the Router's location.state. This is a pure
 * description contract — it never reads Router state, never navigates.
 *
 * The ONLY allowed navigation intents a Shell may consume from the Router:
 *   - tab                 → the tab to open on arrival
 *   - navigationContext   → the resource context to present (document)
 *   - selectedRecord      → a record to locate
 *   - selectedForm        → a form to locate
 *   - selectedDocument    → a document to locate
 *
 * The Shell must NEVER consume arbitrary keys — only these certified ones.
 */

export const NAVIGATION_STATE_KEYS = Object.freeze([
  'tab',
  'navigationContext',
  'selectedRecord',
  'selectedForm',
  'selectedDocument',
]);

export function isNavigationState(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    Object.keys(value).some((key) => NAVIGATION_STATE_KEYS.includes(key))
  );
}

export function extractNavigationState(locationState) {
  if (!locationState || typeof locationState !== 'object') return null;
  const out = {};
  let found = false;
  for (const key of NAVIGATION_STATE_KEYS) {
    const val = locationState[key];
    if (val !== undefined && val !== null) {
      out[key] = val;
      found = true;
    }
  }
  return found ? out : null;
}

export function validateNavigationState(state) {
  const problems = [];
  if (state == null) {
    problems.push('navigation-state-missing');
    return problems;
  }
  if (state.tab != null && typeof state.tab !== 'string') {
    problems.push('tab-must-be-string');
  }
  if (state.navigationContext != null && typeof state.navigationContext !== 'object') {
    problems.push('navigation-context-must-be-object');
  }
  return problems;
}

export const NavigationStateContract = Object.freeze({
  keys: NAVIGATION_STATE_KEYS,
  isNavigationState,
  extractNavigationState,
  validateNavigationState,
});

export default NavigationStateContract;