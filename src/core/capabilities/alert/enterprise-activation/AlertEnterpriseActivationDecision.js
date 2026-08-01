/**
 * AlertEnterpriseActivationDecision
 *
 * Sprint 179 — Decides whether Enterprise Activation is certified.
 *
 * Decision ONLY. Activation is declarative registration; execution
 * remains controlled (executionEnabled: false).
 */

export function decideEnterpriseActivation(validation) {
  const reasons = Array.isArray(validation?.reasons) ? validation.reasons : [];

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: validation?.valid === true ? 'activated' : 'rejected',
    activated: validation?.valid === true,
    executionEnabled: false,
    reasons,
  });
}

export default decideEnterpriseActivation;
