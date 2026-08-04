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
  extractResourceAlertMetadata,
  resolveResourceAlertConfiguration,
  shouldProduceAlert,
} from './AlertConfigurationResolver.js';

export const ENROLLMENT_REASONS = Object.freeze({
  NO_ALERT_CONFIG: 'no-alert-config',
  EMPTY_CONFIG: 'empty-config',
  INVALID_CONFIG: 'invalid-config',
  DISABLED: 'disabled',
});

const EMPTY_RESOLUTION = Object.freeze({
  enrolled: false,
  reasons: Object.freeze([ENROLLMENT_REASONS.NO_ALERT_CONFIG]),
  resolution: null,
});

function hasExplicitMetadata(resource) {
  const raw = extractResourceAlertMetadata(resource);
  return raw != null && typeof raw === 'object' && Object.keys(raw).length > 0;
}

/**
 * Evaluates whether a resource is EXPLICITLY enrolled in the Alert Runtime.
 *
 * @param {Object} resource Form, Repository, Document or Record metadata.
 * @returns {Object} { enrolled, reasons, resolution }
 *   - enrolled:    true only when E1–E4 hold simultaneously.
 *   - reasons:     frozen array of violated policy reasons (empty when enrolled).
 *   - resolution:  the Resolver resolution (source 'metadata'/'default') when
 *                  enrolled; null otherwise.
 */
export function evaluateAlertEnrollment(resource) {
  if (!resource || typeof resource !== 'object') return EMPTY_RESOLUTION;

  const raw = extractResourceAlertMetadata(resource);

  // E1 — configuration must exist.
  if (raw == null) {
    return Object.freeze({
      enrolled: false,
      reasons: Object.freeze([ENROLLMENT_REASONS.NO_ALERT_CONFIG]),
      resolution: null,
    });
  }

  // E4 — malformed configuration is invalid per the certified contract.
  if (typeof raw !== 'object') {
    return Object.freeze({
      enrolled: false,
      reasons: Object.freeze([ENROLLMENT_REASONS.INVALID_CONFIG]),
      resolution: null,
    });
  }

  // E2 — configuration must have been created EXPLICITLY (non-empty).
  // `{}` is treated as "never configured" and is NOT enrolled.
  if (Object.keys(raw).length === 0) {
    return Object.freeze({
      enrolled: false,
      reasons: Object.freeze([ENROLLMENT_REASONS.EMPTY_CONFIG]),
      resolution: null,
    });
  }

  const resolution = resolveResourceAlertConfiguration(resource);
  const configuration = resolution.configuration;

  // E3 — configuration must be ENABLED. The decision is delegated to the
  // Resolver (`shouldProduceAlert`), the sole owner of configuration.
  if (!shouldProduceAlert(configuration)) {
    return Object.freeze({
      enrolled: false,
      reasons: Object.freeze([ENROLLMENT_REASONS.DISABLED]),
      resolution,
    });
  }

  return Object.freeze({
    enrolled: true,
    reasons: Object.freeze([]),
    resolution,
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
