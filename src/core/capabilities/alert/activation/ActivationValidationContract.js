/**
 * ActivationValidationContract
 *
 * Sprint 163 — Declares the validation boundary for future
 * activation requests.
 *
 * Prepares what must be validated. Does NOT execute validation.
 */

export const ACTIVATION_VALIDATION_VERSION = '1';

export const ActivationValidationContract = Object.freeze({
  contractKey: 'alert.activation-validation',
  name: 'Activation Validation Contract',
  version: ACTIVATION_VALIDATION_VERSION,
  capabilityKey: 'alerts',
  execution: false,
  validation: false,
  representation: Object.freeze({
    activationRequest: Object.freeze({ type: 'object', required: true, description: 'Activation request reference' }),
    validationBoundary: Object.freeze({ type: 'object', required: true, description: 'Validation constraints' }),
    approvalReadiness: Object.freeze({ type: 'boolean', required: true, description: 'Approval readiness flag' }),
  }),
  preparedValidations: Object.freeze([
    'Capability exists',
    'Capability version compatible',
    'Governance rules satisfied',
    'Authorization available',
  ]),
  boundaries: Object.freeze({
    neverExecutes: Object.freeze([
      'Validation execution',
      'Approval decision',
      'Activation enablement',
    ]),
  }),
});

export default ActivationValidationContract;
