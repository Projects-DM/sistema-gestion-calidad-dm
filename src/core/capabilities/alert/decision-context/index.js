/**
 * Alert Decision Context
 *
 * Sprint 171 — Controlled decision context boundary.
 *
 * LEVEL 4 PHASE. Constructs and validates governed decision contexts.
 * NO decision execution, NO rule evaluation, NO policy trigger.
 */

import { validateDecisionContext } from './DecisionContextValidator.js';
import { decideDecisionContext } from './DecisionContextDecision.js';

export { DecisionContextContract, DECISION_CONTEXT_VERSION } from './DecisionContextContract.js';
export { buildDecisionContext } from './DecisionContextBuilder.js';
export { validateDecisionContext, DECISION_CONTEXT_VALIDATION } from './DecisionContextValidator.js';
export { decideDecisionContext } from './DecisionContextDecision.js';
export { DECISION_CONTEXT_BOUNDARY } from './DecisionContextBoundary.js';

export function requestDecisionContext(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      contextAvailable: false,
      decisionExecuted: false,
      policyTriggered: false,
      reasons: ['missing-context'],
    });
  }

  const validation = validateDecisionContext(request);
  const decision = decideDecisionContext(validation);

  return Object.freeze({
    ...decision,
    validation,
  });
}

export const ALERT_DECISION_CONTEXT = Object.freeze({
  key: 'decision-context',
  name: 'Alert Controlled Decision Context',
  execution: false,
});

export default ALERT_DECISION_CONTEXT;
