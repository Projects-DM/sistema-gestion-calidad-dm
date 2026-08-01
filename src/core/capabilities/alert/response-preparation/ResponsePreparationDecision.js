/**
 * ResponsePreparationDecision
 *
 * Sprint 173 — Produces the response preparation readiness result.
 *
 * Pure decision logic based on validation results. Never executes
 * responses or sends notifications.
 */

export function decideResponsePreparation(validation) {
  if (!validation || validation.valid !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      responseAvailable: false,
      responseExecuted: false,
      notificationSent: false,
      reasons: validation && validation.reasons ? validation.reasons : ['validation-failed'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: 'ready',
    responseAvailable: true,
    responseExecuted: false,
    notificationSent: false,
    reasons: [],
  });
}

export default decideResponsePreparation;
