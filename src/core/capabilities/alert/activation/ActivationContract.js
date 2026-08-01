/**
 * ActivationContract
 *
 * Sprint 160 — Declares the governed activation boundary of the
 * Alert Capability.
 *
 * Defines governance requirements ONLY. Activates nothing.
 * Registers nothing.
 */

export const ACTIVATION_VERSION = '1';

export const ActivationContract = Object.freeze({
  contractKey: 'alert.activation',
  name: 'Activation Contract',
  version: ACTIVATION_VERSION,
  capability: 'alerts',
  activation: false,
  runtimeRegistration: false,
  governanceRequired: true,
  representation: Object.freeze({
    activationIdentity: Object.freeze({ type: 'string', required: true, description: 'Activation identity' }),
    capabilityReference: Object.freeze({ type: 'string', required: true, description: 'Capability key reference' }),
    activationVersion: Object.freeze({ type: 'string', required: true, description: 'Activation contract version' }),
    governanceRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified governance constraints' }),
  }),
  boundaries: Object.freeze({
    neverExecutes: Object.freeze([
      'Capability activation',
      'Runtime registration',
      'Operational enablement',
    ]),
  }),
});

export default ActivationContract;
