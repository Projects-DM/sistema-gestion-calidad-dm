/**
 * AlertCapability
 *
 * Sprint 151 — Operational Domain Architecture Foundation.
 *
 * CERTIFIED STRUCTURE ONLY. This capability has NO runtime logic,
 * NO UI, NO persistence and NO external integration.
 *
 * It is the physical boundary of the certified Alert Capability
 * (Sprint 144.0 → 150). It owns ONLY its identity and boundaries.
 *
 * Architecture:
 *   contracts/   — Contract First boundary (future certified contracts)
 *   domains/     — alert | decision | policy | response (isolated domains)
 *   application/ — future use-case coordination (no rules today)
 *   validation/  — future contract/domain/governance validation
 *   governance/  — architectural traceability
 */

import { CAPABILITY_METADATA } from './governance/CapabilityMetadata.js';
import { DOMAIN_BOUNDARIES } from './governance/DomainBoundaries.js';
import { CAPABILITY_CONTRACT_BOUNDARY } from './contracts/ContractBoundary.js';

/**
 * Immutable identity of the Alert Capability.
 * Exposes boundaries only — never internals.
 */
export const AlertCapability = Object.freeze({
  capabilityKey: CAPABILITY_METADATA.capabilityKey,
  name: CAPABILITY_METADATA.name,
  level: CAPABILITY_METADATA.level,
  domains: Object.freeze(DOMAIN_BOUNDARIES),
  contractBoundary: CAPABILITY_CONTRACT_BOUNDARY,
});

export default AlertCapability;
