/**
 * Alert Ecosystem
 *
 * Sprint 165 — Certified ecosystem alignment boundary.
 *
 * CERTIFIED STRUCTURE ONLY. Declares how the Alert Capability aligns
 * with the SGC-DM core ecosystem. No ecosystem services, no adapters,
 * no connectors.
 */

export { ECOSYSTEM_COMPATIBILITY } from './EcosystemCompatibility.js';
export { CAPABILITY_ALIGNMENT_MODEL } from './CapabilityAlignmentModel.js';
export { PlatformDependencyContract, PLATFORM_DEPENDENCY_VERSION } from './PlatformDependencyContract.js';
export { ECOSYSTEM_BOUNDARY } from './EcosystemBoundary.js';

export const ALERT_ECOSYSTEM = Object.freeze({
  key: 'ecosystem',
  name: 'Alert Ecosystem Alignment Boundary',
  execution: false,
});

export default ALERT_ECOSYSTEM;
