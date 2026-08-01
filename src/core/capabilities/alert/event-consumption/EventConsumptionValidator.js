/**
 * EventConsumptionValidator
 *
 * Sprint 170 — Executes event consumption validations ONLY.
 *
 * Pure, deterministic validation. Never subscribes, handles or
 * processes events. Returns a validation result object.
 */

export const EVENT_CONSUMPTION_VALIDATION = Object.freeze({
  capabilityKey: 'alerts',
  checks: Object.freeze(['runtimeExposureApproved', 'eventCompatible', 'capabilityEnabled', 'consumptionAllowed']),
});

export function validateEventConsumption(request) {
  const runtimeExposureApproved = !!request && request.runtimeExposureApproved === true;
  const eventCompatible = !!request && request.eventContractVersion === '1';
  const capabilityEnabled = !!request && request.capabilityEnabled === true;
  const consumptionAllowed = !!request && request.consumptionAllowed !== true;

  const checks = {
    runtimeExposureApproved,
    eventCompatible,
    capabilityEnabled,
    consumptionAllowed,
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

export default validateEventConsumption;
