/**
 * DecisionCompatibility
 *
 * Sprint 156 — Declares the supported governed decision model.
 *
 * Describes compatibility only. Does NOT evaluate decisions.
 */

export const DECISION_COMPATIBILITY = Object.freeze({
  decisionModel: Object.freeze({
    supportedModel: 'certified-event-to-governed-context',
    evaluation: false,
    execution: false,
  }),
  versionCompatibility: Object.freeze({
    contractVersioned: true,
    futureVersions: 'compatibility validated on evaluation',
  }),
  contextProtection: Object.freeze({
    protects: 'decision context boundary',
    neverBinds: Object.freeze([
      'Runtime state',
      'Database state',
      'Persistence models',
      'UI state',
    ]),
  }),
  deterministicPreparation: Object.freeze({
    guarantee: 'same context → same future evaluation',
  }),
  explainabilityPreparation: Object.freeze({
    prepares: Object.freeze(['Input context', 'Decision origin', 'Future explanation']),
  }),
});

export default DECISION_COMPATIBILITY;
