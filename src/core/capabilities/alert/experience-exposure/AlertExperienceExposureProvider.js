/**
 * AlertExperienceExposureProvider
 *
 * Sprint 177 — Provides available experiences to the administrative
 * system.
 *
 * Provision ONLY. Never evaluates, executes or renders.
 */

export const ALERT_EXPERIENCE_ENTRY = Object.freeze({
  capabilityKey: 'alerts',
  experienceKey: 'alert-monitoring',
  label: 'Alert Monitoring',
  available: true,
});

export function provideAlertExperiences(request) {
  if (!request) {
    return Object.freeze([]);
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;
  const experienceValid = !request.experienceKey || request.experienceKey === 'alert-monitoring';

  if (!capabilityValid || !moduleAssigned || !experienceValid) {
    return Object.freeze([]);
  }

  return Object.freeze([
    Object.freeze({
      experienceKey: 'alert-monitoring',
      label: 'Alert Monitoring',
      available: true,
      module: request.module || null,
    }),
  ]);
}

export default provideAlertExperiences;
