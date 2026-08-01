/**
 * Alert Governance Certification
 *
 * Sprint 166 — Certified architectural governance boundary.
 *
 * CERTIFIED STRUCTURE ONLY. Declares the architectural governance
 * certification state of the Alert Capability. No runtime, no
 * activation.
 */

export { ArchitectureCertificationContract, ARCHITECTURE_CERTIFICATION_VERSION } from './ArchitectureCertificationContract.js';
export { GOVERNANCE_VALIDATION_MODEL } from './GovernanceValidationModel.js';
export { CAPABILITY_MATURITY_MODEL } from './CapabilityMaturityModel.js';
export { CERTIFICATION_BOUNDARY } from './CertificationBoundary.js';

export const ALERT_GOVERNANCE_CERTIFICATION = Object.freeze({
  key: 'governance-certification',
  name: 'Alert Governance Certification Boundary',
  execution: false,
});

export default ALERT_GOVERNANCE_CERTIFICATION;
