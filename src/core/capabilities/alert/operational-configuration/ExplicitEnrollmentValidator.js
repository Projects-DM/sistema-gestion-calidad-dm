/**
 * ExplicitEnrollmentValidator
 *
 * Sprint 211 — Official Explicit Enrollment Policy (LEVEL 5).
 *
 * A resource ONLY enters the Alert Runtime when ALL of the following
 * conditions hold simultaneously:
 *
 *   E1  Exists alert configuration.
 *   E2  The configuration was created EXPLICITLY by the user (non-empty
 *       persisted metadata — never an implicit/default artifact).
 *   E3  The configuration is ENABLED (enabled === true).
 *   E4  The resource holds a VALID configuration (per certified contract).
 *
 * Consequences (official policy):
 *   - NO implicit alerts: creating a Form/Repository/Document/Record
 *     NEVER generates an alert.
 *   - Resources without configuration are IGNORED by the Runtime.
 *   - `{}`, `null`, `undefined` and malformed metadata are NOT enrolled.
 *   - No default priority/risk/enabled are ever generated for a resource
 *     the user never configured.
 *
 * Enrollment Validation ONLY. It reuses the AlertConfigurationResolver
 * (sole owner of metadata reading and the sanctioned `shouldProduceAlert`
 * decision). It never resolves, never evaluates, never executes.
 */

import {
  extractResourceAlertCollection,
  resolveResourceAlertConfiguration,
  alertConfigIdOf,
  shouldProduceAlert,
} from './AlertConfigurationResolver.js';

export const ENROLLMENT_REASONS = Object.freeze({
  NO_ALERT_CONFIG: 'no-alert-config',
  EMPTY_CONFIG: 'empty-config',
  INVALID_CONFIG: 'invalid-config',
  DISABLED: 'disabled',
});

/**
 * Sprint 261 — MULTI-ALERT ENROLLMENT (DEC-261-04, O-04/AC-02/AC-07..AC-11).
 *
 * Evaluates E1–E4 for EACH configuration of the resource independently, so a
 * resource with MULTIPLE alert configurations enrolls the leaf that satisfies
 * the policy and drops the ones that do not:
 *
 *   RESOURCE
 *     ├── A (explicit + enabled)  → enrolled
 *     └── B (explicit + disabled) → NOT enrolled (only A consumes runtime)
 *
 * Rules (Sprint 211 — Explicit Enrollment Policy, preserved per item):
 *   E1  Exists alert configuration (the item exists in the collection).
 *   E4  The item is a valid configuration object.
 *   E2  The item was created EXPLICITLY (non-empty persisted metadata).
 *   E3  The item is ENABLED (enabled === true).
 *
 * No implicit alert: a never-configured resource yields an EMPTY list
 * (AC-14) — no dummy/default is fabricated. Backward compatible with the
 * single-configuration case (AC-01/AC-13): one element → one item.
 *
 * @param {Object} resource Form, Repository, Document or Record metadata.
 * @returns {Object} {
 *   enrolled: boolean,             // true when AT LEAST ONE item enrolls.
 *   reasons: string[],            // aggregated policy reasons (empty when any enrolled).
 *   items: [{
 *     index, alertId, raw,
 *     enrolled, reasons, configuration
 *   }]
 * }
 */
export function evaluateAlertEnrollments(resource) {
  const rawCollection = extractResourceAlertCollection(resource);
  const list = Array.isArray(rawCollection) ? rawCollection : [];

  if (list.length === 0) {
    // Never-configured → no alert at all (AC-14): no fabricated enrollment.
    return Object.freeze({
      source: 'metadata',
      resourceId: resource?.id ?? resource?.slug ?? null,
      enrolled: false,
      reasons: Object.freeze([ENROLLMENT_REASONS.NO_ALERT_CONFIG]),
      items: Object.freeze([]),
    });
  }

  const items = list.map((rawItem, index) => {
    const alertId = alertConfigIdOf(resource?.id ?? resource?.slug ?? null, index);
    const base = { index, alertId, raw: rawItem };

    // E1 — item must exist.
    if (rawItem == null) {
      return Object.freeze({ ...base, enrolled: false, reasons: Object.freeze([ENROLLMENT_REASONS.NO_ALERT_CONFIG]), configuration: null });
    }
    // E4 — the item must be an object (malformed → invalid).
    if (typeof rawItem !== 'object') {
      return Object.freeze({ ...base, enrolled: false, reasons: Object.freeze([ENROLLMENT_REASONS.INVALID_CONFIG]), configuration: null });
    }
    // E2 — the item must be EXPLICIT (non-empty); `{}` = never configured.
    if (Object.keys(rawItem).length === 0) {
      return Object.freeze({ ...base, enrolled: false, reasons: Object.freeze([ENROLLMENT_REASONS.EMPTY_CONFIG]), configuration: null });
    }
    // Normalize + resolve the item (single-config normalizer per element).
    const singleResolution = resolveResourceAlertConfiguration({ id: resource?.id ?? resource?.slug, slug: resource?.slug, alertConfiguration: rawItem });
    const configuration = singleResolution.configuration;
    // E3 — enabled (delegated to the Resolver's shouldProduceAlert decision).
    if (!shouldProduceAlert(configuration)) {
      return Object.freeze({ ...base, enrolled: false, reasons: Object.freeze([ENROLLMENT_REASONS.DISABLED]), configuration });
    }
    return Object.freeze({ ...base, enrolled: true, reasons: Object.freeze([]), configuration });
  });

  const enrolledItems = items.filter((i) => i.enrolled === true);
  const overall = enrolledItems.length > 0;
  const reasons = enrolledItems.length > 0 ? [] : items.flatMap((i) => i.reasons).filter((v, i2, arr) => arr.indexOf(v) === i2);

  return Object.freeze({
    source: 'metadata',
    resourceId: resource?.id ?? resource?.slug ?? null,
    enrolled: overall,
    reasons: Object.freeze(reasons),
    items: Object.freeze(items),
  });
}

/**
 * Evaluates whether a resource is EXPLICITLY enrolled in the Alert Runtime.
 *
 * SINGLE-CONFIGURATION contract (backward compatible, AC-01/AC-13): when the
 * resource holds a single configuration the result matches the historical
 * behavior exactly. For a MULTI-ALERT resource, `enrolled` is true when AT
 * LEAST ONE configuration is explicitly enrolled — the resource as a whole
 * enters the runtime, and each enrolled leaf is transported by
 * `evaluateAlertEnrollments` downstream.
 *
 * @param {Object} resource Form, Repository, Document or Record metadata.
 * @returns {Object} { enrolled, reasons, resolution }
 *   - enrolled:    true only when E1–E4 hold for at least one config.
 *   - reasons:     frozen array of violated policy reasons (empty when enrolled).
 *   - resolution:  the Resolver resolution of the FIRST enrolled config when
 *                  enrolled; null otherwise.
 */
export function evaluateAlertEnrollment(resource) {
  const multi = evaluateAlertEnrollments(resource);
  if (!multi.enrolled) {
    return Object.freeze({
      enrolled: false,
      reasons: multi.reasons,
      resolution: null,
      items: multi.items,
    });
  }

  const firstEnrolled = multi.items.find((i) => i.enrolled === true);
  const resolution = resolveResourceAlertConfiguration({ id: resource?.id ?? resource?.slug, alert_config: firstEnrolled.raw });
  return Object.freeze({
    enrolled: true,
    reasons: Object.freeze([]),
    resolution,
    items: multi.items,
  });
}

/**
 * Boolean convenience: true only when the resource is EXPLICITLY enrolled.
 *
 * @param {Object} resource Form, Repository, Document or Record metadata.
 * @returns {boolean}
 */
export function isExplicitlyEnrolled(resource) {
  return evaluateAlertEnrollment(resource).enrolled === true;
}

/**
 * Sprint 211 — the ONLY sanctioned Runtime entry predicate. The Runtime
 * may only evaluate EXPLICITLY ENROLLED resources, never all resources.
 *
 * @param {Object} resource Form, Repository, Document or Record metadata.
 * @returns {boolean}
 */
export function shouldEnrollResource(resource) {
  return isExplicitlyEnrolled(resource);
}

export default evaluateAlertEnrollment;
