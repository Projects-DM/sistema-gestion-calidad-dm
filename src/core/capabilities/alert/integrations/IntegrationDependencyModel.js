/**
 * IntegrationDependencyModel
 *
 * Sprint 164 — Declares allowed and forbidden dependencies of the
 * Alert Capability.
 *
 * Governs dependency ownership. Does NOT instantiate dependencies.
 */

export const INTEGRATION_DEPENDENCY_MODEL = Object.freeze({
  capability: 'alerts',
  allowedDependencies: Object.freeze([
    'Capability Contracts',
    'Core Governance',
    'Runtime Contracts',
    'Existing Platform Services',
  ]),
  forbiddenDependencies: Object.freeze([
    'Database Tables',
    'Infrastructure Providers',
    'External APIs',
    'UI Components',
  ]),
  ownership: Object.freeze({
    rule: 'every dependency must have an owner',
    never: Object.freeze([
      'Unknown dependency',
      'Hidden dependency',
      'Accidental coupling',
    ]),
  }),
});

export default INTEGRATION_DEPENDENCY_MODEL;
