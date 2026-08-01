/**
 * ControlledActivationBoundary
 *
 * Sprint 163 — Protects the activation path from direct runtime
 * enablement.
 *
 * Path: Activation Intent → Governed Validation → Future Activation
 * Runtime. An activation request NEVER enables the runtime directly.
 */

export const CONTROLLED_ACTIVATION_BOUNDARY = Object.freeze({
  key: 'controlled-activation-boundary',
  name: 'Alert Controlled Activation Boundary',
  protectedPath: Object.freeze([
    'Activation Intent',
    'Governed Validation',
    'Future Activation Runtime',
  ]),
  forbiddenPath: Object.freeze([
    'Activation Request',
    'Direct Runtime Enablement',
  ]),
});

export default CONTROLLED_ACTIVATION_BOUNDARY;
