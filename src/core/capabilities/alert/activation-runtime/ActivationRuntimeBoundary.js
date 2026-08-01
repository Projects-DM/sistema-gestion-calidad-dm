/**
 * ActivationRuntimeBoundary
 *
 * Sprint 167 — Protects the runtime from direct enablement after
 * approval.
 *
 * Path: Approved Activation → Future Runtime Exposure. An approval
 * NEVER triggers direct runtime execution.
 */

export const ACTIVATION_RUNTIME_BOUNDARY = Object.freeze({
  key: 'activation-runtime-boundary',
  name: 'Alert Activation Runtime Boundary',
  protectedPath: Object.freeze([
    'Approved Activation',
    'Future Runtime Exposure',
  ]),
  forbiddenPath: Object.freeze([
    'Approval',
    'Direct Runtime Execution',
  ]),
});

export default ACTIVATION_RUNTIME_BOUNDARY;
