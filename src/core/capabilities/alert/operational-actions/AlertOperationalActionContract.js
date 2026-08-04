/**
 * AlertOperationalActionContract
 *
 * Sprint 208 — Alert Operational Actions Integration.
 *
 * THE single certified contract of the Operational Actions integration. The
 * only official flow:
 *
 *   Consumption Entry + User Action  →  Operational Action Request
 *
 * Operational Actions consume ONLY the certified Consumption objects
 * (`{ descriptor, evaluation }`) plus the transported user intent (action,
 * performedBy, timestamp, comment, reason). They never evaluate, interpret,
 * recalculate or decide. This is an immutable declarative contract: NO logic,
 * NO state, NO evaluation, NO eventing, NO runtime mutation.
 *
 * Contract ONLY. Never executes, notifies, schedules or persists on its own.
 */

export const OPERATIONAL_ACTIONS_VERSION = '208.1';

export const OPERATIONAL_ACTION_TYPES = Object.freeze([
  'ACKNOWLEDGE',
  'DISMISS',
  'POSTPONE',
  'RESOLVE',
  'REOPEN',
  'ESCALATE',
]);

export const ALERT_OPERATIONAL_ACTION_CONSUMED_FIELDS = Object.freeze([
  'descriptor.id',
  'descriptor.message',
  'evaluation.status',
  'evaluation.severity',
  'evaluation.remaining',
  'evaluation.transition',
  'evaluation.nextDue',
  'evaluation.escalation',
]);

export const ALERT_OPERATIONAL_ACTION_FORBIDDEN_FIELDS = Object.freeze([
  'Runtime',
  'RuntimeContext',
  'Metadata',
  'Strategy',
  'Policy',
  'Resolver',
  'AlertConfiguration',
  'AlertTemporalState',
  'AlertEvaluation',
]);

export const AlertOperationalActionContract = Object.freeze({
  contractKey: 'alert.operational-actions',
  name: 'Alert Operational Actions Integration Contract',
  version: OPERATIONAL_ACTIONS_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  input: 'consumption-entry',
  output: 'operational-action-request',
  consumes: 'consumption-layer',
  actionTypes: OPERATIONAL_ACTION_TYPES,
  consumedFields: ALERT_OPERATIONAL_ACTION_CONSUMED_FIELDS,
  never: ALERT_OPERATIONAL_ACTION_FORBIDDEN_FIELDS,
  singleFlow: Object.freeze({
    evaluationEngine: 'evaluation-engine',
    consumptionLayer: 'consumption-layer',
    operationalActions: 'operational-actions',
    direction: Object.freeze([
      'evaluation-engine',
      'consumption-layer',
      'operational-actions',
    ]),
  }),
});

export const ALERT_OPERATIONAL_ACTIONS = Object.freeze({
  key: 'operational-actions',
  name: 'Alert Operational Actions Integration',
  integration: true,
  creation: false,
  evaluation: false,
  eventing: false,
  runtimeMutation: false,
});

export default AlertOperationalActionContract;