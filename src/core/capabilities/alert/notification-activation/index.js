/**
 * Alert Notification Activation
 *
 * Sprint 206 — Alert Notification Activation (LEVEL 5, notification only).
 *
 * Activates the operational behavior of the Alert Capability: automatic
 * execution of the notification actions defined in the metadata
 * (`alertConfiguration.notification`), reusing the certified pipeline:
 *
 *   Runtime → Evaluation Engine → Consumption Layer → Notification Activation
 *   → Notification Adapter → Notification Provider
 *
 * The Notification NEVER decides when to execute — that decision was already
 * made by the Runtime/Evaluation/Consumption. It only consumes the result.
 *
 * Components (all frozen after this Sprint):
 *   1. NotificationActivationProvider — reads only certified Consumption entries.
 *   2. NotificationActivationAdapter  — Consumption Entry → Notification Request.
 *   3. NotificationActivationBoundary — official frontier Consumption ↓ Notification.
 *   4. NotificationActivationContract — single contract Entry → Request.
 */

export {
  NotificationActivationContract,
  NOTIFICATION_ACTIVATION_VERSION,
  NOTIFICATION_ACTIVATION_CONSUMED_FIELDS,
  NOTIFICATION_ACTIVATION_FORBIDDEN_FIELDS,
  ALERT_NOTIFICATION_ACTIVATION,
} from './NotificationActivationContract.js';

export {
  NOTIFICATION_ACTIVATION_BOUNDARY,
  ALERT_NOTIFICATION_ACTIVATION_BOUNDARY,
} from './NotificationActivationBoundary.js';

export {
  notificationActivationAdapter,
  adaptNotificationRequest,
} from './NotificationActivationAdapter.js';

export {
  notificationActivationProvider,
  provideNotificationRequests,
} from './NotificationActivationProvider.js';

export const ALERT_NOTIFICATION_ACTIVATION_LAYER = Object.freeze({
  key: 'notification-activation',
  name: 'Alert Notification Activation Layer',
  version: '206',
  capabilityKey: 'alerts',
  layer: 'integration',
  consumes: 'consumption-layer',
  produces: 'notification-request',
  integrationOnly: true,
  creation: false,
  evaluation: false,
  eventing: false,
});

export default ALERT_NOTIFICATION_ACTIVATION_LAYER;