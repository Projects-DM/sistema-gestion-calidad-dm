/**
 * Alert Activation
 *
 * Sprint 160 — Certified activation governance boundary.
 *
 * CERTIFIED STRUCTURE ONLY. Declares how the Alert Capability may be
 * activated in a governed way. No activation runtime, no state
 * machine, no permissions.
 */

export { ActivationContract, ACTIVATION_VERSION } from './ActivationContract.js';
export { ACTIVATION_GOVERNANCE } from './ActivationGovernance.js';
export { ACTIVATION_COMPATIBILITY } from './ActivationCompatibility.js';
export { ACTIVATION_BOUNDARY } from './ActivationBoundary.js';

export const ALERT_ACTIVATION = Object.freeze({
  key: 'activation',
  name: 'Alert Activation Governance Boundary',
  activation: false,
});

export default ALERT_ACTIVATION;
