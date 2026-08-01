/**
 * AlertWorkspaceContract
 *
 * Sprint 181 (iteración 2) — Defines the Alert Monitoring Operational
 * Workspace contract.
 *
 * Workspace is an Operational Context Center. It NEVER administers data,
 * NEVER executes rules and has NO own CRUD.
 */

export const WORKSPACE_VERSION = 1;

export const AlertWorkspaceContract = Object.freeze({
  contractKey: 'alert.workspace',
  version: 1,
  capabilityKey: 'alerts',
  workspaceType: 'operational-workspace',
  executionEnabled: false,
  navigationEnabled: true,
});

export default AlertWorkspaceContract;
