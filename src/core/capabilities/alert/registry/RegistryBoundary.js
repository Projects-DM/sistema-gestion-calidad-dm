/**
 * RegistryBoundary
 *
 * Sprint 161 — Protects the existing registry from direct mutation
 * by the capability.
 *
 * Path: Alert Capability → Registry Contract → Existing Registry.
 * Capability NEVER writes to the registry directly.
 */

export const REGISTRY_BOUNDARY = Object.freeze({
  key: 'registry-boundary',
  name: 'Alert Registry Boundary',
  protectedPath: Object.freeze([
    'Alert Capability',
    'Registry Contract',
    'Existing Registry',
  ]),
  forbiddenPath: Object.freeze([
    'Capability',
    'Direct Registry Mutation',
  ]),
});

export default REGISTRY_BOUNDARY;
