/**
 * AlertExperienceResolver
 *
 * Sprint 176 — Resolves experience availability within a module.
 *
 * Resolution ONLY. Never renders or executes.
 */

export const SUPPORTED_EXPERIENCE_TARGETS = Object.freeze([
  'dynamicForms',
  'dynamicRecords',
  'documentRepository',
]);

export function resolveAlertExperience(request) {
  if (!request) {
    return Object.freeze({
      module: null,
      capabilityKey: 'alerts',
      experience: null,
      resolved: false,
      available: false,
      reasons: ['missing-experience-context'],
    });
  }

  const moduleAssigned = request.moduleAssigned === true && request.capability === 'alerts';
  const experienceValid = request.experienceKey === 'alert-monitoring';
  const requestedTargets = Array.isArray(request.targets) ? request.targets : [];
  const targets = requestedTargets.filter((t) => SUPPORTED_EXPERIENCE_TARGETS.includes(t));
  const targetSupported = request.target === undefined || SUPPORTED_EXPERIENCE_TARGETS.includes(request.target);

  const resolved = moduleAssigned && experienceValid && targetSupported;

  return Object.freeze({
    module: request.module || null,
    capabilityKey: 'alerts',
    experience: experienceValid ? 'alert-monitoring' : null,
    targets,
    resolved,
    available: resolved,
    reasons: resolved
      ? []
      : [
          ...(moduleAssigned ? [] : ['capability-not-assigned']),
          ...(experienceValid ? [] : ['experience-not-found']),
          ...(targetSupported ? [] : ['unsupported-target']),
        ],
  });
}

export default resolveAlertExperience;
