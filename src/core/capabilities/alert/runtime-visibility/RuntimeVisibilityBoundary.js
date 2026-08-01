/**
 * RuntimeVisibilityBoundary
 *
 * Sprint 181 — Defines the boundary of the Alert Runtime Visibility
 * layer.
 *
 * Boundary ONLY. Visualization reuses existing renderers. Never
 * creates modules, dashboards, engines, runtimes, notifications,
 * workflows, schedulers, storage or persistence.
 */

export const RUNTIME_VISIBILITY_BOUNDARY = Object.freeze({
  key: 'runtime-visibility-boundary',
  name: 'Alert Runtime Visibility Boundary',
  protectedPath: Object.freeze([
    'Runtime',
    'Runtime Context',
    'Existing Engines',
    'Existing Renderers',
  ]),
  forbiddenPath: Object.freeze([
    'Alert Module',
    'Alert Dashboard',
    'Alert Engine',
    'Alert Runtime',
    'Notification Center',
    'Workflow',
    'Scheduler',
    'Storage',
    'Persistence',
    'New Tables',
    'New Supabase',
  ]),
});

export default RUNTIME_VISIBILITY_BOUNDARY;
