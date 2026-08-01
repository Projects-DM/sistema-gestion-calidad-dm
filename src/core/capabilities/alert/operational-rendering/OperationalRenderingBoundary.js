/**
 * OperationalRenderingBoundary
 *
 * Sprint 175 — Protects existing renderers from capability-driven
 * parallel rendering.
 *
 * Path: Capability → Runtime → Existing Renderers.
 * Capability NEVER creates a new rendering engine.
 */

export const OPERATIONAL_RENDERING_BOUNDARY = Object.freeze({
  key: 'operational-rendering-boundary',
  name: 'Alert Operational Rendering Boundary',
  protectedPath: Object.freeze([
    'Capability',
    'Runtime',
    'Existing Renderers',
  ]),
  forbiddenPath: Object.freeze([
    'Capability',
    'New Rendering Engine',
  ]),
});

export default OPERATIONAL_RENDERING_BOUNDARY;
