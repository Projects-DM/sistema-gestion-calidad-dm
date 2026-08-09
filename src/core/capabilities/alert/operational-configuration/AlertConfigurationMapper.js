/**
 * AlertConfigurationMapper
 *
 * Sprint 201 — Pure mapping between the UI FORM STATE (editable draft) and
 * the canonical Alert Configuration METADATA (the object persisted in the
 * resource metadata and read by the AlertConfigurationResolver).
 *
 * The Mapper is a transport ONLY:
 *   - `mapMetadataToFormState`   metadata → editable draft (UI)
 *   - `mapFormStateToMetadata`   editable draft → canonical metadata
 *
 * It NEVER validates (that is AlertConfigurationValidation's job) and NEVER
 * computes due dates, risk or alerts. The RESULT of `mapFormStateToMetadata`
 * is a PLAIN object (never frozen): the Application Service validates it and
 * the persistence adapter writes it — the Resolver freezes it on read.
 *
 * Mapping ONLY. Never executes.
 */

import { PERIODICITY_UNITS } from './AlertConfigurationMetadata.js';

const DEFAULT_UNIT = 'days';

/**
 * Normalizes a numeric input to a positive number, or the fallback.
 * @param {*} value
 * @param {number} fallback
 * @returns {number}
 */
function toPositiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Creates an EMPTY editable draft from the canonical DEFAULT configuration.
 * Used when a resource was never configured (source 'default').
 *
 * @returns {Object} Editable form state (plain object).
 */
export function createEmptyFormState() {
  return mapMetadataToFormState(null);
}

/**
 * Converts canonical Alert Configuration metadata into an EDITABLE form
 * draft. Accepts the raw metadata or the frozen AlertConfiguration Value
 * Object delivered by the Resolver.
 *
 * Null / absent metadata → the canonical DEFAULT draft.
 *
 * @param {Object|null|undefined} metadata Canonical metadata.
 * @returns {Object} Plain, editable form state.
 */
export function mapMetadataToFormState(metadata) {
  const source = metadata && typeof metadata === 'object' ? metadata : {};
  const periodicity = source.periodicity;
  const periodicityMode =
    periodicity === 'once'
      ? 'once'
      : periodicity && typeof periodicity === 'object'
        ? 'recurring'
        : 'none';

  const gracePeriod = source.gracePeriod;
  const gracePeriodEnabled =
    !!gracePeriod && typeof gracePeriod === 'object' && !Array.isArray(gracePeriod);

  const notification = source.notification;
  const notificationEnabled =
    !!notification && typeof notification === 'object' && !Array.isArray(notification);

  return {
    enabled: source.enabled !== false,
    priority: source.priority || 'medium',
    name: typeof source.name === 'string' ? source.name : source.name ?? '',
    description: typeof source.description === 'string' ? source.description : source.description ?? '',
    startDate: source.startDate ?? '',
    startTime: source.startTime ?? '',
    timezone: typeof source.timezone === 'string' ? source.timezone : source.timezone ?? '',
    periodicityMode,
    periodicityAmount: periodicity?.amount ?? 1,
    periodicityUnit: PERIODICITY_UNITS.includes(periodicity?.unit)
      ? periodicity.unit
      : DEFAULT_UNIT,
    expiration: source.expiration || 'none',
    riskModel: source.risk?.model || 'relative',
    riskYellow: toPositiveNumber(source.risk?.thresholds?.yellow, 0.5),
    riskRed: toPositiveNumber(source.risk?.thresholds?.red, 0.25),
    notificationEnabled,
    notificationChannel: notification?.channel || 'email',
    notificationRecipients: Array.isArray(notification?.recipients)
      ? notification.recipients.join(', ')
      : '',
    gracePeriodEnabled,
    gracePeriodAmount: gracePeriod?.amount ?? 1,
    gracePeriodUnit: PERIODICITY_UNITS.includes(gracePeriod?.unit)
      ? gracePeriod.unit
      : DEFAULT_UNIT,
    automaticClose: source.automaticClose !== false,
    repeatPolicy: source.repeatPolicy || 'repeat',
  };
}

/**
 * Converts the EDITABLE form draft into the canonical Alert Configuration
 * metadata object (the exact 9-field shape persisted in the resource
 * metadata and consumed by the Resolver).
 *
 * The result is a PLAIN object — the Application Service validates it before
 * persisting, and the Resolver freezes it when the Runtime reads it back.
 *
 * @param {Object} formState Editable form state.
 * @returns {Object} Canonical metadata (plain object).
 */
export function mapFormStateToMetadata(formState) {
  const f = formState && typeof formState === 'object' ? formState : {};

  const periodicity =
    f.periodicityMode === 'once'
      ? 'once'
      : f.periodicityMode === 'recurring'
        ? Object.freeze({
            amount: toPositiveNumber(f.periodicityAmount, 1),
            unit: PERIODICITY_UNITS.includes(f.periodicityUnit)
              ? f.periodicityUnit
              : DEFAULT_UNIT,
          })
        : null;

  const gracePeriod = f.gracePeriodEnabled
    ? Object.freeze({
        amount: toPositiveNumber(f.gracePeriodAmount, 1),
        unit: PERIODICITY_UNITS.includes(f.gracePeriodUnit)
          ? f.gracePeriodUnit
          : DEFAULT_UNIT,
      })
    : null;

  const notification = f.notificationEnabled
    ? Object.freeze({
        channel: f.notificationChannel || 'email',
        recipients: Object.freeze(
          String(f.notificationRecipients || '')
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean),
        ),
      })
    : null;

  return {
    enabled: f.enabled === true,
    name: typeof f.name === 'string' ? f.name : (f.name ?? ''),
    description: typeof f.description === 'string' ? f.description : (f.description ?? ''),
    startDate: typeof f.startDate === 'string' ? f.startDate : (f.startDate ?? ''),
    startTime: typeof f.startTime === 'string' ? f.startTime : (f.startTime ?? ''),
    timezone: typeof f.timezone === 'string' ? f.timezone : (f.timezone ?? ''),
    periodicity,
    expiration: f.expiration || 'none',
    risk: Object.freeze({
      model: f.riskModel || 'relative',
      thresholds: Object.freeze({
        yellow: toPositiveNumber(f.riskYellow, 0.5),
        red: toPositiveNumber(f.riskRed, 0.25),
      }),
    }),
    priority: f.priority || 'medium',
    notification,
    gracePeriod,
    automaticClose: f.automaticClose === true,
    repeatPolicy: f.repeatPolicy || 'repeat',
  };
}

export default mapFormStateToMetadata;

/**
 * Maps a COLLECTION of canonical Alert Configuration metadata into editable
 * drafts (Sprint 229 — collection persistence). Reuses the certified per-item
 * `mapMetadataToFormState`; no new mapper.
 *
 * @param {Array<Object>} collection Canonical configuration list.
 * @returns {Array<Object>} Editable drafts, one per element.
 */
export function mapCollectionToFormStates(collection) {
  return (Array.isArray(collection) ? collection : []).map((cfg) => mapMetadataToFormState(cfg));
}

/**
 * Maps a COLLECTION of editable drafts into canonical metadata (Sprint 229).
 * Reuses the certified per-item `mapFormStateToMetadata`; no new mapper.
 *
 * @param {Array<Object>} formStates Editable drafts.
 * @returns {Array<Object>} Canonical configuration list.
 */
export function mapFormStatesToCollection(formStates) {
  return (Array.isArray(formStates) ? formStates : []).map((fs) => mapFormStateToMetadata(fs));
}
