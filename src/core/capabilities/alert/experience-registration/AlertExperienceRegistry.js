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
      registered: false,
      experienceAvailable: false,
      reasons: ['missing-experience-context'],
    });
  }

  const capabilityRegistered = request.capability === 'alerts';
  const experienceValid = request.experienceKey === 'alert-monitoring';

  if (!capabilityRegistered) {
    return Object.freeze({
      capabilityKey: 'alerts',
      registered: false,
      experienceAvailable: false,
      reasons: ['capability-not-registered'],
    });
  }

  if (!experienceValid) {
    return Object.freeze({
      capabilityKey: 'alerts',
      registered: false,
      experienceAvailable: false,
      reasons: ['experience-not-found'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    registered: true,
    experienceAvailable: true,
    experienceKey: 'alert-monitoring',
    module: request.module || null,
    reasons: [],
  });
}

export default registerAlertExperience;
