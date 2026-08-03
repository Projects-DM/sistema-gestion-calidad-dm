/**
 * Alert Workspace — Runtime Integration
 *
 * Sprint 204 — Alert Workspace Runtime Integration (LEVEL 5, workspace only).
 *
 * Integrates the Alert Capability into the Workspace as the FIRST operational
 * consumer, reusing the certified pipeline:
 *
 *   Evaluation Engine → Consumption Layer → Workspace Integration → Workspace
 *
 * The Workspace NEVER interprets rules, NEVER calculates states and NEVER
 * evaluates alerts. It only REPRESENTS the result produced by the certified
 * Evaluation Engine + Consumption Layer.
 *
 * Components (all frozen after this Sprint):
 *   1. WorkspaceAlertProvider — obtains only certified Consumption objects.
 *   2. WorkspaceAlertAdapter  — { descriptor, evaluation } → Workspace ViewModel.
 *   3. WorkspaceAlertBoundary — official frontier Consumption ↓ Workspace.
 *   4. WorkspaceAlertContract — single contract Consumption Entry → Alert Card.
 */

export {
  WorkspaceAlertContract,
  WORKSPACE_ALERT_VERSION,
  WORKSPACE_ALERT_CONSUMED_FIELDS,
  WORKSPACE_ALERT_FORBIDDEN_FIELDS,
  ALERT_WORKSPACE_ALERT,
} from './WorkspaceAlertContract.js';

export {
  WORKSPACE_ALERT_BOUNDARY,
  ALERT_WORKSPACE_ALERT_BOUNDARY,
} from './WorkspaceAlertBoundary.js';

export {
  workspaceAlertAdapter,
  adaptWorkspaceAlert,
} from './WorkspaceAlertAdapter.js';

export {
  workspaceAlertProvider,
  provideWorkspaceAlerts,
} from './WorkspaceAlertProvider.js';

export const ALERT_WORKSPACE_ALERT_LAYER = Object.freeze({
  key: 'workspace-alert',
  name: 'Alert Workspace Runtime Integration Layer',
  version: '204',
  capabilityKey: 'alerts',
  layer: 'integration',
  consumes: 'consumption-layer',
  produces: 'workspace-view-model',
  integrationOnly: true,
  creation: false,
  evaluation: false,
});

export default ALERT_WORKSPACE_ALERT_LAYER;