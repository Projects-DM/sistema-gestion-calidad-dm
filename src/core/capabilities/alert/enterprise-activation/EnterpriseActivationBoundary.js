/**
 * EnterpriseActivationBoundary
 *
 * Sprint 179 — Protects the existing runtime pipeline from capability-driven
 * automatic execution.
 *
 * Path: Capability → Core Registries → Existing Pipeline → Consumption.
 * Activation is declarative registration ONLY. Execution stays controlled.
 */

export const ENTERPRISE_ACTIVATION_BOUNDARY = Object.freeze({
  key: 'enterprise-activation-boundary',
  name: 'Alert Enterprise Activation Boundary',
  protectedPath: Object.freeze([
    'Capability',
    'Core Registries',
    'Existing Pipeline',
    'Consumption',
  ]),
  forbiddenPath: Object.freeze([
    'Capability',
    'Automatic Execution',
  ]),
});

export default ENTERPRISE_ACTIVATION_BOUNDARY;
