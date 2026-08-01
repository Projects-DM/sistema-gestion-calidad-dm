/**
 * AlertGovernance
 *
 * Sprint 151 — Governance traceability boundary.
 *
 * Preserves sprint history, architectural decisions and capability
 * evolution. READ ONLY.
 */

import { CAPABILITY_IDENTITY } from './CapabilityIdentity.js';
import { REGISTRY_COMPATIBILITY } from './RegistryCompatibility.js';

export const AlertGovernance = Object.freeze({
  key: 'governance',
  name: 'Alert Governance Traceability',
  lineage: Object.freeze({
    certifiedSeries: 'Sprint 144.0 → 150',
    immutableCore: true,
    extensionFramework: 'Certified Extension Framework (Sprint 144.6-R3)',
    governanceConstitution: 'Sprint 144.6-R6',
    architecturalInvariants: 'Sprint 144.6-R8',
    continuousValidation: 'Sprint 144.6-R9',
  }),
  structure: Object.freeze({
    sprintHistory: true,
    architecturalDecisions: true,
    capabilityEvolution: true,
  }),
});

export { CAPABILITY_IDENTITY } from './CapabilityIdentity.js';
export { REGISTRY_COMPATIBILITY } from './RegistryCompatibility.js';

export default AlertGovernance;
