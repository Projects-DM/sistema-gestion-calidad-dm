/**
 * PolicyDefinitionDomain
 *
 * Sprint 151 (v2) — Bounded context: Policy Definition.
 *
 * Responsibility MODEL ONLY. No rules, no engines, no processes.
 * Represents the responsibility boundary for policy identity and lifecycle.
 */

export const PolicyDefinitionDomain = Object.freeze({
  key: 'policy-definition',
  name: 'Policy Definition Bounded Context',
  responsibility: Object.freeze({
    owns: Object.freeze(['Policy identity', 'Policy lifecycle']),
    neverOwns: Object.freeze([
      'Alert state',
      'Decision',
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

export default PolicyDefinitionDomain;
