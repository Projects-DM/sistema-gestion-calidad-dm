/**
 * AlertConfigurationValidation
 *
 * Sprint 201 — Operational validation of the ADMINISTRABLE Alert
 * Configuration. Runs BEFORE persisting: the Application Service validates
 * the 9 parameters and refuses to write incomplete or contradictory
 * metadata.
 *
 * This module is metadata-only. It NEVER computes due dates, NEVER evaluates
 * risk and NEVER executes. It reads the enum lists from the certified SSOT
 * (AlertConfigurationMetadata / AlertPriorityPolicy) — the same sources the
 * Runtime uses.
 *
 * Validation ONLY. Never executes.
 */

import {
  PERIODICITY_UNITS,
  EXPIRATION_POLICIES,
  RISK_MODELS,
  REPEAT_POLICIES,
  NOTIFICATION_CHANNELS,
} from './AlertConfigurationMetadata.js';
import { ALERT_PRIORITY_LEVELS } from './AlertPriorityPolicy.js';
import { CONFIGURATION_KEYS } from './AlertConfiguration.js';

const RECURRING_UNITS = PERIODICITY_UNITS.filter((unit) => unit !== 'once');

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isInRangeZeroToOne(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1;
}

/**
 * Validates a recurring period / grace period object { amount, unit }.
 *
 * @param {Object|null|undefined} period null, 'once' or { amount, unit }.
 * @param {string} field Base field name for error messages.
 * @returns {{ valid: boolean, errors: Object<string,string[]> }}
 */
export function validatePeriod(period, field = 'periodicity') {
  const errors = {};
  if (period === null || period === undefined) return { valid: true, errors };
  if (period === 'once') return { valid: true, errors };
  if (typeof period !== 'object' || Array.isArray(period)) {
    errors[field] = [`${field} debe ser null, "once" o un objeto { amount, unit }.`];
    return { valid: false, errors };
  }
  if (!isPositiveNumber(period.amount)) {
    errors[field] = [`${field}.amount debe ser un número mayor a 0.`];
  }
  if (!RECURRING_UNITS.includes(period.unit)) {
    errors[field] = [
      `${field}.unit debe ser una de: ${RECURRING_UNITS.join(', ')}.`,
    ];
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates the risk object { model, thresholds: { yellow, red } }.
 *
 * @param {Object|null|undefined} risk
 * @returns {{ valid: boolean, errors: Object<string,string[]> }}
 */
export function validateRisk(risk) {
  const errors = {};
  if (!risk || typeof risk !== 'object' || Array.isArray(risk)) {
    errors.risk = ['risk debe ser un objeto { model, thresholds }.'];
    return { valid: false, errors };
  }
  if (!RISK_MODELS.includes(risk.model)) {
    errors.risk = [`risk.model debe ser una de: ${RISK_MODELS.join(', ')}.`];
  }
  const yellow = risk.thresholds?.yellow;
  const red = risk.thresholds?.red;
  if (!isInRangeZeroToOne(yellow)) {
    errors.risk = [...(errors.risk || []), 'risk.thresholds.yellow debe ser un número en (0, 1].'];
  }
  if (!isInRangeZeroToOne(red)) {
    errors.risk = [...(errors.risk || []), 'risk.thresholds.red debe ser un número en (0, 1].'];
  }
  if (isInRangeZeroToOne(yellow) && isInRangeZeroToOne(red) && red >= yellow) {
    errors.risk = [...(errors.risk || []), 'risk.thresholds.red debe ser menor que yellow.'];
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates the notification object { channel, recipients }.
 *
 * @param {Object|null|undefined} notification
 * @returns {{ valid: boolean, errors: Object<string,string[]> }}
 */
export function validateNotification(notification) {
  const errors = {};
  if (notification === null || notification === undefined) return { valid: true, errors };
  if (typeof notification !== 'object' || Array.isArray(notification)) {
    errors.notification = ['notification debe ser null o un objeto { channel, recipients }.'];

    return { valid: false, errors };
  }
  if (!NOTIFICATION_CHANNELS.includes(notification.channel)) {
    errors.notification = [
      `notification.channel debe ser una de: ${NOTIFICATION_CHANNELS.join(', ')}.`,
    ];
  }
  if (
    !Array.isArray(notification.recipients) ||
    notification.recipients.length === 0 ||
    notification.recipients.some((r) => typeof r !== 'string' || r.trim().length === 0)
  ) {
    errors.notification = [
      ...(errors.notification || []),
      'notification.recipients debe ser un arreglo no vacío de strings.',
    ];
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Cross-field policy compatibility. The Runtime assumes the metadata is
 * coherent; this module guarantees it BEFORE persisting.
 *
 * @param {Object} metadata Canonical alert configuration.
 * @returns {string[]}
 */
export function checkPolicyCompatibility(metadata) {
  const problems = [];
  const periodicity = metadata.periodicity;
  const recurring = periodicity && typeof periodicity === 'object' && !Array.isArray(periodicity);
  const singleEvent = periodicity === 'once';

  if (metadata.repeatPolicy === 'repeat' && !recurring) {
    problems.push(
      "repeatPolicy 'repeat' requiere una periodicity recurrente ({ amount, unit }).",
    );
  }
  if (metadata.repeatPolicy === 'repeat' && singleEvent) {
    problems.push(
      "periodicity 'once' es incompatible con repeatPolicy 'repeat' (un evento único no se repite).",
    );
  }
  if (metadata.repeatPolicy === 'once' && recurring) {
    problems.push(
      "repeatPolicy 'once' es incompatible con una periodicity recurrente.",
    );
  }
  return problems;
}

/**
 * Validates a COMPLETE canonical Alert Configuration metadata object
 * (the exact 9 canonical fields the Runtime expects). Used by the
 * Application Service right before persisting.
 *
 * @param {Object|null|undefined} metadata
 * @returns {{ valid: boolean, errors: Object<string,string[]> }}
 */
export function validateAlertConfiguration(metadata) {
  const errors = {};
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {
      valid: false,
      errors: { configuration: ['Debe existir una configuración completa.'] },
    };
  }

  for (const key of CONFIGURATION_KEYS) {
    if (!(key in metadata)) {
      errors[key] = [`Falta el campo canónico: ${key}.`];
    }
  }

  if (typeof metadata.enabled !== 'boolean') {
    errors.enabled = ['enabled debe ser un booleano.'];
  }

  if (!ALERT_PRIORITY_LEVELS.includes(metadata.priority)) {
    errors.priority = [`priority debe ser una de: ${ALERT_PRIORITY_LEVELS.join(', ')}.`];
  }

  if (!EXPIRATION_POLICIES.includes(metadata.expiration)) {
    errors.expiration = [`expiration debe ser una de: ${EXPIRATION_POLICIES.join(', ')}.`];
  }

  const periodicity = validatePeriod(metadata.periodicity, 'periodicity');
  Object.assign(errors, periodicity.errors);

  const risk = validateRisk(metadata.risk);
  Object.assign(errors, risk.errors);

  const notification = validateNotification(metadata.notification);
  Object.assign(errors, notification.errors);

  const gracePeriod = validatePeriod(metadata.gracePeriod, 'gracePeriod');
  Object.assign(errors, gracePeriod.errors);

  if (typeof metadata.automaticClose !== 'boolean') {
    errors.automaticClose = ['automaticClose debe ser un booleano.'];
  }

  if (!REPEAT_POLICIES.includes(metadata.repeatPolicy)) {
    errors.repeatPolicy = [`repeatPolicy debe ser una de: ${REPEAT_POLICIES.join(', ')}.`];
  }

  const compat = checkPolicyCompatibility(metadata);
  if (compat.length > 0) {
    errors.policy = compat;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates the EDITABLE form state produced by the Mapper. Gives the UI
 * field-level feedback BEFORE mapping to metadata.
 *
 * @param {Object|null|undefined} formState
 * @returns {{ valid: boolean, errors: Object<string,string[]> }}
 */
export function validateAlertConfigurationForm(formState) {
  const errors = {};
  if (!formState || typeof formState !== 'object') {
    return {
      valid: false,
      errors: { form: ['Debe existir un estado de formulario.'] },
    };
  }

  if (typeof formState.enabled !== 'boolean') {
    errors.enabled = ['enabled debe ser un booleano.'];
  }

  if (!ALERT_PRIORITY_LEVELS.includes(formState.priority)) {
    errors.priority = [`priority debe ser una de: ${ALERT_PRIORITY_LEVELS.join(', ')}.`];
  }

  if (!['none', 'once', 'recurring'].includes(formState.periodicityMode)) {
    errors.periodicityMode = ["periodicityMode debe ser 'none', 'once' o 'recurring'."];
  }
  if (formState.periodicityMode === 'recurring') {
    if (!isPositiveNumber(Number(formState.periodicityAmount))) {
      errors.periodicityAmount = ['La cantidad debe ser un número mayor a 0.'];
    }
    if (!RECURRING_UNITS.includes(formState.periodicityUnit)) {
      errors.periodicityUnit = [`La unidad debe ser una de: ${RECURRING_UNITS.join(', ')}.`];
    }
  }

  if (!EXPIRATION_POLICIES.includes(formState.expiration)) {
    errors.expiration = [`expiration debe ser una de: ${EXPIRATION_POLICIES.join(', ')}.`];
  }

  if (!RISK_MODELS.includes(formState.riskModel)) {
    errors.riskModel = [`riskModel debe ser una de: ${RISK_MODELS.join(', ')}.`];
  }
  if (!isInRangeZeroToOne(Number(formState.riskYellow))) {
    errors.riskYellow = ['Umbral yellow debe ser un número en (0, 1].'];
  }
  if (!isInRangeZeroToOne(Number(formState.riskRed))) {
    errors.riskRed = ['Umbral red debe ser un número en (0, 1].'];
  }
  if (
    isInRangeZeroToOne(Number(formState.riskYellow)) &&
    isInRangeZeroToOne(Number(formState.riskRed)) &&
    Number(formState.riskRed) >= Number(formState.riskYellow)
  ) {
    errors.riskRed = ['Umbral red debe ser menor que yellow.'];
  }

  if (formState.notificationEnabled) {
    if (!NOTIFICATION_CHANNELS.includes(formState.notificationChannel)) {
      errors.notificationChannel = [
        `notificationChannel debe ser una de: ${NOTIFICATION_CHANNELS.join(', ')}.`,
      ];
    }
    const recipients = String(formState.notificationRecipients || '')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      errors.notificationRecipients = ['Debes indicar al menos un destinatario.'];
    }
  }

  if (formState.gracePeriodEnabled) {
    if (!isPositiveNumber(Number(formState.gracePeriodAmount))) {
      errors.gracePeriodAmount = ['La cantidad debe ser un número mayor a 0.'];
    }
    if (!RECURRING_UNITS.includes(formState.gracePeriodUnit)) {
      errors.gracePeriodUnit = [`La unidad debe ser una de: ${RECURRING_UNITS.join(', ')}.`];
    }
  }

  if (typeof formState.automaticClose !== 'boolean') {
    errors.automaticClose = ['automaticClose debe ser un booleano.'];
  }

  if (!REPEAT_POLICIES.includes(formState.repeatPolicy)) {
    errors.repeatPolicy = [`repeatPolicy debe ser una de: ${REPEAT_POLICIES.join(', ')}.`];
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export default validateAlertConfiguration;
