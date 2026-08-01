/**
 * RegistryRuntimeBoundary
 *
 * Sprint 168 — Protects the runtime from registry-driven exposure.
 *
 * Path: Controlled Registration → Future Discovery Layer. A
 * registration NEVER triggers runtime exposure.
 */

export const REGISTRY_RUNTIME_BOUNDARY = Object.freeze({
  key: 'registry-runtime-boundary',
  name: 'Alert Registry Runtime Boundary',
  protectedPath: Object.freeze([
    'Controlled Registration',
    'Future Discovery Layer',
  ]),
  forbiddenPath: Object.freeze([
    'Registration',
    'Runtime Exposure',
  ]),
});

export default REGISTRY_RUNTIME_BOUNDARY;
