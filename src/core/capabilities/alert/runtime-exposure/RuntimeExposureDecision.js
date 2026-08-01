/**
 * RuntimeExposureDecision
 *
 * Sprint 169 — Produces the runtime visibility decision.
 *
 * Pure decision logic based on validation results. Never enables
 * execution.
 */

export function decideRuntimeExposure(validation) {
  if (!validation || validation.valid !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      visible: false,
      executable: false,
      runtimeActivated: false,
      reasons: validation && validation.reasons ? validation.reasons : ['validation-failed'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: 'approved',
    visible: true,
    executable: false,
    runtimeActivated: false,
    reasons: [],
  });
}

export default decideRuntimeExposure;
