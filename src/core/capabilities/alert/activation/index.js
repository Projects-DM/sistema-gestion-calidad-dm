/**
 * Alert Activation
 *
 * Sprint 160 — Certified activation governance boundary.
 * Sprint 163 — Controlled activation design boundary.
 *
 * CERTIFIED STRUCTURE ONLY. Declares how the Alert Capability may be
 * activated in a governed way. No activation runtime, no state
 * machine, no permissions.
 */

export { ActivationContract, ACTIVATION_VERSION } from './ActivationContract.js';
export { ACTIVATION_GOVERNANCE } from './ActivationGovernance.js';
export { ACTIVATION_COMPATIBILITY } from './ActivationCompatibility.js';
export { ACTIVATION_BOUNDARY } from './ActivationBoundary.js';
export { ControlledActivationContract, CONTROLLED_ACTIVATION_VERSION } from './ControlledActivationContract.js';
export { ActivationRequestModel } from './ActivationRequestModel.js';
export { ActivationValidationContract, ACTIVATION_VALIDATION_VERSION } from './ActivationValidationContract.js';
export { CONTROLLED_ACTIVATION_BOUNDARY } from './ControlledActivationBoundary.js';

export const ALERT_ACTIVATION = Object.freeze({
  key: 'activation',
  name: 'Alert Activation Governance Boundary',
  activation: false,
});

export default ALERT_ACTIVATION;
