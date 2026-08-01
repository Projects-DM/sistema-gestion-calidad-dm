/**
 * AlertFlowResult
 *
 * Sprint 174 — Delivers the final operational pipeline state.
 *
 * Pure decision logic based on flow validation. Never executes
 * responses or enables execution.
 */

export function decideAlertFlow(validation) {
  if (!validation || validation.valid !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      pipelineStatus: 'incomplete',
      operationalReady: false,
      executionMode: 'controlled',
      reasons: validation && validation.reasons ? validation.reasons : ['flow-validation-failed'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    pipelineStatus: 'completed',
    operationalReady: true,
    executionMode: 'controlled',
    reasons: [],
  });
}

export default decideAlertFlow;
