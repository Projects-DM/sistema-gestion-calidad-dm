/**
 * ArchitectureCertificationContract
 *
 * Sprint 166 — Declares the architectural governance certification
 * of the Alert Capability.
 *
 * Declares certification state ONLY. Activates nothing.
 */

export const ARCHITECTURE_CERTIFICATION_VERSION = '1';

export const ArchitectureCertificationContract = Object.freeze({
  contractKey: 'alert.architecture-certification',
  name: 'Architecture Certification Contract',
  version: ARCHITECTURE_CERTIFICATION_VERSION,
  capabilityKey: 'alerts',
  maturityLevel: 'LEVEL_3',
  certified: true,
  runtimeEnabled: false,
  operationalEnabled: false,
  representation: Object.freeze({
    certificationIdentity: Object.freeze({ type: 'string', required: true, description: 'Certification identity' }),
    capabilityReference: Object.freeze({ type: 'string', required: true, description: 'Capability key reference' }),
    architectureVersion: Object.freeze({ type: 'string', required: true, description: 'Architecture version' }),
    certificationRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified governance constraints' }),
  }),
});

export default ArchitectureCertificationContract;
