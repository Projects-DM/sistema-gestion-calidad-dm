/**
 * AlertConfigurationContract
 *
 * Sprint 180 (iteración 2) — Defines the administrable operational
 * configuration surface of the Alert Capability.
 *
 * Configuration contract. Never executes, automates or notifies.
 */

export const OPERATIONAL_CONFIGURATION_VERSION = 1;

export const AlertConfigurationContract = Object.freeze({
  contractKey: 'alert.operational-configuration',
  version: 1,
  capabilityKey: 'alerts',
  configurationType: 'operational',
  supportedSources: Object.freeze([
    'dynamicForms',
    'dynamicRecords',
    'documentRepository',
  ]),
  executionEnabled: false,
});

export default AlertConfigurationContract;
