/**
 * GovernanceValidationModel
 *
 * Sprint 166 — Declares architecture, ownership, dependency and
 * evolution rules of the Alert Capability.
 *
 * Governance declaration only. Does NOT execute validation.
 */

export const GOVERNANCE_VALIDATION_MODEL = Object.freeze({
  capabilityKey: 'alerts',
  architectureRules: Object.freeze([
    'Capability owns contracts, boundaries, governance and definition',
    'Core owns runtime, persistence, security and infrastructure',
  ]),
  ownershipRules: Object.freeze([
    'Every architecture component keeps a single owner',
    'No orphan structures',
    'No duplicate responsibilities',
  ]),
  dependencyRules: Object.freeze([
    'Contracts → boundaries → future runtime',
    'No capability dependency on persistence or providers',
  ]),
  evolutionRules: Object.freeze([
    'v1 → v2 evolves without breaking existing contracts',
    'Boundary protection is preserved across evolution',
  ]),
});

export default GOVERNANCE_VALIDATION_MODEL;
