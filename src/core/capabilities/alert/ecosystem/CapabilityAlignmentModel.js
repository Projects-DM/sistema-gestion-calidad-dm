/**
 * CapabilityAlignmentModel
 *
 * Sprint 165 — Declares what the Alert Capability owns, consumes and
 * is forbidden from owning within the SGC-DM ecosystem.
 *
 * Governance declaration only.
 */

export const CAPABILITY_ALIGNMENT_MODEL = Object.freeze({
  capability: 'alerts',
  owns: Object.freeze([
    'Alert Contracts',
    'Alert Governance',
    'Alert Boundaries',
  ]),
  consumes: Object.freeze([
    'Core Runtime',
    'Capability Registry',
    'Security Model',
    'Existing Infrastructure',
  ]),
  forbiddenOwnership: Object.freeze([
    'Runtime Engine',
    'Persistence Layer',
    'Notification Providers',
  ]),
});

export default CAPABILITY_ALIGNMENT_MODEL;
