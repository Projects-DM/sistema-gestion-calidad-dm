/**
 * PolicyCompatibility
 *
 * Sprint 157 — Declares the supported governed policy model.
 *
 * Describes compatibility only. Does NOT evaluate policies.
 */

export const POLICY_COMPATIBILITY = Object.freeze({
  policyModel: Object.freeze({
    supportedModel: 'decision-context-to-policy-evaluation',
    evaluation: false,
    execution: false,
  }),
  versionCompatibility: Object.freeze({
    contractVersioned: true,
    futureVersions: 'compatibility validated on evaluation',
  }),
  governanceProtection: Object.freeze({
    protects: 'policy evaluation boundary',
    neverBinds: Object.freeze([
      'Runtime state',
      'Database policies',
      'Persistence models',
      'External providers',
    ]),
  }),
  deterministicPreparation: Object.freeze({
    guarantee: 'same decision context + same policy version → same future evaluation',
  }),
  traceabilityPreparation: Object.freeze({
    prepares: Object.freeze(['Decision origin', 'Applied policy', 'Future policy outcome']),
    features: Object.freeze(['Explainability', 'Auditability', 'Policy traceability']),
  }),
});

export default POLICY_COMPATIBILITY;
