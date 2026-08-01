/**
 * Alert Activation Runtime
 *
 * Sprint 167 — Controlled activation implementation boundary.
 *
 * FIRST LEVEL 4 PHASE. Executes pure validation and governance
 * decisions for controlled activation. NO runtime exposure, NO
 * registry mutation, NO events.
 */

export { ControlledActivationService, requestActivation } from './ControlledActivationService.js';
export { validateActivation, ACTIVATION_VALIDATION } from './ActivationValidator.js';
export { decideActivation } from './ActivationDecision.js';
export { ACTIVATION_RUNTIME_BOUNDARY } from './ActivationRuntimeBoundary.js';

export const ALERT_ACTIVATION_RUNTIME = Object.freeze({
  key: 'activation-runtime',
  name: 'Alert Controlled Activation Runtime',
  execution: false,
  runtimeExposure: false,
});

export default ALERT_ACTIVATION_RUNTIME;
