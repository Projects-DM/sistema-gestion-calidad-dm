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
import { CAPABILITY_IDENTITY } from './governance/CapabilityIdentity.js';
import { REGISTRY_COMPATIBILITY } from './governance/RegistryCompatibility.js';
import { RUNTIME_COMPATIBILITY } from './runtime/RuntimeCompatibility.js';
import { CapabilityRuntimeContract } from './runtime/CapabilityRuntimeContract.js';
import { EVENT_COMPATIBILITY } from './events/EventCompatibility.js';
import { EVENT_BOUNDARY } from './events/EventBoundary.js';
import { EventConsumptionContract } from './events/EventConsumptionContract.js';
import { DECISION_COMPATIBILITY } from './decisions/DecisionCompatibility.js';
import { DECISION_BOUNDARY } from './decisions/DecisionBoundary.js';
import { DecisionContextContract } from './decisions/DecisionContextContract.js';
import { POLICY_COMPATIBILITY } from './policies/PolicyCompatibility.js';
import { POLICY_BOUNDARY } from './policies/PolicyBoundary.js';
import { PolicyEvaluationContract } from './policies/PolicyEvaluationContract.js';
import {
  CAPABILITY_CONTRACT_BOUNDARY,
  AlertContract,
  DecisionContract,
  PolicyContract,
  ResponseContract,
  ContractValidator,
  CapabilityDiscoveryContract,
} from './contracts/index.js';

/**
 * Immutable identity of the Alert Capability.
 * Exposes boundaries and certified contracts only — never internals.
 */
export const AlertCapability = Object.freeze({
  capabilityKey: CAPABILITY_METADATA.capabilityKey,
  name: CAPABILITY_METADATA.name,
  level: CAPABILITY_METADATA.level,
  identity: CAPABILITY_IDENTITY,
  registryCompatibility: REGISTRY_COMPATIBILITY,
  runtimeCompatibility: RUNTIME_COMPATIBILITY,
  eventCompatibility: EVENT_COMPATIBILITY,
  eventBoundary: EVENT_BOUNDARY,
  decisionCompatibility: DECISION_COMPATIBILITY,
  decisionBoundary: DECISION_BOUNDARY,
  policyCompatibility: POLICY_COMPATIBILITY,
  policyBoundary: POLICY_BOUNDARY,
  domains: Object.freeze(DOMAIN_BOUNDARIES),
  contractBoundary: CAPABILITY_CONTRACT_BOUNDARY,
  contracts: Object.freeze({
    alert: AlertContract,
    decision: DecisionContract,
    policy: PolicyContract,
    response: ResponseContract,
    discovery: CapabilityDiscoveryContract,
    runtime: CapabilityRuntimeContract,
    event: EventConsumptionContract,
    decisionContext: DecisionContextContract,
    policyEvaluation: PolicyEvaluationContract,
    validator: ContractValidator,
  }),
});

export default AlertCapability;
