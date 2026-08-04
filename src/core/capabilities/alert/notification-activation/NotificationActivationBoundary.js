/**
 * NotificationActivationBoundary
 *
 * Sprint 206 — Alert Notification Activation.
 *
 * Declares the official frontier between the Consumption Layer and the
 * Notification:
 *
 *   Consumption  ↓  Notification
 *
 * The Notification may consume ONLY the certified Consumption objects
 * (`{ descriptor, evaluation }`) plus the `configuration.notification`
 * transport (channel/recipients). It never crosses into Runtime, Evaluation
 * Engine, Strategy, Policy, Resolver, Metadata, AlertTemporalState or
 * configuration internals beyond the notification intent.
 *
 * Declarative boundary ONLY. No logic, no state, no eventing.
 */

import { NotificationActivationContract, NOTIFICATION_ACTIVATION_VERSION } from './NotificationActivationContract.js';

export const NOTIFICATION_ACTIVATION_BOUNDARY = Object.freeze({
  boundaryKey: 'alert.notification-activation.boundary',
  name: 'Alert Notification Activation Boundary',
  version: NOTIFICATION_ACTIVATION_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  upstream: 'consumption-layer',
  downstream: 'notification',
  consumesOnly: Object.freeze([
    'consumption-layer',
    'configuration.notification',
  ]),
  neverImports: Object.freeze([
    'runtime',
    'evaluation-engine',
    'strategy',
    'policy',
    'resolver',
    'operational-configuration',
    'metadata',
    'runtime-wiring',
    'runtime-activation',
    'workspace',
    'dashboard',
  ]),
  producesOnly: Object.freeze(['notification-request']),
  singleFlow: NotificationActivationContract.singleFlow,
});

export const ALERT_NOTIFICATION_ACTIVATION_BOUNDARY = Object.freeze({
  key: 'notification-activation',
  name: 'Alert Notification Activation Boundary',
  integration: true,
  creation: false,
  evaluation: false,
  eventing: false,
});

export default NOTIFICATION_ACTIVATION_BOUNDARY;