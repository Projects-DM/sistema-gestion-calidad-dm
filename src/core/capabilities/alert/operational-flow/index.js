/**
 * Alert Operational Flow
 *
 * Sprint 174 — Unifies the certified LEVEL 4 pipeline into one
 * controlled operational flow.
 *
 * Orchestrates ONLY. Reuses existing Core. Never executes.
 */

import { validateAlertFlow } from './AlertFlowValidator.js';
import { decideAlertFlow } from './AlertFlowResult.js';
import { runOperationalFlow } from './AlertOperationalFlow.js';
import { OPERATIONAL_BOUNDARY } from './OperationalBoundary.js';

export { runOperationalFlow } from './AlertOperationalFlow.js';
export { validateAlertFlow, ALERT_FLOW_VALIDATION } from './AlertFlowValidator.js';
export { decideAlertFlow } from './AlertFlowResult.js';
export { OPERATIONAL_BOUNDARY } from './OperationalBoundary.js';

export function requestOperationalFlow(request) {
  const flow = runOperationalFlow(request);
  const validation = validateAlertFlow(request);
  const result = decideAlertFlow(validation);

  return Object.freeze({
    ...flow,
    ...result,
    validation,
    boundary: OPERATIONAL_BOUNDARY,
  });
}

export const ALERT_OPERATIONAL_FLOW = Object.freeze({
  key: 'operational-flow',
  name: 'Alert Operational Flow',
  execution: false,
});

export default ALERT_OPERATIONAL_FLOW;
