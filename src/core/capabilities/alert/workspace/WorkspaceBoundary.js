/**
 * WorkspaceBoundary
 *
 * Sprint 181 (iteración 2) — Protects the architecture of the
 * Operational Workspace.
 *
 * Boundary ONLY. The Workspace reuses existing engines and never
 * creates parallel components.
 */

export const WORKSPACE_BOUNDARY = Object.freeze({
  key: 'workspace-boundary',
  name: 'Alert Operational Workspace Boundary',
  protectedPath: Object.freeze([
    'Runtime Context',
    'Dynamic Forms',
    'Dynamic Records',
    'Document Repository',
    'Dashboard Provider',
    'Capability Assignment',
    'Module Resolver',
    'Runtime Resolver',
    'Experience Registry',
  ]),
  forbiddenPath: Object.freeze([
    'Alert CRUD',
    'Alert Engine',
    'Alert Module',
    'Alert Runtime',
    'Alert Repository',
    'Alert Persistence',
    'Notification Engine',
    'Scheduler',
    'Workflow Engine',
  ]),
});

export default WORKSPACE_BOUNDARY;
