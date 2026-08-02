/**
 * RuntimeBindingBoundary
 *
 * Sprint 185 — Runtime Binding Finalization.
 *
 * Blocks completely any demo/simulated/hardcoded alert data from
 * entering the Runtime Binding:
 *
 *   DEFAULT_ALERT_RULES · Fake Alerts · Hardcoded Messages ·
 *   Examples · Samples · Generated Alerts · Demo Runtime · Mock Runtime
 *
 * The Runtime ONLY binds to existing module resources.
 */

export const FORBIDDEN_DATA_TOKENS = Object.freeze([
  'DEFAULT_ALERT_RULES',
  'demo',
  'fake',
  'hardcoded',
  'example',
  'sample',
  'generated',
  'mock',
]);

/**
 * Scans arbitrary input for forbidden demo/fake/hardcoded markers.
 *
 * @param {*} input Value to scan (object/array/string/number).
 * @param {Set} [seen] Internal recursion guard.
 * @returns {string|null} First forbidden token found, or null.
 */
export function findForbiddenDataToken(input, seen = new Set()) {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string') {
    const lower = input.toLowerCase();
    return FORBIDDEN_DATA_TOKENS.find((t) => lower.includes(t.toLowerCase())) ?? null;
  }
  if (typeof input === 'number' || typeof input === 'boolean') return null;
  if (typeof input === 'object') {
    if (seen.has(input)) return null;
    seen.add(input);
    if (Array.isArray(input)) {
      for (const item of input) {
        const found = findForbiddenDataToken(item, seen);
        if (found) return found;
      }
      return null;
    }
    for (const value of Object.values(input)) {
      const found = findForbiddenDataToken(value, seen);
      if (found) return found;
    }
    return null;
  }
  return null;
}

export const RUNTIME_BINDING_BOUNDARY = Object.freeze({
  key: 'runtime-binding-boundary',
  name: 'Alert Runtime Binding Boundary',
  purpose: 'Blocks demo/simulated/hardcoded alert data from the existing Runtime.',
  protectedPath: Object.freeze([
    'Module',
    'Existing Resources',
    'Runtime Binding',
    'Existing Runtime',
  ]),
  forbiddenPath: Object.freeze([
    'DEFAULT_ALERT_RULES',
    'Demo Runtime',
    'Fake Runtime',
    'Mock Runtime',
    'Generated Alerts',
  ]),
  forbiddenTokens: FORBIDDEN_DATA_TOKENS,
});

export default RUNTIME_BINDING_BOUNDARY;
