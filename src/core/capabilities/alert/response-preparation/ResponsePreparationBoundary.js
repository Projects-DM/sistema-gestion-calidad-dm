/**
 * ResponsePreparationBoundary
 *
 * Sprint 173 — Protects the response layer from result-driven
 * automatic response execution.
 *
 * Path: Policy Result → Response Layer → Future Response Engine.
 * Response context NEVER triggers automatic response execution.
 */

export const RESPONSE_PREPARATION_BOUNDARY = Object.freeze({
  key: 'response-preparation-boundary',
  name: 'Alert Response Preparation Boundary',
  protectedPath: Object.freeze([
    'Policy Result',
    'Response Layer',
    'Future Response Engine',
  ]),
  forbiddenPath: Object.freeze([
    'Response Context',
    'Automatic Execution',
  ]),
});

export default RESPONSE_PREPARATION_BOUNDARY;
