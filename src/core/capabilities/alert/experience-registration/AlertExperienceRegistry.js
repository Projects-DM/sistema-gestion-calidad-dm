/**
 * AlertExperienceRegistry
 *
 * Sprint 176 — Registers the operational experience within the
 * ecosystem.
 *
 * Registration preparation ONLY. The existing
 * OperationalExperienceRegistry core is never modified.
 */

export function registerAlertExperience(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      experienceKey: null,
      registered: false,
      available: false,
      reasons: ['missing-experience-context'],
    });
  }

  const capabilityRegistered = request.capability === 'alerts';
  const experienceValid = request.experienceKey === 'alert-monitoring';

  if (!capabilityRegistered) {
    return Object.freeze({
      capabilityKey: 'alerts',
      experienceKey: null,
      registered: false,
      available: false,
      reasons: ['capability-not-registered'],
    });
  }

  if (!experienceValid) {
    return Object.freeze({
      capabilityKey: 'alerts',
      experienceKey: null,
      registered: false,
      available: false,
      reasons: ['experience-not-found'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    experienceKey: 'alert-monitoring',
    registered: true,
    available: true,
    module: request.module || null,
    reasons: [],
  });
}

export default registerAlertExperience;
