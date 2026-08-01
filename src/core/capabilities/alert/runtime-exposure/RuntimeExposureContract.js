/**
 * RuntimeExposureContract
 *
 * Sprint 169 — Declares the controlled runtime exposure boundary of
 * the Alert Capability.
 *
 * Visibility declaration ONLY. Exposes nothing to execution.
 */

export const RUNTIME_EXPOSURE_VERSION = '1';

export const RuntimeExposureContract = Object.freeze({
  contractKey: 'alert.runtime-exposure',
  name: 'Runtime Exposure Contract',
  version: RUNTIME_EXPOSURE_VERSION,
  capabilityKey: 'alerts',
  exposureMode: 'controlled',
  runtimeEnabled: false,
  executionEnabled: false,
  eventConsumption: false,
  policyExecution: false,
  representation: Object.freeze({
    runtimeExposureIdentity: Object.freeze({ type: 'string', required: true, description: 'Runtime exposure identity' }),
    capabilityReference: Object.freeze({ type: 'string', required: true, description: 'Capability key reference' }),
    runtimeRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified runtime constraints' }),
    exposureRestrictions: Object.freeze({ type: 'array', required: true, description: 'Certified exposure constraints' }),
  }),
});

export default RuntimeExposureContract;
