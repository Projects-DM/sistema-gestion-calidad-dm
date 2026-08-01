/**
 * IntegrationCompatibility
 *
 * Sprint 164 — Declares the supported controlled integration model.
 *
 * Describes compatibility only. Does NOT execute integrations.
 */

export const INTEGRATION_COMPATIBILITY = Object.freeze({
  integrationModel: Object.freeze({
    supportedModel: 'capability-to-core-platform',
    mode: 'controlled',
    execution: false,
  }),
  versionCompatibility: Object.freeze({
    contractVersioned: true,
    futureVersions: 'compatibility validated on consumption',
  }),
  dependencyValidation: Object.freeze({
    validates: 'dependency ownership and direction',
    guarantee: 'same capability contract + same integration context → same future consumption model',
  }),
});

export default INTEGRATION_COMPATIBILITY;
