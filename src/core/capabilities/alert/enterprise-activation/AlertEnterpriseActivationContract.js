/**
 * AlertEnterpriseActivationContract
 *
 * Sprint 179 — Defines the contract for Enterprise Capability Activation
 * and Operational Validation against the real SGC-DM runtime pipeline.
 *
 * Activation contract. Never executes alerts, never processes events,
 * never creates storage.
 */

export const ENTERPRISE_ACTIVATION_VERSION = 1;

export const AlertEnterpriseActivationContract = Object.freeze({
  contractKey: 'alert.enterprise-activation',
  version: 1,
  capabilityKey: 'alerts',
  activationMode: 'controlled',
  executionEnabled: false,
  supportedTargets: Object.freeze([
    'capability-package',
    'operational-experience',
  ]),
});

export default AlertEnterpriseActivationContract;
