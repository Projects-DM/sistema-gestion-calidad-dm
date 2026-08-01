/**
 * Alert Experience Exposure
 *
 * Sprint 177 — Exposes the Alert Capability within the existing
 * module configuration administration.
 *
 * Exposure ONLY. Reuses existing Module Administration. Never
 * executes or renders independent UI.
 */

import { provideAlertExperiences } from './AlertExperienceExposureProvider.js';
import { resolveExperienceExposure } from './AlertExperienceExposureResolver.js';
import { EXPERIENCE_EXPOSURE_BOUNDARY } from './ExperienceExposureBoundary.js';

export { AlertExperienceExposureContract, EXPERIENCE_EXPOSURE_VERSION } from './AlertExperienceExposureContract.js';
export { provideAlertExperiences, ALERT_EXPERIENCE_ENTRY } from './AlertExperienceExposureProvider.js';
export { resolveExperienceExposure } from './AlertExperienceExposureResolver.js';
export { EXPERIENCE_EXPOSURE_BOUNDARY } from './ExperienceExposureBoundary.js';

export function requestExperienceExposure(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      experienceKey: null,
      visible: false,
      assignable: false,
      runtimeAvailable: false,
      rejected: true,
      reason: 'missing-capability-context',
    });
  }

  const exposure = resolveExperienceExposure(request);
  const experiences = provideAlertExperiences(request);

  if (!exposure.available) {
    return Object.freeze({
      capabilityKey: 'alerts',
      module: request.module || request.moduleId || null,
      visible: false,
      assignable: false,
      runtimeAvailable: false,
      rejected: exposure.reasons.includes('experience-not-found'),
      reason: exposure.reasons[0],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    experienceKey: 'alert-monitoring',
    label: 'Alert Monitoring',
    module: request.module || request.moduleId || null,
    visible: true,
    assignable: true,
    runtimeAvailable: true,
    rejected: false,
    experiences,
    boundary: EXPERIENCE_EXPOSURE_BOUNDARY,
  });
}

export const ALERT_EXPERIENCE_EXPOSURE = Object.freeze({
  key: 'experience-exposure',
  name: 'Alert Experience Exposure',
  execution: false,
});

export default ALERT_EXPERIENCE_EXPOSURE;
