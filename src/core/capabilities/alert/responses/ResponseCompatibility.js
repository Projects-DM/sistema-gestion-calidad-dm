/**
 * ResponseCompatibility
 *
 * Sprint 158 — Declares the supported governed response model.
 *
 * Describes compatibility only. Does NOT execute responses.
 */

export const RESPONSE_COMPATIBILITY = Object.freeze({
  responseModel: Object.freeze({
    supportedModel: 'policy-outcome-to-governed-response',
    authorization: false,
    execution: false,
  }),
  versionCompatibility: Object.freeze({
    contractVersioned: true,
    futureVersions: 'compatibility validated on execution',
  }),
  executionProtection: Object.freeze({
    protects: 'response execution boundary',
    neverBinds: Object.freeze([
      'Email providers',
      'SMS providers',
      'Push services',
      'Messaging providers',
      'External APIs',
      'Infrastructure',
    ]),
  }),
  deterministicPreparation: Object.freeze({
    guarantee: 'same policy outcome + same response definition → same future execution path',
  }),
  lifecyclePreparation: Object.freeze({
    prepares: Object.freeze([
      'Defined',
      'Authorized',
      'Triggered',
      'Executed',
      'Observed',
      'Completed',
    ]),
    engine: false,
  }),
  traceabilityPreparation: Object.freeze({
    prepares: Object.freeze([
      'Decision origin',
      'Applied policy',
      'Response definition',
      'Future execution history',
    ]),
    features: Object.freeze(['Traceability', 'Auditability', 'Operational explainability']),
  }),
});

export default RESPONSE_COMPATIBILITY;
