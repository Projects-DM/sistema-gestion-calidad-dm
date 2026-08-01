/**
 * EcosystemBoundary
 *
 * Sprint 165 — Protects the SGC-DM platform from capability-driven
 * mutation.
 *
 * Path: Alert Capability → SGC-DM Platform → Future Operational
 * Layer. Capability NEVER mutates the platform directly.
 */

export const ECOSYSTEM_BOUNDARY = Object.freeze({
  key: 'ecosystem-boundary',
  name: 'Alert Ecosystem Boundary',
  protectedPath: Object.freeze([
    'Alert Capability',
    'SGC-DM Platform',
    'Future Operational Layer',
  ]),
  forbiddenPath: Object.freeze([
    'Capability',
    'Platform Mutation',
  ]),
});

export default ECOSYSTEM_BOUNDARY;
