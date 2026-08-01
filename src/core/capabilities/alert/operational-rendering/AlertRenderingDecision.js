/**
 * AlertRenderingDecision
 *
 * Sprint 175 — Produces the rendering availability decision.
 *
 * Pure decision logic. Never executes.
 */

export function decideAlertRendering(resolution) {
  if (!resolution || resolution.resolved !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      renderingAllowed: false,
      executionAllowed: false,
      governanceValidated: false,
      reasons: resolution && resolution.reasons ? resolution.reasons : ['rendering-resolution-failed'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: 'available',
    renderingAllowed: true,
    executionAllowed: false,
    governanceValidated: true,
    reasons: [],
  });
}

export default decideAlertRendering;
