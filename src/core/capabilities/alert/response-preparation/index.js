/**
 * Alert Response Preparation
 *
 * Sprint 173 — Controlled response preparation boundary.
 *
 * LEVEL 4 PHASE. Maps and validates response preparation contexts. NO
 * response execution, NO notification dispatch, NO workflow trigger.
 */

import { validateResponsePreparation } from './ResponsePreparationValidator.js';
import { decideResponsePreparation } from './ResponsePreparationDecision.js';

export { ResponsePreparationContract, RESPONSE_PREPARATION_VERSION } from './ResponsePreparationContract.js';
export { buildResponseContext } from './ResponseContextBuilder.js';
export { validateResponsePreparation, RESPONSE_PREPARATION_VALIDATION } from './ResponsePreparationValidator.js';
export { decideResponsePreparation } from './ResponsePreparationDecision.js';
export { RESPONSE_PREPARATION_BOUNDARY } from './ResponsePreparationBoundary.js';

export function requestResponsePreparation(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      responseAvailable: false,
      responseExecuted: false,
      notificationSent: false,
      reasons: ['missing-response-context'],
    });
  }

  const validation = validateResponsePreparation(request);
  const decision = decideResponsePreparation(validation);

  return Object.freeze({
    ...decision,
    validation,
  });
}

export const ALERT_RESPONSE_PREPARATION = Object.freeze({
  key: 'response-preparation',
  name: 'Alert Controlled Response Preparation',
  execution: false,
});

export default ALERT_RESPONSE_PREPARATION;
