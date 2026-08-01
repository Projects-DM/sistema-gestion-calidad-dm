/**
 * AlertOperationalFlow
 *
 * Sprint 174 — Unifies the Alert Capability operational pipeline.
 *
 * Orchestrates ONLY. Never executes responses, dispatches
 * notifications or bypasses Core governance.
 */

export function runOperationalFlow(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      status: 'invalid',
      operationalEnabled: false,
      executionAllowed: false,
      governanceValidated: false,
      reasons: ['missing-pipeline-state'],
    });
  }

  const chain = {
    activationApproved: request.activationApproved === true,
    registryReady: request.registryReady === true,
    runtimeVisible: request.runtimeVisible === true,
    eventCompatible: request.eventCompatible === true,
    decisionContextAvailable: request.decisionContextAvailable === true,
    policyContextAvailable: request.policyContextAvailable === true,
    responseContextAvailable: request.responseContextAvailable === true,
  };

  const allReady = Object.values(chain).every(Boolean);

  return Object.freeze({
    capabilityKey: 'alerts',
    status: allReady ? 'ready' : 'pending',
    operationalEnabled: allReady,
    executionAllowed: false,
    governanceValidated: allReady,
    chain: Object.freeze(chain),
    reasons: allReady
      ? []
      : Object.entries(chain)
          .filter(([, ok]) => !ok)
          .map(([name]) => name),
  });
}

export default runOperationalFlow;
