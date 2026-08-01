/**
 * RuntimeCompatibility
 *
 * Sprint 154 — Runtime consumption compatibility boundary.
 *
 * Declares runtime requirements and compatibility rules ONLY.
 * Does NOT execute, register or consume anything.
 */

export const RUNTIME_COMPATIBILITY = Object.freeze({
  runtimeModel: Object.freeze({
    compatibleWith: Object.freeze([
      'UniversalOperationalRuntime',
      'Capability Resolver',
      'Existing Engines',
    ]),
    integration: 'prepared — not implemented',
  }),
  runtimeRequirements: Object.freeze({
    frameworkAgnostic: true,
    infraAgnostic: true,
    persistenceAgnostic: true,
    consumption: 'contract boundary only',
  }),
  supportedRuntimeContext: Object.freeze({
    contractConsumption: true,
    runtimeRegistration: false,
    capabilityActivation: false,
  }),
  compatibilityRules: Object.freeze([
    'Runtime consumes contracts, never domain objects',
    'Runtime consumes public metadata, never internal files',
    'No runtime state is stored inside the capability',
  ]),
});

export default RUNTIME_COMPATIBILITY;
