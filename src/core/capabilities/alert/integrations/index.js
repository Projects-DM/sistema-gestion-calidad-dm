/**
 * Alert Integrations
 *
 * Sprint 164 — Certified integration design boundary.
 *
 * CERTIFIED STRUCTURE ONLY. Declares how the Alert Capability will
 * integrate with the SGC-DM core platform. No integration runtime,
 * no adapters, no external clients.
 */

export { IntegrationContract, INTEGRATION_VERSION } from './IntegrationContract.js';
export { INTEGRATION_COMPATIBILITY } from './IntegrationCompatibility.js';
export { INTEGRATION_BOUNDARY } from './IntegrationBoundary.js';
export { INTEGRATION_DEPENDENCY_MODEL } from './IntegrationDependencyModel.js';

export const ALERT_INTEGRATIONS = Object.freeze({
  key: 'integrations',
  name: 'Alert Integration Design Boundary',
  execution: false,
});

export default ALERT_INTEGRATIONS;
