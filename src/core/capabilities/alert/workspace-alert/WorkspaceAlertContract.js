/**
 * WorkspaceAlertContract
 *
 * Sprint 204 — Alert Workspace Runtime Integration.
 *
 * THE single certified contract of the Workspace Alert integration. The only
 * official flow:
 *
 *   Consumption Entry  →  Workspace Alert Card
 *
 * The Workspace consumes ONLY the certified Consumption objects. It never
 * evaluates, interprets or modifies. This is an immutable declarative
 * contract: NO logic, NO state, NO evaluation.
 *
 * Contract ONLY. Never executes, notifies or persists.
 */

export const WORKSPACE_ALERT_VERSION = '204.1';

export const WORKSPACE_ALERT_CONSUMED_FIELDS = Object.freeze([
  'descriptor.message',
  'descriptor.priority',
  'evaluation.status',
  'evaluation.severity',
  'evaluation.remaining',
  'evaluation.nextDue',
  'evaluation.transition',
  'evaluation.overdue',
  'evaluation.escalation',
]);

export const WORKSPACE_ALERT_FORBIDDEN_FIELDS = Object.freeze([
  'configuration',
  'runtimeContext',
  'AlertTemporalState',
  'Strategy',
  'Policy',
  'Resolver',
  'Metadata',
]);

export const WorkspaceAlertContract = Object.freeze({
  contractKey: 'alert.workspace-alert',
  name: 'Alert Workspace Runtime Integration Contract',
  version: WORKSPACE_ALERT_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  input: 'consumption-entry',
  output: 'workspace-alert-card',
  consumes: 'consumption-layer',
  consumedFields: WORKSPACE_ALERT_CONSUMED_FIELDS,
  never: WORKSPACE_ALERT_FORBIDDEN_FIELDS,
  singleFlow: Object.freeze({
    evaluationEngine: 'evaluation-engine',
    consumptionLayer: 'consumption-layer',
    workspace: 'workspace',
    direction: Object.freeze([
      'evaluation-engine',
      'consumption-layer',
      'workspace',
    ]),
  }),
});

export const ALERT_WORKSPACE_ALERT = Object.freeze({
  key: 'workspace-alert',
  name: 'Alert Workspace Runtime Integration',
  integration: true,
  creation: false,
  evaluation: false,
});

export default WorkspaceAlertContract;