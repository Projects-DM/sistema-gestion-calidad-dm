/**
 * ExperienceExposureBoundary
 *
 * Sprint 177 — Protects the administrative configuration from
 * exposure-driven execution.
 *
 * Path: Experience Exposure → Application Configuration → Runtime.
 * Exposure NEVER triggers execution.
 */

export const EXPERIENCE_EXPOSURE_BOUNDARY = Object.freeze({
  key: 'experience-exposure-boundary',
  name: 'Alert Experience Exposure Boundary',
  protectedPath: Object.freeze([
    'Configuration',
    'Capability Exposure',
    'Runtime',
  ]),
  forbiddenPath: Object.freeze([
    'Exposure',
    'Execution',
  ]),
});

export default EXPERIENCE_EXPOSURE_BOUNDARY;
