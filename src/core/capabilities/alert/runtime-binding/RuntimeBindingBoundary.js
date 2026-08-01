/**
 * RuntimeBindingBoundary
 *
 * Sprint 178 — Protects existing engines from capability-driven
 * parallel runtime.
 *
 * Path: Capability → Runtime Context → Existing Engines.
 * Capability NEVER creates a new runtime.
 */

export const RUNTIME_BINDING_BOUNDARY = Object.freeze({
  key: 'runtime-binding-boundary',
  name: 'Alert Runtime Binding Boundary',
  protectedPath: Object.freeze([
    'Capability',
    'Runtime Context',
    'Existing Engines',
  ]),
  forbiddenPath: Object.freeze([
    'Capability',
    'New Runtime',
  ]),
});

export default RUNTIME_BINDING_BOUNDARY;
