/**
 * RegistryDecision
 *
 * Sprint 168 — Produces the controlled registration decision.
 *
 * Pure decision logic based on validation results. Never mutates the
 * registry, resolver or runtime.
 */

export function decideRegistryRegistration(validation) {
  if (!validation || validation.valid !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      registered: false,
      runtimeExposure: false,
      resolverMutation: false,
      reasons: validation && validation.reasons ? validation.reasons : ['validation-failed'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: 'approved',
    registered: true,
    runtimeExposure: false,
    resolverMutation: false,
    reasons: [],
  });
}

export default decideRegistryRegistration;
