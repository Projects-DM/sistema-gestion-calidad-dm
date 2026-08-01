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
import { RESPONSE_COMPATIBILITY } from './responses/ResponseCompatibility.js';
import { RESPONSE_BOUNDARY } from './responses/ResponseBoundary.js';
import { ResponseDefinitionContract } from './responses/ResponseDefinitionContract.js';
import { ACTIVATION_COMPATIBILITY } from './activation/ActivationCompatibility.js';
import { ACTIVATION_BOUNDARY } from './activation/ActivationBoundary.js';
import { ACTIVATION_GOVERNANCE } from './activation/ActivationGovernance.js';
import { ActivationContract } from './activation/ActivationContract.js';
import { ControlledActivationContract } from './activation/ControlledActivationContract.js';
import { ActivationRequestModel } from './activation/ActivationRequestModel.js';
import { ActivationValidationContract } from './activation/ActivationValidationContract.js';
import { CONTROLLED_ACTIVATION_BOUNDARY } from './activation/ControlledActivationBoundary.js';
import { INTEGRATION_COMPATIBILITY } from './integrations/IntegrationCompatibility.js';
import { INTEGRATION_BOUNDARY } from './integrations/IntegrationBoundary.js';
import { INTEGRATION_DEPENDENCY_MODEL } from './integrations/IntegrationDependencyModel.js';
import { IntegrationContract } from './integrations/IntegrationContract.js';
import { ECOSYSTEM_COMPATIBILITY } from './ecosystem/EcosystemCompatibility.js';
import { ECOSYSTEM_BOUNDARY } from './ecosystem/EcosystemBoundary.js';
import { CAPABILITY_ALIGNMENT_MODEL } from './ecosystem/CapabilityAlignmentModel.js';
import { PlatformDependencyContract } from './ecosystem/PlatformDependencyContract.js';
import { ArchitectureCertificationContract } from './governance-certification/ArchitectureCertificationContract.js';
import { GOVERNANCE_VALIDATION_MODEL } from './governance-certification/GovernanceValidationModel.js';
import { CAPABILITY_MATURITY_MODEL } from './governance-certification/CapabilityMaturityModel.js';
import { CERTIFICATION_BOUNDARY } from './governance-certification/CertificationBoundary.js';
import { ControlledActivationService, requestActivation } from './activation-runtime/ControlledActivationService.js';
import { validateActivation } from './activation-runtime/ActivationValidator.js';
import { decideActivation } from './activation-runtime/ActivationDecision.js';
import { ACTIVATION_RUNTIME_BOUNDARY } from './activation-runtime/ActivationRuntimeBoundary.js';
import { ControlledRegistryService, requestRegistryRegistration } from './registry-runtime/ControlledRegistryService.js';
import { validateRegistryRegistration } from './registry-runtime/RegistryRegistrationValidator.js';
import { decideRegistryRegistration } from './registry-runtime/RegistryDecision.js';
import { REGISTRY_RUNTIME_BOUNDARY } from './registry-runtime/RegistryRuntimeBoundary.js';
import { RuntimeExposureContract } from './runtime-exposure/RuntimeExposureContract.js';
import { requestRuntimeExposure } from './runtime-exposure/index.js';
import { RUNTIME_EXPOSURE_BOUNDARY } from './runtime-exposure/RuntimeExposureBoundary.js';
import { EventConsumptionContract as EventConsumptionContractV2 } from './event-consumption/EventConsumptionContract.js';
import { requestEventConsumption } from './event-consumption/index.js';
import { EVENT_CONSUMPTION_BOUNDARY } from './event-consumption/EventConsumptionBoundary.js';
import { DecisionContextContract as DecisionContextContractV2 } from './decision-context/DecisionContextContract.js';
import { buildDecisionContext } from './decision-context/DecisionContextBuilder.js';
import { requestDecisionContext } from './decision-context/index.js';
import { DECISION_CONTEXT_BOUNDARY } from './decision-context/DecisionContextBoundary.js';
import { PolicyEvaluationContract as PolicyEvaluationContractV2 } from './policy-evaluation/PolicyEvaluationContract.js';
import { buildPolicyContext } from './policy-evaluation/PolicyContextBuilder.js';
import { requestPolicyEvaluation } from './policy-evaluation/index.js';
import { POLICY_EVALUATION_BOUNDARY } from './policy-evaluation/PolicyEvaluationBoundary.js';
import { ResponsePreparationContract } from './response-preparation/ResponsePreparationContract.js';
import { buildResponseContext } from './response-preparation/ResponseContextBuilder.js';
import { requestResponsePreparation } from './response-preparation/index.js';
import { RESPONSE_PREPARATION_BOUNDARY } from './response-preparation/ResponsePreparationBoundary.js';
import { requestOperationalFlow } from './operational-flow/index.js';
import { OPERATIONAL_BOUNDARY } from './operational-flow/OperationalBoundary.js';
import { AlertCapabilityRendererContract } from './rendering/AlertCapabilityRendererContract.js';
import { buildRuntimeDescriptor } from './rendering/AlertRuntimeDescriptor.js';
import { requestRendering } from './rendering/index.js';
import { ALERT_RENDERING_BOUNDARY } from './rendering/AlertRenderingBoundary.js';
import { requestOperationalRendering } from './operational-rendering/index.js';
import { OPERATIONAL_RENDERING_BOUNDARY } from './operational-rendering/OperationalRenderingBoundary.js';
import { requestExperienceRegistration } from './experience-registration/index.js';
import { EXPERIENCE_BOUNDARY } from './experience-registration/ExperienceBoundary.js';
import { AlertExperienceExposureContract } from './experience-exposure/AlertExperienceExposureContract.js';
import { requestExperienceExposure } from './experience-exposure/index.js';
import { EXPERIENCE_EXPOSURE_BOUNDARY } from './experience-exposure/ExperienceExposureBoundary.js';
import { AlertRuntimeBindingContract } from './runtime-binding/AlertRuntimeBindingContract.js';
import { requestRuntimeBinding } from './runtime-binding/index.js';
import { RUNTIME_BINDING_BOUNDARY } from './runtime-binding/RuntimeBindingBoundary.js';
import { REGISTRY_COMPATIBILITY as REGISTRY_REGISTRATION_COMPATIBILITY } from './registry/RegistryCompatibility.js';
import { REGISTRY_BOUNDARY } from './registry/RegistryBoundary.js';
import { RegistryRegistrationContract } from './registry/RegistryRegistrationContract.js';
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
  responseCompatibility: RESPONSE_COMPATIBILITY,
  responseBoundary: RESPONSE_BOUNDARY,
  activationGovernance: ACTIVATION_GOVERNANCE,
  activationCompatibility: ACTIVATION_COMPATIBILITY,
  activationBoundary: ACTIVATION_BOUNDARY,
  controlledActivationBoundary: CONTROLLED_ACTIVATION_BOUNDARY,
  activationRequestModel: ActivationRequestModel,
  integrationCompatibility: INTEGRATION_COMPATIBILITY,
  integrationBoundary: INTEGRATION_BOUNDARY,
  integrationDependencyModel: INTEGRATION_DEPENDENCY_MODEL,
  ecosystemCompatibility: ECOSYSTEM_COMPATIBILITY,
  ecosystemBoundary: ECOSYSTEM_BOUNDARY,
  capabilityAlignmentModel: CAPABILITY_ALIGNMENT_MODEL,
  governanceValidationModel: GOVERNANCE_VALIDATION_MODEL,
  capabilityMaturityModel: CAPABILITY_MATURITY_MODEL,
  certificationBoundary: CERTIFICATION_BOUNDARY,
  activationRuntime: ControlledActivationService,
  activationRuntimeBoundary: ACTIVATION_RUNTIME_BOUNDARY,
  registryRuntime: ControlledRegistryService,
  registryRuntimeBoundary: REGISTRY_RUNTIME_BOUNDARY,
  runtimeExposure: requestRuntimeExposure,
  runtimeExposureBoundary: RUNTIME_EXPOSURE_BOUNDARY,
  eventConsumption: requestEventConsumption,
  eventConsumptionBoundary: EVENT_CONSUMPTION_BOUNDARY,
  decisionContext: requestDecisionContext,
  decisionContextBuilder: buildDecisionContext,
  decisionContextBoundary: DECISION_CONTEXT_BOUNDARY,
  policyEvaluation: requestPolicyEvaluation,
  policyContextBuilder: buildPolicyContext,
  policyEvaluationBoundary: POLICY_EVALUATION_BOUNDARY,
  responsePreparation: requestResponsePreparation,
  responseContextBuilder: buildResponseContext,
  responsePreparationBoundary: RESPONSE_PREPARATION_BOUNDARY,
  operationalFlow: requestOperationalFlow,
  operationalBoundary: OPERATIONAL_BOUNDARY,
  rendering: requestRendering,
  runtimeDescriptor: buildRuntimeDescriptor,
  renderingBoundary: ALERT_RENDERING_BOUNDARY,
  operationalRendering: requestOperationalRendering,
  operationalRenderingBoundary: OPERATIONAL_RENDERING_BOUNDARY,
  experienceRegistration: requestExperienceRegistration,
  experienceBoundary: EXPERIENCE_BOUNDARY,
  experienceExposure: requestExperienceExposure,
  experienceExposureBoundary: EXPERIENCE_EXPOSURE_BOUNDARY,
  runtimeBinding: requestRuntimeBinding,
  runtimeBindingBoundary: RUNTIME_BINDING_BOUNDARY,
  registryRegistrationCompatibility: REGISTRY_REGISTRATION_COMPATIBILITY,
  registryBoundary: REGISTRY_BOUNDARY,
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
    responseDefinition: ResponseDefinitionContract,
    activation: ActivationContract,
    controlledActivation: ControlledActivationContract,
    activationValidation: ActivationValidationContract,
    registryRegistration: RegistryRegistrationContract,
    integration: IntegrationContract,
    platformDependency: PlatformDependencyContract,
    architectureCertification: ArchitectureCertificationContract,
    runtimeExposure: RuntimeExposureContract,
    eventConsumption: EventConsumptionContractV2,
    decisionContext: DecisionContextContractV2,
    policyEvaluation: PolicyEvaluationContractV2,
    responsePreparation: ResponsePreparationContract,
    renderer: AlertCapabilityRendererContract,
    experienceExposure: AlertExperienceExposureContract,
    runtimeBinding: AlertRuntimeBindingContract,
    validator: ContractValidator,
  }),
});

export default AlertCapability;
