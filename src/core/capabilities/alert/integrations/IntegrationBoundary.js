/**
 * IntegrationBoundary
 *
 * Sprint 164 — Protects the capability from direct infrastructure
 * access by consumers.
 *
 * Path: Alert Capability → Integration Contract → External/Core
 * Consumers. Capability NEVER grants direct infrastructure access.
 */

export const INTEGRATION_BOUNDARY = Object.freeze({
  key: 'integration-boundary',
  name: 'Alert Integration Boundary',
  protectedPath: Object.freeze([
    'Alert Capability',
    'Integration Contract',
    'External/Core Consumers',
  ]),
  forbiddenPath: Object.freeze([
    'Capability',
    'Direct Infrastructure Access',
  ]),
});

export default INTEGRATION_BOUNDARY;
