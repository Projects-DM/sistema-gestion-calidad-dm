/**
 * ActivationGovernance
 *
 * Sprint 160 — Declares activation rules, approval requirements and
 * governance constraints for the Alert Capability.
 *
 * Prepares governance control. Does NOT execute anything.
 */

export const ACTIVATION_GOVERNANCE = Object.freeze({
  key: 'activation-governance',
  name: 'Alert Activation Governance',
  activationRules: Object.freeze({
    requiresGovernanceValidation: true,
    requiresApproval: true,
    requiresAuthorization: true,
    directActivation: false,
    hiddenActivation: false,
    automaticEnablement: false,
  }),
  approvalRequirements: Object.freeze({
    whoCanActivate: 'governed by SGC-DM Security Model',
    underWhatConditions: 'governance validation + approval boundary',
    withWhatValidation: 'activation contract + lifecycle state',
  }),
  governanceConstraints: Object.freeze([
    'Activation is separated from definition',
    'Activation is separated from execution',
    'Activation always passes governance validation',
    'Activation history is prepared for auditability',
  ]),
});

export default ACTIVATION_GOVERNANCE;
