/**
 * AlertOperationalActionProvider
 *
 * Sprint 208 — Alert Operational Actions Integration.
 *
 * Supplies the Operational Actions exclusively with the certified CONSUMPTION
 * objects produced by the Consumption Layer (`evaluationEntries` — the
 * `{ descriptor, evaluation }` contract) and routes the transported user
 * intent to the Operational Action Adapter to produce Operational Action
 * Requests. It never evaluates, never interprets, never modifies and never
 * mutates Runtime.
 *
 * Provider ONLY. Never creates a store, never computes, never queries
 * metadata, never schedules.
 */

import { adaptOperationalAction } from './AlertOperationalActionAdapter.js';

export const OPERATIONAL_ACTIONS_VERSION = '208.1';

/**
 * Provides Operational Action Requests from the certified Consumption layer
 * output + transported user action(s). Expects `request.evaluationEntries`
 * (list of { descriptor, evaluation }) and `request.actions` (list of user
 * intents, each { action, performedBy, timestamp, comment, reason }). Returns
 * an empty set when no consumption output or no action is present — it NEVER
 * builds requests from rules or descriptors directly.
 *
 * @param {Object} [request]
 * @param {Array} [request.evaluationEntries] Consumption { descriptor, evaluation } entries.
 * @param {Array} [request.actions] Transported user intents ({ action, performedBy, timestamp, comment, reason }).
 * @returns {Object} Frozen Alert Operational Actions provider result.
 */
export function provideOperationalActions(request = {}) {
  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      consumer: 'operational-actions',
      capabilityKey: 'alerts',
      provider: false,
      consumed: false,
      available: false,
      requests: [],
      moduleId: request.moduleId || request.module || null,
      reasons: ['capability-not-assigned'],
    });
  }

  const requestedActions = Array.isArray(request.actions) ? request.actions : [];

  const requests = requestedActions
    .map((action) => {
      const matching = (Array.isArray(request.evaluationEntries) ? request.evaluationEntries : []).find((entry) => {
        const id = entry?.descriptor?.id ?? entry?.descriptor?.formId ?? entry?.descriptor?.documentId ?? entry?.descriptor?.resource ?? entry?.descriptor?.source;
        return id === action.alertId || (action.alertId === undefined && entry);
      });
      if (!matching) {
        return Object.freeze({ provided: false, request: null, reasons: ['no-matching-consumption-entry'] });
      }
      return adaptOperationalAction({ entry: matching, action });
    })
    .filter((r) => r.provided === true)
    .map((r) => r.request);

  return Object.freeze({
    consumer: 'operational-actions',
    capabilityKey: 'alerts',
    provider: true,
    consumed: true,
    available: true,
    moduleId: request.moduleId || request.module || null,
    requests: Object.freeze(requests),
    reasons: [],
  });
}

export const alertOperationalActionProvider = Object.freeze({
  key: 'operational-actions-provider',
  name: 'Alert Operational Actions Provider',
  version: OPERATIONAL_ACTIONS_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  consumes: 'consumption-layer',
  produces: 'operational-action-request',
  computes: false,
  interprets: false,
  modifies: false,
  mutatesRuntime: false,
  schedules: false,
  provide: provideOperationalActions,
});

export default alertOperationalActionProvider;