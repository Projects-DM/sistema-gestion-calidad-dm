/**
 * AlertLifecycleAdapter
 *
 * Sprint 207 — Alert Lifecycle Persistence Integration.
 *
 * Adapts a certified Consumption entry `{ descriptor, evaluation }` into an
 * Alert Lifecycle Record:
 *
 *   {
 *     alertId, resourceId, timestamp, status, severity, transition,
 *     escalation, nextDue, remaining
 *   }
 *
 * It copies ONLY the permitted consumption fields. It NEVER calculates
 * states, severities or due dates, NEVER interprets rules and NEVER consults
 * metadata — the operational state already decided by the certified Runtime /
 * Evaluation Engine is only persisted. `timestamp` is transported as input
 * (never computed here): this layer does not generate time.
 *
 * Adapter ONLY. Never executes, never recomputes, never persists on its own.
 * AlertEvaluation stays immutable (only read, never modified).
 */

import { mapEvaluationToConsumption } from '../evaluation/consumption/AlertConsumptionMapper.js';

export const ALERT_LIFECYCLE_VERSION = '207.1';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
};

const resolveIdentity = (descriptor) => {
  const id = descriptor?.id ?? descriptor?.formId ?? descriptor?.documentId ?? descriptor?.resource ?? descriptor?.source ?? null;
  const resourceId = descriptor?.documentId ?? descriptor?.resource ?? descriptor?.formId ?? null;
  return { alertId: id, resourceId };
};

/**
 * Maps a certified Consumption entry into an Alert Lifecycle Record. Pure
 * passthrough of already-computed evaluation state + alert identity. Never
 * computes.
 *
 * @param {Object} input
 * @param {Object} [input.entry] { descriptor, evaluation } Consumption entry.
 * @param {string} [input.timestamp] Persisted timestamp (transported as input, never computed).
 * @returns {Object} Deeply frozen { provided, record }.
 */
export function adaptLifecycleRecord({ entry, timestamp = null } = {}) {
  if (!entry || !entry.evaluation) {
    return Object.freeze({ provided: false, record: null, reasons: ['missing-consumption-entry'] });
  }

  const descriptor = entry.descriptor || null;
  const consumption = mapEvaluationToConsumption(entry);
  const { alertId, resourceId } = resolveIdentity(descriptor);

  return Object.freeze({
    provided: true,
    record: deepFreeze({
      alertId,
      resourceId,
      timestamp,
      status: consumption.status,
      severity: consumption.severity,
      transition: consumption.transition,
      escalation: consumption.escalation,
      nextDue: consumption.nextDue,
      remaining: consumption.remaining,
    }),
    reasons: [],
  });
}

export const alertLifecycleAdapter = Object.freeze({
  key: 'lifecycle-adapter',
  name: 'Alert Lifecycle Adapter',
  version: ALERT_LIFECYCLE_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  produces: 'lifecycle-record',
  computes: false,
  interprets: false,
  queriesMetadata: false,
  adapt: adaptLifecycleRecord,
});

export default alertLifecycleAdapter;