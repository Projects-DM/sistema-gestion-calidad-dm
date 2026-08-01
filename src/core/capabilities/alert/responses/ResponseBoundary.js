/**
 * ResponseBoundary
 *
 * Sprint 158 — Protects the response path from direct provider
 * binding and external execution.
 *
 * Path: Policy Outcome → Response Contract → Future Execution Layer.
 * Policy outcome NEVER reaches a notification provider directly.
 */

export const RESPONSE_BOUNDARY = Object.freeze({
  key: 'response-boundary',
  name: 'Alert Response Boundary',
  protectedPath: Object.freeze([
    'Policy Outcome',
    'Response Contract',
    'Future Execution Layer',
  ]),
  forbiddenPath: Object.freeze([
    'Policy Outcome',
    'Notification Provider',
    'External Execution',
  ]),
});

export default RESPONSE_BOUNDARY;
