/**
 * ExperienceBoundary
 *
 * Sprint 176 — Protects the separation between experience
 * registration and runtime consumption.
 *
 * Path: Capability Metadata → Operational Experience → Runtime
 * Consumption. Experience registration NEVER triggers automatic
 * execution.
 */

export const EXPERIENCE_BOUNDARY = Object.freeze({
  key: 'experience-boundary',
  name: 'Alert Experience Boundary',
  protectedPath: Object.freeze([
    'Capability Metadata',
    'Operational Experience',
    'Runtime Consumption',
  ]),
  forbiddenPath: Object.freeze([
    'Experience Registration',
    'Automatic Execution',
  ]),
});

export default EXPERIENCE_BOUNDARY;
