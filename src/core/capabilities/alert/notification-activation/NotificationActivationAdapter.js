/**
 * NotificationActivationAdapter
 *
 * Sprint 206 — Alert Notification Activation.
 *
 * Adapts a certified Consumption entry `{ descriptor, evaluation }` plus the
 * transported `configuration.notification` intent into a Notification Request:
 *
 *   {
 *     title, message, priority, severity, recipients, channel,
 *     nextDue, transition, escalation
 *   }
 *
 * It NEVER calculates severity or due dates (they arrive precomputed), NEVER
 * interprets rules and NEVER reads metadata itself — the notification config
 * (`{ channel, recipients }`) is received as INPUT, already transported.
 *
 * Adapter ONLY. Never executes, never recomputes. AlertEvaluation stays
 * immutable (only read, never modified).
 */

import { mapEvaluationToConsumption } from '../evaluation/consumption/AlertConsumptionMapper.js';

export const NOTIFICATION_ACTIVATION_VERSION = '206.1';

/**
 * Maps a certified Consumption entry + notification intent into a Notification
 * Request. Pure passthrough of already-computed state + the delivered channel
 * and recipients.
 *
 * @param {Object} input
 * @param {Object} [input.entry] { descriptor, evaluation } Consumption entry.
 * @param {Object} [input.notification] { channel, recipients } notification intent (transport).
 * @returns {Object} Frozen { provided, request }.
 */
export function adaptNotificationRequest({ entry, notification } = {}) {
  if (!entry || !entry.evaluation) {
    return Object.freeze({ provided: false, request: null, reasons: ['missing-consumption-entry'] });
  }
  if (!notification || typeof notification !== 'object') {
    return Object.freeze({ provided: false, request: null, reasons: ['missing-notification-config'] });
  }

  const consumption = mapEvaluationToConsumption(entry);

  const request = Object.freeze({
    title: `Alerta ${consumption.priorityLabel || 'Media'}`,
    message: consumption.message,
    priority: consumption.priority,
    severity: consumption.severity,
    recipients: Array.isArray(notification.recipients) ? Object.freeze([...notification.recipients]) : Object.freeze([]),
    channel: notification.channel || 'none',
    nextDue: consumption.nextDue,
    transition: consumption.transition,
    escalation: consumption.escalation,
  });

  return Object.freeze({
    provided: true,
    request,
    reasons: [],
  });
}

export const notificationActivationAdapter = Object.freeze({
  key: 'notification-activation-adapter',
  name: 'Alert Notification Adapter',
  version: NOTIFICATION_ACTIVATION_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  produces: 'notification-request',
  computes: false,
  interprets: false,
  queriesMetadata: false,
  adapt: adaptNotificationRequest,
});

export default notificationActivationAdapter;