/**
 * ActivationRequestModel
 *
 * Sprint 163 — Defines the future activation request structure.
 *
 * Describes the shape of a governed activation request. Does NOT
 * store, process or execute anything.
 */

export const ActivationRequestModel = Object.freeze({
  capabilityKey: 'alerts',
  requestedAction: 'enable',
  requester: null,
  governanceContext: null,
  validationRequired: true,
  approved: false,
  activated: false,
  shape: Object.freeze({
    capability: Object.freeze({ type: 'string', required: true, description: 'Capability key' }),
    activationIntent: Object.freeze({ type: 'string', required: true, description: 'Requested activation action' }),
    requestedBy: Object.freeze({ type: 'string', required: true, description: 'Requester identity' }),
    governanceContext: Object.freeze({ type: 'object', required: true, description: 'Governance context' }),
    validationRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified validation constraints' }),
  }),
});

export default ActivationRequestModel;
