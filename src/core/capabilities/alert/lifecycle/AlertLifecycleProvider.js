/**
 * AlertLifecycleProvider
 *
 * Sprint 207 — Alert Lifecycle Persistence Integration.
 *
 * Supplies the Lifecycle Persistence exclusively with the certified
 * CONSUMPTION objects produced by the Consumption Layer (`evaluationEntries`
 * — the `{ descriptor, evaluation }` contract). It never evaluates, never
 * interprets and never modifies the evaluated data; it only routes it to the
 * Lifecycle Adapter to produce Lifecycle Records for historical persistence.
 *
 * Provider ONLY. Never creates a store, never computes, never queries
 * metadata, never schedules.
 */

import { adaptLifecycleRecord } from './AlertLifecycleAdapter.js';

export const ALERT_LIFECYCLE_VERSION = '207.1';

/**
 * Provides Alert Lifecycle Records from the certified Consumption layer
 * output. Expects `request.evaluationEntries` (list of { descriptor,
 * evaluation }). `request.timestamp` is transported as input (never computed
 * here). Returns an empty set when no consumption output is present — it NEVER
 * builds records from rules or descriptors directly.
 *
 * @param {Object} [request]
 * @param {Array} [request.evaluationEntries] Consumption { descriptor, evaluation } entries.
 * @param {string} [request.timestamp] Persisted timestamp (transported input).
 * @returns {Object} Frozen Alert Lifecycle provider result.
 */
export function provideLifecycleRecords(request = {}) {
  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      consumer: 'lifecycle',
      capabilityKey: 'alerts',
      provider: false,
      consumed: false,
      available: false,
      records: [],
      moduleId: request.moduleId || request.module || null,
      reasons: ['capability-not-assigned'],
    });
  }

  const entries = Array.isArray(request.evaluationEntries) ? request.evaluationEntries : [];

  const records = entries
    .map((entry) => adaptLifecycleRecord({ entry, timestamp: request.timestamp }))
    .filter((r) => r.provided === true)
    .map((r) => r.record);

  return Object.freeze({
    consumer: 'lifecycle',
    capabilityKey: 'alerts',
    provider: true,
    consumed: true,
    available: true,
    moduleId: request.moduleId || request.module || null,
    records: Object.freeze(records),
    reasons: [],
  });
}

export const alertLifecycleProvider = Object.freeze({
  key: 'lifecycle-provider',
  name: 'Alert Lifecycle Provider',
  version: ALERT_LIFECYCLE_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  consumes: 'consumption-layer',
  produces: 'lifecycle-record',
  computes: false,
  interprets: false,
  modifies: false,
  schedules: false,
  provide: provideLifecycleRecords,
});

export default alertLifecycleProvider;