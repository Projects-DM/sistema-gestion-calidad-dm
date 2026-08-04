/**
 * AlertLifecycleContract
 *
 * Sprint 207 — Alert Lifecycle Persistence Integration.
 *
 * THE single certified contract of the Lifecycle Persistence integration. The
 * only official flow:
 *
 *   Consumption Entry  →  Lifecycle Record
 *
 * The Lifecycle consumes ONLY the certified Consumption objects
 * (`{ descriptor, evaluation }`) to persist the operational history. It never
 * evaluates, interprets, recalculates or decides. This is an immutable
 * declarative contract: NO logic, NO state, NO evaluation, NO eventing.
 *
 * Contract ONLY. Never executes, notifies, schedules or persists on its own.
 */

export const ALERT_LIFECYCLE_VERSION = '207.1';

export const ALERT_LIFECYCLE_CONSUMED_FIELDS = Object.freeze([
  'descriptor.id',
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

export const ALERT_LIFECYCLE_FORBIDDEN_FIELDS = Object.freeze([
  'RuntimeContext',
  'Metadata',
  'Strategy',
  'Policy',
  'Resolver',
  'AlertTemporalState',
  'AlertConfiguration',
]);

export const AlertLifecycleContract = Object.freeze({
  contractKey: 'alert.lifecycle',
  name: 'Alert Lifecycle Persistence Integration Contract',
  version: ALERT_LIFECYCLE_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  input: 'consumption-entry',
  output: 'lifecycle-record',
  consumes: 'consumption-layer',
  consumedFields: ALERT_LIFECYCLE_CONSUMED_FIELDS,
  never: ALERT_LIFECYCLE_FORBIDDEN_FIELDS,
  singleFlow: Object.freeze({
    evaluationEngine: 'evaluation-engine',
    consumptionLayer: 'consumption-layer',
    lifecycle: 'lifecycle',
    direction: Object.freeze([
      'evaluation-engine',
      'consumption-layer',
      'lifecycle',
    ]),
  }),
});

export const ALERT_LIFECYCLE = Object.freeze({
  key: 'lifecycle',
  name: 'Alert Lifecycle Persistence Integration',
  integration: true,
  creation: false,
  evaluation: false,
  eventing: false,
  persistence: true,
});

export default AlertLifecycleContract;