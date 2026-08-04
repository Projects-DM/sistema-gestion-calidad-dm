/**
 * NotificationActivationProvider
 *
 * Sprint 206 — Alert Notification Activation.
 *
 * Supplies the Notification exclusively with the certified CONSUMPTION
 * objects produced by the Consumption Layer (`evaluationEntries` — the
 * `{ descriptor, evaluation }` contract) plus the transported notification
 * intent. It never evaluates, never interprets and never modifies the
 * evaluated data; it only routes it to the Notification Activation Adapter to
 * produce Notification Requests.
 *
 * Provider ONLY. Never creates a Notification Engine, never computes, never
 * queries metadata.
 */

import { adaptNotificationRequest } from './NotificationActivationAdapter.js';

export const NOTIFICATION_ACTIVATION_VERSION = '206.1';

/**
 * Provides Notification Requests from the certified Consumption layer output.
 * Expects `request.evaluationEntries` (list of { descriptor, evaluation }) and
 * optionally per-entry `notification` intent. Returns an empty set when no
 * consumption output is present — it NEVER builds requests from rules or
 * descriptors directly.
 *
 * @param {Object} [request]
 * @param {Array} [request.evaluationEntries] Consumption { descriptor, evaluation } entries.
 * @param {Object|Array} [request.notification] Notification intent(s) to transport.
 * @returns {Object} Frozen Notification activation provider result.
 */
export function provideNotificationRequests(request = {}) {
  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      consumer: 'notification',
      capabilityKey: 'alerts',
      provider: false,
      consumed: false,
      available: false,
      requests: [],
      moduleId: request.moduleId || request.module || null,
      reasons: ['capability-not-assigned'],
    });
  }

  const entries = Array.isArray(request.evaluationEntries) ? request.evaluationEntries : [];
  const notification = request.notification;

  const requests = entries
    .map((entry) => {
      const intent = Array.isArray(notification) ? (notification[entries.indexOf(entry)] || notification[0]) : notification;
      return adaptNotificationRequest({ entry, notification: intent });
    })
    .filter((r) => r.provided === true)
    .map((r) => r.request);

  return Object.freeze({
    consumer: 'notification',
    capabilityKey: 'alerts',
    provider: true,
    consumed: true,
    available: true,
    moduleId: request.moduleId || request.module || null,
    requests: Object.freeze(requests),
    reasons: [],
  });
}

export const notificationActivationProvider = Object.freeze({
  key: 'notification-activation-provider',
  name: 'Alert Notification Activation Provider',
  version: NOTIFICATION_ACTIVATION_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  consumes: 'consumption-layer',
  computes: false,
  interprets: false,
  modifies: false,
  provide: provideNotificationRequests,
});

export default notificationActivationProvider;