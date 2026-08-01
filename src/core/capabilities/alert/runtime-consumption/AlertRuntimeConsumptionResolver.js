/**
 * AlertRuntimeConsumptionResolver
 *
 * Sprint 180 — Resolves which existing consumers can consume the
 * Alert Capability for a module.
 *
 * Resolution ONLY. Never executes.
 */

export const SUPPORTED_CONSUMERS = Object.freeze([
  'dynamicForms',
  'dynamicRecords',
  'documentRepository',
  'dashboard',
]);

export function resolveRuntimeConsumption(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      resolved: false,
      available: false,
      consumers: [],
      reasons: ['missing-consumption-context'],
    });
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      capabilityKey: 'alerts',
      resolved: false,
      available: false,
      consumers: [],
      module: request.moduleId || request.module || null,
      reasons: ['capability-not-assigned'],
    });
  }

  const requestedTargets = Array.isArray(request.targets) ? request.targets : SUPPORTED_CONSUMERS;
  const consumers = requestedTargets.filter((t) => SUPPORTED_CONSUMERS.includes(t));
  const targetSupported = request.target === undefined || SUPPORTED_CONSUMERS.includes(request.target);

  if (!targetSupported) {
    return Object.freeze({
      capabilityKey: 'alerts',
      resolved: false,
      available: false,
      consumers: [],
      module: request.moduleId || request.module || null,
      reasons: ['unsupported-target'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    resolved: true,
    available: true,
    module: request.moduleId || request.module || null,
    consumers,
    reasons: [],
  });
}

export default resolveRuntimeConsumption;
