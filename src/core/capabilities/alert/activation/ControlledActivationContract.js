/**
 * ControlledActivationContract
 *
 * Sprint 163 — Declares the controlled activation boundary of the
 * Alert Capability.
 *
 * Defines activation intent and governance context ONLY. Activates
 * nothing. Registers nothing.
 */

export const CONTROLLED_ACTIVATION_VERSION = '1';

export const ControlledActivationContract = Object.freeze({
  contractKey: 'alert.controlled-activation',
  name: 'Controlled Activation Contract',
  version: CONTROLLED_ACTIVATION_VERSION,
  capabilityKey: 'alerts',
  activationMode: 'controlled',
  runtimeExposure: false,
  governanceRequired: true,
  approvalRequired: true,
  execution: false,
  representation: Object.freeze({
    controlledActivationIdentity: Object.freeze({ type: 'string', required: true, description: 'Controlled activation identity' }),
    capabilityReference: Object.freeze({ type: 'string', required: true, description: 'Capability key reference' }),
    activationIntent: Object.freeze({ type: 'string', required: true, description: 'Requested activation action' }),
    governanceContext: Object.freeze({ type: 'object', required: true, description: 'Governance context reference' }),
  }),
  boundaries: Object.freeze({
    neverExecutes: Object.freeze([
      'Capability activation',
      'Runtime registration',
      'Operational enablement',
    ]),
  }),
});

export default ControlledActivationContract;
