/**
 * Alert Capability Contracts
 *
 * Sprint 152 — Certified public capability surface.
 *
 * The ONLY authorized communication boundary between external
 * consumers and the Alert Capability. Internal domains are never
 * exposed directly.
 *
 * Exports:
 *   - AlertContract     — alert definition boundary
 *   - DecisionContract  — decision boundary
 *   - PolicyContract    — policy boundary
 *   - ResponseContract  — response boundary
 *   - ContractValidator — structural contract validation
 */

export { AlertContract, ALERT_CONTRACT_VERSION } from './AlertContract.js';
export { DecisionContract, DECISION_CONTRACT_VERSION } from './DecisionContract.js';
export { PolicyContract, POLICY_CONTRACT_VERSION } from './PolicyContract.js';
export { ResponseContract, RESPONSE_CONTRACT_VERSION } from './ResponseContract.js';
export { ContractValidator, validateContract } from './ContractValidator.js';
export { CAPABILITY_CONTRACT_BOUNDARY } from './ContractBoundary.js';
export { CapabilityDiscoveryContract, CAPABILITY_DISCOVERY_VERSION } from './CapabilityDiscoveryContract.js';

export const CAPABILITY_CONTRACTS = Object.freeze({
  alert: 'alert.definition',
  decision: 'alert.decision',
  policy: 'alert.policy',
  response: 'alert.response',
  discovery: 'alert.discovery',
});
