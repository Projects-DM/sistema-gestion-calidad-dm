/**
 * AlertRuntimeBindingResolver
 *
 * Sprint 178 — Resolves whether the capability can participate in
 * Runtime.
 *
 * Resolution ONLY. Never executes.
 */

export function resolveRuntimeBinding(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      resolved: false,
      available: false,
      runtimeEnabled: false,
      executionEnabled: false,
      reasons: ['missing-capability-context'],
    });
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      capabilityKey: 'alerts',
      resolved: false,
      available: false,
      runtimeEnabled: false,
      executionEnabled: false,
      module: request.moduleId || request.module || null,
      reasons: ['capability-not-assigned'],
    });
  }

  const requestedTargets = Array.isArray(request.targets) ? request.targets : [];
  const allowedTargets = ['dynamicForms', 'dynamicRecords', 'documentRepository'];
  const targets = requestedTargets.filter((t) => allowedTargets.includes(t));
  const targetSupported = request.target === undefined || allowedTargets.includes(request.target);

  if (!targetSupported) {
    return Object.freeze({
      capabilityKey: 'alerts',
      resolved: false,
      available: false,
      runtimeEnabled: false,
      executionEnabled: false,
      module: request.moduleId || request.module || null,
      reasons: ['unsupported-target'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    resolved: true,
    available: true,
    runtimeEnabled: true,
    executionEnabled: false,
    module: request.moduleId || request.module || null,
    targets,
    reasons: [],
  });
}

export default resolveRuntimeBinding;
