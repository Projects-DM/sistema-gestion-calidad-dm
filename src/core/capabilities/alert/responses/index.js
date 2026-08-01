/**
 * Alert Responses
 *
 * Sprint 158 — Certified response governance boundary.
 *
 * CERTIFIED STRUCTURE ONLY. Declares how a policy outcome reaches a
 * governed response. No response engine, no providers, no workflow.
 */

export { ResponseDefinitionContract, RESPONSE_DEFINITION_VERSION } from './ResponseDefinitionContract.js';
export { RESPONSE_COMPATIBILITY } from './ResponseCompatibility.js';
export { RESPONSE_BOUNDARY } from './ResponseBoundary.js';

export const ALERT_RESPONSES = Object.freeze({
  key: 'responses',
  name: 'Alert Response Governance Boundary',
  execution: false,
});

export default ALERT_RESPONSES;
