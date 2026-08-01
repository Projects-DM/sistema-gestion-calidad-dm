/**
 * ResponseContextBuilder
 *
 * Sprint 173 — Maps a policy result into a response preparation
 * context.
 *
 * Maps and structures ONLY. Never executes responses, dispatches
 * notifications or triggers workflows.
 */

export function buildResponseContext(policyResult) {
  if (!policyResult || policyResult.readyForEvaluation !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      policyResult: policyResult && policyResult.policyContext ? policyResult.policyContext : null,
      responseContext: {},
      readyForResponse: false,
      responseExecuted: false,
      reasons: ['invalid-policy-result'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    policyResult: policyResult.policyContext ? policyResult.policyContext : {},
    responseContext: Object.freeze({}),
    readyForResponse: true,
    responseExecuted: false,
    reasons: [],
  });
}

export default buildResponseContext;
