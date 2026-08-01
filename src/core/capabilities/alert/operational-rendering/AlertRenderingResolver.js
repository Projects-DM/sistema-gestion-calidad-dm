/**
 * AlertRenderingResolver
 *
 * Sprint 175 — Determines where the Alert Capability can exist.
 *
 * Resolution ONLY. Never renders or executes.
 */

export const SUPPORTED_RESOLUTION_TARGETS = Object.freeze(['forms', 'records', 'documents']);

export function resolveAlertRendering(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      module: null,
      targets: [],
      resolved: false,
      reasons: ['missing-capability-context'],
    });
  }

  const capabilityAssigned = request.capability === 'alerts' && request.moduleAssigned === true;
  const requestedTargets = Array.isArray(request.targets) ? request.targets : [];
  const targets = requestedTargets.filter((t) => SUPPORTED_RESOLUTION_TARGETS.includes(t));

  const resolved = capabilityAssigned && targets.length > 0;

  return Object.freeze({
    capabilityKey: 'alerts',
    module: request.module || null,
    targets,
    resolved,
    reasons: resolved
      ? []
      : [
          ...(capabilityAssigned ? [] : ['capability-not-assigned']),
          ...(targets.length > 0 ? [] : ['no-supported-targets']),
        ],
  });
}

export default resolveAlertRendering;
