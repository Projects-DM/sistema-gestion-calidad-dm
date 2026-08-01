/**
 * AlertExperienceExposureResolver
 *
 * Sprint 177 — Resolves the available experiences for a module.
 *
 * Resolution ONLY. Never renders or executes.
 */

export function resolveExperienceExposure(request) {
  if (!request) {
    return Object.freeze({
      available: false,
      experience: null,
      reasons: ['missing-capability-context'],
    });
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;
  const experienceValid = !request.experienceKey || request.experienceKey === 'alert-monitoring';

  if (!capabilityValid) {
    return Object.freeze({
      available: false,
      experience: null,
      reasons: ['capability-not-assigned'],
    });
  }

  if (!moduleAssigned) {
    return Object.freeze({
      available: false,
      experience: null,
      reasons: ['capability-not-assigned'],
    });
  }

  if (!experienceValid) {
    return Object.freeze({
      available: false,
      experience: null,
      reasons: ['experience-not-found'],
    });
  }

  return Object.freeze({
    available: true,
    experience: 'alert-monitoring',
    module: request.module || request.moduleId || null,
    reasons: [],
  });
}

export default resolveExperienceExposure;
