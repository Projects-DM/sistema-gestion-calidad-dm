/**
 * RuntimeExposureValidator
 *
 * Sprint 169 — Executes runtime exposure validations ONLY.
 *
 * Pure, deterministic validation. Never activates or executes the
 * runtime. Returns a validation result object.
 */

export const RUNTIME_EXPOSURE_VALIDATION = Object.freeze({
  capabilityKey: 'alerts',
  checks: Object.freeze(['registryRegistered', 'activationApproved', 'runtimeCompatible', 'exposureAllowed']),
});

export function validateRuntimeExposure(request) {
  const registryRegistered = !!request && request.registryRegistered === true;
  const activationApproved = !!request && request.activationDecision === 'approved';
  const runtimeCompatible = !!request && request.runtimeCompatible === true;
  const exposureAllowed = !!request && request.visible !== true;

  const checks = {
    registryRegistered,
    activationApproved,
    runtimeCompatible,
    exposureAllowed,
  };

  return Object.freeze({
    capabilityKey: 'alerts',
    valid: Object.values(checks).every(Boolean),
    checks,
    reasons: Object.entries(checks)
      .filter(([, ok]) => !ok)
      .map(([name]) => name),
  });
}

export default validateRuntimeExposure;
