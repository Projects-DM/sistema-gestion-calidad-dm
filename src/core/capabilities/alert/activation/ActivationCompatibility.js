/**
 * ActivationCompatibility
 *
 * Sprint 160 — Declares the supported governed activation model.
 *
 * Describes compatibility only. Does NOT activate.
 */

export const ACTIVATION_COMPATIBILITY = Object.freeze({
  activationModel: Object.freeze({
    supportedModel: 'capability-to-governed-activation',
    activation: false,
    runtimeRegistration: false,
  }),
  versionCompatibility: Object.freeze({
    contractVersioned: true,
    futureVersions: 'compatibility validated on activation',
  }),
  lifecycleSupport: Object.freeze({
    prepares: Object.freeze([
      'DEFINED',
      'READY',
      'APPROVED',
      'ENABLED',
      'ACTIVE',
      'DISABLED',
    ]),
    stateMachine: false,
  }),
  securityAlignment: Object.freeze({
    respects: Object.freeze([
      'Authentication',
      'Authorization',
      'Governance',
      'Capability activation',
    ]),
    never: Object.freeze([
      'Direct activation',
      'Hidden activation',
      'Automatic enablement',
    ]),
  }),
});

export default ACTIVATION_COMPATIBILITY;
