/**
 * alertConfigurationErrorPresenter — PRESENTATION-ONLY error shape helper.
 *
 * Sprint 274 (E) — translates the errors contract returned by
 * `AlertConfigurationApplicationService.saveCollection` into a visible
 * presentation shape WITHOUT losing field granularity.
 *
 * Contract consumed (unchanged — read only):
 *   - `errors.general: string[]`          → general/persistence failure.
 *   - `errors[index]: {field: string[]}`  → per-collection-item failure.
 *   - `errors.field: string[]`            → direct field-failure (legacy).
 *
 * Presentation rules (Sprint 274 §7):
 *   - every indexed/general failure produces at least one human-readable line
 *     in the `form` block (always visible — `AlertConfigurationForm` renders
 *     `errors.form`).
 *   - when the collection has a SINGLE item, field-level errors are ALSO
 *     promoted to the top level (`errors.name`, `errors.priority`, ...) so the
 *     Form renders them inline via `FieldError`.
 *
 * Pure function. No React, no services, no persistence, no domain logic.
 */

export const flattenErrorValue = (value) => {
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(value);
  return out;
};

/**
 * @param {Object|null|undefined} rawErrors  — the `errors` payload of saveCollection.
 * @param {string[]} [alertLabels]           — display names of the collection items.
 * @returns {Object} — presentation errors: `{ form?: string[], [field]: string[] }`.
 */
export function buildVisibleErrors(rawErrors, alertLabels = []) {
  const field = {};
  const general = [];
  if (rawErrors && typeof rawErrors === 'object') {
    const keys = Object.keys(rawErrors);
    for (const key of keys) {
      if (key === 'general') {
        general.push(...flattenErrorValue(rawErrors[key]));
      } else if (/^\d+$/.test(key)) {
        const index = Number(key);
        const label = alertLabels[index] ?? `Alerta ${index + 1}`;
        const item = rawErrors[key];
        const messages = flattenErrorValue(item);
        if (messages.length > 0) {
          general.push(`${label} — ${messages.join(' · ')}`);
        }
        if (keys.length === 1) {
          // Single collection item: preserve field-level granularity.
          for (const [fk, fv] of Object.entries(item || {})) {
            field[fk] = flattenErrorValue(fv);
          }
        }
      } else if (rawErrors[key] !== undefined) {
        field[key] = flattenErrorValue(rawErrors[key]);
      }
    }
  }
  if (general.length > 0) field.form = general;
  return field;
}

export default buildVisibleErrors;