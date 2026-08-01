/**
 * AlertRenderingBoundary
 *
 * Sprint 174 — Protects the dynamic runtime from capability-driven
 * independent UI.
 *
 * Path: Alert Capability → Dynamic Runtime → Existing Renderers.
 * Capability NEVER renders independent UI.
 */

export const ALERT_RENDERING_BOUNDARY = Object.freeze({
  key: 'alert-rendering-boundary',
  name: 'Alert Rendering Boundary',
  protectedPath: Object.freeze([
    'Alert Capability',
    'Dynamic Runtime',
    'Existing Renderers',
  ]),
  forbiddenPath: Object.freeze([
    'Capability',
    'UI independiente',
  ]),
});

export default ALERT_RENDERING_BOUNDARY;
