/**
 * ActivationBoundary
 *
 * Sprint 160 — Protects the capability from direct runtime
 * activation.
 *
 * Path: Capability → Governed Activation → Future Runtime Enablement.
 * Capability NEVER activates itself directly.
 */

export const ACTIVATION_BOUNDARY = Object.freeze({
  key: 'activation-boundary',
  name: 'Alert Activation Boundary',
  protectedPath: Object.freeze([
    'Capability',
    'Governed Activation',
    'Future Runtime Enablement',
  ]),
  forbiddenPath: Object.freeze([
    'Capability',
    'Direct Runtime Activation',
  ]),
});

export default ACTIVATION_BOUNDARY;
