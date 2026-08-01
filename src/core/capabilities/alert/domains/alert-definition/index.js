/**
 * AlertDefinitionDomain
 *
 * Sprint 151 (v2) — Bounded context: Alert Definition.
 *
 * Responsibility MODEL ONLY. No rules, no engines, no processes.
 * Represents the responsibility boundary for alert identity and state.
 */

export const AlertDefinitionDomain = Object.freeze({
  key: 'alert-definition',
  name: 'Alert Definition Bounded Context',
  responsibility: Object.freeze({
    owns: Object.freeze(['Alert identity', 'Alert state']),
    neverOwns: Object.freeze([
      'Evaluation',
      'Decision',
      'Policy',
      'Response',
    ]),
  }),
  structure: Object.freeze({
    implementationSurface: true,
    runtimeLogic: false,
    persistence: false,
    ui: false,
  }),
});

export default AlertDefinitionDomain;
