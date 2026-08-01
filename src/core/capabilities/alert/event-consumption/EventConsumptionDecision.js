/**
 * EventConsumptionDecision
 *
 * Sprint 170 — Produces the event consumption decision.
 *
 * Pure decision logic based on validation results. Never enables
 * processing or execution.
 */

export function decideEventConsumption(validation) {
  if (!validation || validation.valid !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      consumptionAllowed: false,
      processingEnabled: false,
      executionEnabled: false,
      reasons: validation && validation.reasons ? validation.reasons : ['validation-failed'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: 'approved',
    consumptionAllowed: true,
    processingEnabled: false,
    executionEnabled: false,
    reasons: [],
  });
}

export default decideEventConsumption;
