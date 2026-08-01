/**
 * Alert Experience Registration
 *
 * Sprint 176 — Operational Experience registration and module
 * configuration discovery preparation.
 *
 * Integration preparation ONLY. Reuses the existing configuration
 * and runtime models. Never modifies the OperationalExperienceRegistry.
 */

import { buildAlertExperienceDescriptor } from './AlertExperienceDescriptor.js';
import { registerAlertExperience } from './AlertExperienceRegistry.js';
import { resolveAlertExperience } from './AlertExperienceResolver.js';
import { EXPERIENCE_BOUNDARY } from './ExperienceBoundary.js';

export { buildAlertExperienceDescriptor, ALERT_EXPERIENCE_DESCRIPTOR } from './AlertExperienceDescriptor.js';
export { registerAlertExperience } from './AlertExperienceRegistry.js';
export { resolveAlertExperience, SUPPORTED_EXPERIENCE_TARGETS } from './AlertExperienceResolver.js';
export { EXPERIENCE_BOUNDARY } from './ExperienceBoundary.js';

export function requestExperienceRegistration(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      registered: false,
      available: false,
      assigned: false,
      resolved: false,
      reasons: ['missing-experience-context'],
    });
  }

  const descriptor = buildAlertExperienceDescriptor(request);
  const registration = registerAlertExperience(request);
  const resolution = resolveAlertExperience(request);

  const valid = descriptor.valid && registration.registered && resolution.resolved;

  return Object.freeze({
    capabilityKey: 'alerts',
    experienceKey: 'alert-monitoring',
    module: request.module || null,
    decision: valid ? 'ready' : 'rejected',
    registered: registration.registered,
    available: registration.available && resolution.available,
    assigned: request.moduleAssigned === true && request.capability === 'alerts',
    resolved: resolution.resolved,
    available: resolution.available,
    targets: resolution.targets,
    executionAllowed: false,
    reasons: valid
      ? []
      : [...new Set([...descriptor.reasons, ...registration.reasons, ...resolution.reasons])],
    boundary: EXPERIENCE_BOUNDARY,
  });
}

export const ALERT_EXPERIENCE_REGISTRATION = Object.freeze({
  key: 'experience-registration',
  name: 'Alert Experience Registration',
  execution: false,
});

export default ALERT_EXPERIENCE_REGISTRATION;
