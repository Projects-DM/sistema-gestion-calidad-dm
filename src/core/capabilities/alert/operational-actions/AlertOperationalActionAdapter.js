/**
 * AlertOperationalActionAdapter
 *
 * Sprint 208 — Alert Operational Actions Integration.
 *
 * Adapts a certified Consumption entry `{ descriptor, evaluation }` plus the
 * transported user intent into an Operational Action Request:
 *
 *   {
 *     alertId, action, performedBy, timestamp, comment, reason
 *   }
 *
 * It copies ONLY the permitted consumption identity and the transported user
 * action. It NEVER modifies the alert, NEVER evaluates, NEVER interprets rules
 * and NEVER consults metadata. `timestamp` and `performedBy` are transported as
 * input (never computed here). The action MUST be one of the certified action
 * types (ACKNOWLEDGE, DISMISS, POSTPONE, RESOLVE, REOPEN, ESCALATE).
 *
 * Adapter ONLY. Never executes, never recomputes, never mutates Runtime.
 * AlertEvaluation stays immutable (only read, never modified).
 */

import { mapEvaluationToConsumption } from '../evaluation/consumption/AlertConsumptionMapper.js';
import { OPERATIONAL_ACTION_TYPES } from './AlertOperationalActionContract.js';

export const OPERATIONAL_ACTIONS_VERSION = '208.1';

/**
 * Maps a certified Consumption entry + transported user action into an
 * Operational Action Request. Pure passthrough; the request only records
 * alert identity + the user intent. Never computes, never mutates.
 *
 * @param {Object} input
 * @param {Object} [input.entry] { descriptor, evaluation } Consumption entry.
 * @param {Object} [input.action] User intent { action, performedBy, timestamp, comment, reason }.
 * @returns {Object} Deeply frozen { provided, request }.
 */
export function adaptOperationalAction({ entry, action } = {}) {
  if (!entry || !entry.evaluation) {
    return Object.freeze({ provided: false, request: null, reasons: ['missing-consumption-entry'] });
  }
  if (!action || typeof action !== 'object' || !action.action) {
    return Object.freeze({ provided: false, request: null, reasons: ['missing-user-action'] });
  }
  if (!OPERATIONAL_ACTION_TYPES.includes(action.action)) {
    return Object.freeze({ provided: false, request: null, reasons: ['action-not-certified'] });
  }

  const descriptor = entry.descriptor || null;
  const consumption = mapEvaluationToConsumption(entry);
  const alertId = descriptor?.id ?? descriptor?.formId ?? descriptor?.documentId ?? descriptor?.resource ?? descriptor?.source ?? null;

  return Object.freeze({
    provided: true,
    request: Object.freeze({
      alertId,
      action: action.action,
      performedBy: action.performedBy || null,
      timestamp: action.timestamp || null,
      comment: action.comment || null,
      reason: action.reason || null,
    }),
    reasons: [],
  });
}

export const alertOperationalActionAdapter = Object.freeze({
  key: 'operational-actions-adapter',
  name: 'Alert Operational Actions Adapter',
  version: OPERATIONAL_ACTIONS_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  produces: 'operational-action-request',
  actionTypes: OPERATIONAL_ACTION_TYPES,
  computes: false,
  interprets: false,
  queriesMetadata: false,
  mutatesRuntime: false,
  adapt: adaptOperationalAction,
});

export default alertOperationalActionAdapter;