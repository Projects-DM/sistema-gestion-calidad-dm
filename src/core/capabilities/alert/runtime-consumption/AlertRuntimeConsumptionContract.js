/**
 * AlertRuntimeConsumptionContract
 *
 * Sprint 180 — Defines how the Alert Capability can be consumed by
 * existing engines.
 *
 * Consumption contract. Never creates alerts, evaluates rules,
 * executes actions or processes events.
 */

export const RUNTIME_CONSUMPTION_VERSION = 1;

export const AlertRuntimeConsumptionContract = Object.freeze({
  contractKey: 'alert.runtime-consumption',
  version: 1,
  capabilityKey: 'alerts',
  consumers: Object.freeze([
    'dynamicForms',
    'dynamicRecords',
    'documentRepository',
    'dashboard',
  ]),
  executionEnabled: false,
});

export default AlertRuntimeConsumptionContract;
