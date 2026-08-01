/**
 * AlertFlowValidator
 *
 * Sprint 174 — Validates the complete Alert Capability pipeline.
 *
 * Pure, deterministic validation across every certified layer.
 * Never executes operational actions.
 */

export const ALERT_FLOW_VALIDATION = Object.freeze({
  capabilityKey: 'alerts',
  checks: Object.freeze([
    'activationApproved',
    'registryReady',
    'runtimeVisible',
    'eventCompatible',
    'decisionContextAvailable',
    'policyContextAvailable',
    'responseContextAvailable',
  ]),
});

export function validateAlertFlow(request) {
  const checks = {
    activationApproved: !!request && request.activationApproved === true,
    registryReady: !!request && request.registryReady === true,
    runtimeVisible: !!request && request.runtimeVisible === true,
    eventCompatible: !!request && request.eventCompatible === true,
    decisionContextAvailable: !!request && request.decisionContextAvailable === true,
    policyContextAvailable: !!request && request.policyContextAvailable === true,
    responseContextAvailable: !!request && request.responseContextAvailable === true,
  };

  return Object.freeze({
    capabilityKey: 'alerts',
    valid: Object.values(checks).every(Boolean),
    checks,
    reasons: Object.entries(checks)
      .filter(([, ok]) => !ok)
      .map(([name]) => name),
  });
}

export default validateAlertFlow;
