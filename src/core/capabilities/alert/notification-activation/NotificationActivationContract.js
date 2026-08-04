/**
 * NotificationActivationContract
 *
 * Sprint 206 — Alert Notification Activation.
 *
 * THE single certified contract for the Notification activation. The only
 * official flow:
 *
 *   Consumption Entry → Notification Request
 *
 * The Notification layer NEVER decides WHEN to execute (that decision was
 * already made by the Runtime / Evaluation Engine / Consumption Layer) — it
 * only consumes the result. This is an immutable declarative contract:
 * NO logic, NO state, NO evaluation, NO eventing.
 *
 * Contract ONLY. Never executes, notifies or persists.
 */

export const NOTIFICATION_ACTIVATION_VERSION = '206.1';

export const NOTIFICATION_ACTIVATION_CONSUMED_FIELDS = Object.freeze([
  'descriptor.message',
  'descriptor.priority',
  'evaluation.status',
  'evaluation.severity',
  'evaluation.remaining',
  'evaluation.nextDue',
  'evaluation.transition',
  'evaluation.overdue',
  'evaluation.escalation',
  'configuration.notification',
]);

export const NOTIFICATION_ACTIVATION_FORBIDDEN_FIELDS = Object.freeze([
  'Runtime',
  'Strategy',
  'Policy',
  'Resolver',
  'Metadata',
  'AlertTemporalState',
  'AlertEvaluationEngine',
]);

export const NotificationActivationContract = Object.freeze({
  contractKey: 'alert.notification-activation',
  name: 'Alert Notification Activation Contract',
  version: NOTIFICATION_ACTIVATION_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  input: 'consumption-entry',
  output: 'notification-request',
  consumes: 'consumption-layer',
  consumesNotificationConfig: true,
  consumedFields: NOTIFICATION_ACTIVATION_CONSUMED_FIELDS,
  never: NOTIFICATION_ACTIVATION_FORBIDDEN_FIELDS,
  singleFlow: Object.freeze({
    evaluationEngine: 'evaluation-engine',
    consumptionLayer: 'consumption-layer',
    notification: 'notification',
    direction: Object.freeze([
      'evaluation-engine',
      'consumption-layer',
      'notification',
    ]),
  }),
});

export const ALERT_NOTIFICATION_ACTIVATION = Object.freeze({
  key: 'notification-activation',
  name: 'Alert Notification Activation',
  integration: true,
  creation: false,
  evaluation: false,
  eventing: false,
});

export default NotificationActivationContract;