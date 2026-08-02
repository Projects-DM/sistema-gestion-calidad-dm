/**
 * MetadataNormalizer
 *
 * Sprint 197 — Converts ANY partial resource metadata into a COMPLETE
 * Alert Configuration. The Runtime never receives incomplete objects.
 *
 * Example:
 *   Entrada  { enabled: true }
 *   Salida   { enabled: true, periodicity: null, expiration: 'none',
 *              risk: { model:'relative', thresholds:{...} }, priority: 'medium',
 *              notification: null, gracePeriod: null, automaticClose: true,
 *              repeatPolicy: 'repeat' }
 *
 * Normalization ONLY. No date/risk/alert evaluation. No logic beyond
 * validating and completing the metadata model.
 */

import { provideDefaultAlertConfiguration } from './DefaultAlertConfigurationProvider.js';
import { resolvePriority } from './AlertPriorityPolicy.js';
import {
  PERIODICITY_UNITS,
  EXPIRATION_POLICIES,
  RISK_MODELS,
  REPEAT_POLICIES,
  NOTIFICATION_CHANNELS,
} from './AlertConfigurationMetadata.js';

function normalizePeriodicity(raw) {
  if (raw === null || raw === undefined) return null;
  if (raw === 'once') return 'once';
  if (
    typeof raw === 'object' &&
    typeof raw.amount === 'number' &&
    Number.isFinite(raw.amount) &&
    raw.amount > 0 &&
    PERIODICITY_UNITS.includes(raw.unit) &&
    raw.unit !== 'once'
  ) {
    return Object.freeze({ amount: raw.amount, unit: raw.unit });
  }
  return null;
}

function normalizeExpiration(raw) {
  return EXPIRATION_POLICIES.includes(raw) ? raw : 'none';
}

function normalizeRisk(raw, fallback) {
  const def = fallback.risk;
  if (!raw || typeof raw !== 'object') return def;
  const model = RISK_MODELS.includes(raw.model) ? raw.model : def.model;
  const thresholds =
    raw.thresholds && typeof raw.thresholds === 'object'
      ? Object.freeze({
          yellow:
            typeof raw.thresholds.yellow === 'number' && Number.isFinite(raw.thresholds.yellow)
              ? raw.thresholds.yellow
              : def.thresholds.yellow,
          red:
            typeof raw.thresholds.red === 'number' && Number.isFinite(raw.thresholds.red)
              ? raw.thresholds.red
              : def.thresholds.red,
        })
      : def.thresholds;
  return Object.freeze({ model, thresholds });
}

function normalizeNotification(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const channel = NOTIFICATION_CHANNELS.includes(raw.channel) ? raw.channel : 'in-app';
  return Object.freeze({
    channel,
    recipients: Array.isArray(raw.recipients) ? Object.freeze([...raw.recipients]) : Object.freeze([]),
  });
}

function normalizeGracePeriod(raw) {
  if (raw === null || raw === undefined) return null;
  if (
    typeof raw === 'object' &&
    typeof raw.amount === 'number' &&
    Number.isFinite(raw.amount) &&
    raw.amount > 0 &&
    PERIODICITY_UNITS.includes(raw.unit) &&
    raw.unit !== 'once'
  ) {
    return Object.freeze({ amount: raw.amount, unit: raw.unit });
  }
  return null;
}

/**
 * Normalizes any partial resource metadata into a complete, frozen
 * Alert Configuration (always merged over the DEFAULT configuration).
 *
 * @param {Object|null|undefined} raw Partial `alertConfiguration` metadata.
 * @returns {Object} Complete frozen Alert Configuration.
 */
export function normalizeAlertConfiguration(raw) {
  const fallback = provideDefaultAlertConfiguration();
  const source = raw && typeof raw === 'object' ? raw : {};

  return Object.freeze({
    enabled: typeof source.enabled === 'boolean' ? source.enabled : fallback.enabled,
    periodicity: normalizePeriodicity(
      source.periodicity === undefined ? fallback.periodicity : source.periodicity,
    ),
    expiration: normalizeExpiration(
      source.expiration === undefined ? fallback.expiration : source.expiration,
    ),
    risk: normalizeRisk(source.risk, fallback),
    priority: resolvePriority(source.priority === undefined ? fallback.priority : source.priority).level,
    notification:
      source.notification === undefined ? fallback.notification : normalizeNotification(source.notification),
    gracePeriod:
      source.gracePeriod === undefined ? fallback.gracePeriod : normalizeGracePeriod(source.gracePeriod),
    automaticClose:
      typeof source.automaticClose === 'boolean' ? source.automaticClose : fallback.automaticClose,
    repeatPolicy: REPEAT_POLICIES.includes(source.repeatPolicy)
      ? source.repeatPolicy
      : fallback.repeatPolicy,
  });
}

export default normalizeAlertConfiguration;
