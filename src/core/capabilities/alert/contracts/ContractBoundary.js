/**
 * ContractBoundary
 *
 * Sprint 151 — Contract First boundary preparation.
 *
 * All future communication between Alert Capability and any
 * consumer MUST pass through certified contracts. Internal domains
 * are NEVER exposed directly.
 */

export const CAPABILITY_CONTRACT_BOUNDARY = Object.freeze({
  rule: 'Contract First',
  allowedExposure: Object.freeze([
    'Capability Contracts',
    'Certified Response Contracts',
    'Certified Policy Contracts',
    'Certified Event Contracts',
  ]),
  forbiddenExposure: Object.freeze([
    'Internal domain objects',
    'Runtime structures',
    'Persistence models',
    'Infrastructure payloads',
  ]),
  status: 'prepared — contracts to be certified in future sprints',
});
