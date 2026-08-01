/**
 * DecisionContextDomain
 *
 * Sprint 151 (v2) — Bounded context: Decision Context.
 *
 * Responsibility MODEL ONLY. No rules, no engines, no processes.
 * Represents the responsibility boundary for decision context and outcome.
 */

export const DecisionContextDomain = Object.freeze({
  key: 'decision-context',
  name: 'Decision Context Bounded Context',
  responsibility: Object.freeze({
    owns: Object.freeze(['Decision context', 'Decision outcome']),
    neverOwns: Object.freeze([
      'Alert state',
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

export default DecisionContextDomain;
