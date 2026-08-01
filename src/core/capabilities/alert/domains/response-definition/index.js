/**
 * ResponseDefinitionDomain
 *
 * Sprint 151 (v2) — Bounded context: Response Definition.
 *
 * Responsibility MODEL ONLY. No rules, no engines, no processes.
 * Represents the responsibility boundary for response definition and lifecycle.
 */

export const ResponseDefinitionDomain = Object.freeze({
  key: 'response-definition',
  name: 'Response Definition Bounded Context',
  responsibility: Object.freeze({
    owns: Object.freeze(['Response definition', 'Response lifecycle']),
    neverOwns: Object.freeze([
      'Alert state',
      'Decision',
      'Policy',
    ]),
  }),
  structure: Object.freeze({
    implementationSurface: true,
    runtimeLogic: false,
    persistence: false,
    ui: false,
  }),
});

export default ResponseDefinitionDomain;
