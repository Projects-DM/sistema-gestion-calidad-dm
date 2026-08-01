/**
 * AlertEnterpriseActivationContract
 *
 * Sprint 179 / Audit-1 (SSOT) — Defines the contract for Enterprise
 * Capability Activation and Operational Validation against the real
 * SGC-DM runtime pipeline.
 *
 * Sprint 180-R / Audit-1: the capability is EXPERIENCE-ONLY. The only
 * activation target is the operational experience. No capability package
 * is registered (single configuration entry via Experiencias Operacionales
 * → Alert Monitoring).
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
    'operational-experience',
  ]),
});

export default AlertEnterpriseActivationContract;
