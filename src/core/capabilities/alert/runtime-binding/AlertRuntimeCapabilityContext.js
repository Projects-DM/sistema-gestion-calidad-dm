/**
 * AlertRuntimeCapabilityContext
 *
 * Sprint 178 — Builds the capability context available to Runtime.
 *
 * Context ONLY. Never executes or binds independently.
 */

export function buildRuntimeCapabilityContext(request) {
  if (!request) {
    return Object.freeze({
      moduleId: null,
      capability: null,
      targets: [],
      available: false,
      reasons: ['missing-capability-context'],
    });
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      moduleId: request.moduleId || request.module || null,
      capability: null,
      targets: [],
      available: false,
      reasons: ['capability-not-assigned'],
    });
  }

  const requestedTargets = Array.isArray(request.targets) ? request.targets : [];
  const allowedTargets = ['dynamicForms', 'dynamicRecords', 'documentRepository'];
  const targets = requestedTargets.filter((t) => allowedTargets.includes(t));
  const targetSupported = request.target === undefined || allowedTargets.includes(request.target);

  if (!targetSupported) {
    return Object.freeze({
      moduleId: request.moduleId || request.module || null,
      capability: null,
      targets,
      available: false,
      reasons: ['unsupported-target'],
    });
  }

  return Object.freeze({
    moduleId: request.moduleId || request.module || null,
    capability: Object.freeze({
      key: 'alerts',
      experience: 'alert-monitoring',
      available: true,
    }),
    targets,
    available: true,
    reasons: [],
  });
}

export default buildRuntimeCapabilityContext;
