/**
 * AlertConfiguration
 *
 * Sprint 198.R — THE Alert Configuration VALUE OBJECT.
 *
 * A Value Object is immutable and structurally equal to any other instance
 * holding the same field values. The Runtime NEVER mutates it, NEVER adds or
 * removes properties and NEVER reads storage keys — it only reads
 * `configuration`, which the AlertConfigurationResolver delivers ALWAYS
 * complete (guaranteed by the MetadataNormalizer).
 *
 * Structural ONLY. No behavior, no interpretation, no evaluation.
 */

import { AlertConfigurationMetadata } from './AlertConfigurationMetadata.js';

/**
 * The exact canonical field set of the Alert Configuration contract.
 * No additional properties are permitted (SSOT, Sprint 197).
 */
export const CONFIGURATION_KEYS = Object.freeze([
  'enabled',
  'periodicity',
  'expiration',
  'risk',
  'priority',
  'notification',
  'gracePeriod',
  'automaticClose',
  'repeatPolicy',
]);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}

/**
 * Creates the canonical AlertConfiguration Value Object from an input that
 * is assumed ALREADY normalized (MetadataNormalizer). Any extra property is
 * dropped — the result has exactly the 9 contract fields, deeply frozen.
 *
 * @param {Object} input Normalized alert configuration.
 * @returns {Object} Deeply frozen AlertConfiguration Value Object.
 */
export function createAlertConfiguration(input) {
  const source = input && typeof input === 'object' ? input : {};
  const value = {};
  for (const key of CONFIGURATION_KEYS) value[key] = source[key];
  return deepFreeze(value);
}

/**
 * Structural guard: a valid Alert Configuration is a frozen object holding
 * exactly the 9 canonical fields.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isAlertConfiguration(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.isFrozen(value) &&
    CONFIGURATION_KEYS.every((k) => k in value)
  );
}

/**
 * Contract assertion. Throws when the value is not a complete, immutable
 * Alert Configuration.
 *
 * @param {*} value
 * @returns {Object} The value when valid.
 */
export function assertAlertConfiguration(value) {
  if (!isAlertConfiguration(value)) {
    throw new Error(
      'AlertConfiguration: debe ser un Value Object completo e inmutable (9 campos canónicos, Object.freeze).',
    );
  }
  return value;
}

export default createAlertConfiguration;
