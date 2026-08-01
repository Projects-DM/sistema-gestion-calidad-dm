/**
 * ActivationDecision
 *
 * Sprint 167 — Produces the controlled enablement decision.
 *
 * Pure decision logic based on validation results. Never performs
 * runtime exposure, registry mutation or execution.
 */

export function decideActivation(validation) {
  if (!validation || validation.valid !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      enabled: false,
      runtimeExposure: false,
      registryMutation: false,
      reasons: validation && validation.reasons ? validation.reasons : ['validation-failed'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: 'approved',
    enabled: true,
    runtimeExposure: false,
    registryMutation: false,
    reasons: [],
  });
}

export default decideActivation;
