/**
 * Alert Enterprise Activation
 *
 * Sprint 179 — Enterprise Capability Activation & Operational Validation.
 *
 * This module is the NON-INVASIVE bridge between the Alert Capability and
 * the real SGC-DM runtime pipeline:
 *
 *   - Registers the `alerts` package into CapabilityPackageRegistry
 *     (public registerPackage API — Core file untouched).
 *   - Registers the `alert-monitoring` experience into
 *     OperationalExperienceRegistry (public registerExperience API — Core
 *     file untouched).
 *   - Validates that the REAL pipeline now consumes the capability
 *     (listPackages, listExperiences, getExperienceContract, runtime binding).
 *
 * Activation is declarative registration ONLY. Execution stays controlled
 * (executionEnabled: false). The capability never creates UI, runtime,
 * persistence or engines.
 */

import { registerPackage, getPackage, listPackages } from '../../CapabilityPackageRegistry.js';
import { registerExperience, getExperience, getExperienceContract, listExperiences } from '../../experiences/OperationalExperienceRegistry.js';
import { requestRuntimeBinding } from '../runtime-binding/index.js';
import { ALERT_EXPERIENCE_DESCRIPTOR } from '../experience-registration/AlertExperienceDescriptor.js';
import { AlertEnterpriseActivationContract } from './AlertEnterpriseActivationContract.js';
import { validateEnterpriseActivation } from './AlertEnterpriseActivationValidator.js';
import { decideEnterpriseActivation } from './AlertEnterpriseActivationDecision.js';
import { ENTERPRISE_ACTIVATION_BOUNDARY } from './EnterpriseActivationBoundary.js';

export { AlertEnterpriseActivationContract, ENTERPRISE_ACTIVATION_VERSION } from './AlertEnterpriseActivationContract.js';
export { validateEnterpriseActivation } from './AlertEnterpriseActivationValidator.js';
export { decideEnterpriseActivation } from './AlertEnterpriseActivationDecision.js';
export { ENTERPRISE_ACTIVATION_BOUNDARY } from './EnterpriseActivationBoundary.js';

// ---------------------------------------------------------------------------
// Public descriptor — reused by the real CapabilityPackageRegistry
// ---------------------------------------------------------------------------

export const ALERT_CAPABILITY_PACKAGE = Object.freeze({
  packageKey: 'alerts',
  displayName: 'Alertas',
  description: 'Monitoreo operacional de alertas del módulo.',
  category: 'operational-control',
  icon: 'Bell',
  defaultOrder: 5,
  dependencies: [],
  visibility: 'public',
  enabledByDefault: false,
});

// ---------------------------------------------------------------------------
// Public descriptor — reused by the real OperationalExperienceRegistry
// ---------------------------------------------------------------------------

export const ALERT_OPERATIONAL_EXPERIENCE = Object.freeze({
  experienceKey: 'alert-monitoring',
  metadata: {
    name: 'Alertas',
    description:
      'Operational Configuration Experience. Produce el Alert Configuration Descriptor que consumen los motores existentes. No es una experiencia visual (renderable: false).',
    icon: 'Bell',
    version: '1.0',
    role: 'configuration',
    renderable: false,
  },
  capabilities: {
    supportsImport: false,
    supportsExport: false,
    supportsAudit: false,
    supportsDashboard: false,
    supportsHumanValidation: false,
  },
  ui: {
    tableFields: [],
    fieldDisplay: {},
    fieldMapping: {},
  },
  persistence: {},
  documentContract: {
    canonicalFields: [],
    synonyms: {},
    fieldNormalizers: {},
  },
  validationRules: {},
  businessRules: [],
  complianceRules: [],
  automationRules: [],
  visibilityRules: [],
  auditRules: {
    trackCompliance: false,
    trackImports: false,
    trackExports: false,
    trackRuleExecutions: false,
    trackVisibilityChanges: false,
  },
  dashboardRules: {
    enabled: false,
    trackTotals: false,
    trackCompliance: false,
    trackAuditMetrics: false,
    groupBy: [],
    trendBy: [],
    highlight: [],
  },
  documentMappingHints: {
    preferMetadata: false,
    preferTables: false,
    minimumTableColumns: 0,
  },
  recordBuilderHints: {
    allowMetadataInheritance: false,
    allowPartialRecords: false,
    minimumCompletenessScore: 0,
  },
  documentSegmentationHints: {
    allowCommercialInformation: false,
    allowFinancialInformation: false,
    allowAdministrativeInformation: false,
    preferOperationalInformation: false,
  },
  documentPatternHints: {
    preferredPatterns: [],
    allowMixedDocuments: false,
    minimumPatternConfidence: 0,
  },
  defaultOrder: 99,
  resolveComponent: undefined,
});

// ---------------------------------------------------------------------------
// Registration (idempotent) — via public Core registry APIs
// ---------------------------------------------------------------------------

function registerAlertsPackage() {
  if (!getPackage('alerts')) {
    registerPackage(ALERT_CAPABILITY_PACKAGE);
  }
  return getPackage('alerts') !== null;
}

function registerAlertExperience() {
  if (!getExperience('alert-monitoring')) {
    registerExperience(ALERT_OPERATIONAL_EXPERIENCE);
  }
  return getExperience('alert-monitoring') !== null;
}

// ---------------------------------------------------------------------------
// Activation orchestrator
// ---------------------------------------------------------------------------

export function activateEnterpriseCapability() {
  const packageRegistered = registerAlertsPackage();
  const experienceRegistered = registerAlertExperience();

  return Object.freeze({
    capabilityKey: 'alerts',
    activationMode: 'controlled',
    packageRegistered,
    experienceRegistered,
    executionEnabled: false,
    boundary: ENTERPRISE_ACTIVATION_BOUNDARY,
    contract: AlertEnterpriseActivationContract,
  });
}

// ---------------------------------------------------------------------------
// Operational validation against the REAL pipeline
// ---------------------------------------------------------------------------

export function validateOperationalConsumption() {
  const packageKeys = listPackages().map((p) => p.packageKey);
  const experienceKeys = listExperiences().map((e) => e.experienceKey);

  const packageConsumed = packageKeys.includes('alerts');
  const experienceConsumed = experienceKeys.includes('alert-monitoring');
  const experienceContractConsumed = getExperienceContract('alert-monitoring') !== null;

  const binding = requestRuntimeBinding({
    moduleId: 'enterprise-validation',
    module: 'enterprise-validation',
    capability: 'alerts',
    moduleAssigned: true,
    targets: ['dynamicForms', 'dynamicRecords', 'documentRepository'],
  });

  const runtimeConsumed = binding.available === true && binding.runtimeEnabled === true;

  return Object.freeze({
    capabilityKey: 'alerts',
    pipeline: Object.freeze({
      capabilityPackageRegistry: Object.freeze({
        consumed: packageConsumed,
        packages: packageKeys,
      }),
      operationalExperienceRegistry: Object.freeze({
        consumed: experienceConsumed,
        experiences: experienceKeys,
      }),
      experienceContract: Object.freeze({
        consumed: experienceContractConsumed,
      }),
      runtimeBinding: Object.freeze({
        consumed: runtimeConsumed,
        available: binding.available,
        runtimeEnabled: binding.runtimeEnabled,
        allowed: binding.allowed,
        executionEnabled: binding.executionEnabled,
      }),
    }),
    consumed: packageConsumed && experienceConsumed && experienceContractConsumed && runtimeConsumed,
    executionEnabled: false,
  });
}

// ---------------------------------------------------------------------------
// Request entry point — facade contract API
// ---------------------------------------------------------------------------

export function requestEnterpriseActivation(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      activated: false,
      executionEnabled: false,
      reasons: ['missing-activation-context'],
    });
  }

  if (request.capability !== 'alerts') {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      activated: false,
      executionEnabled: false,
      reasons: ['capability-not-registered'],
    });
  }

  if (request.execute === true || request.executionRequested === true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      activated: false,
      executionEnabled: false,
      blocked: true,
      reasons: ['execution-not-allowed'],
    });
  }

  const activation = activateEnterpriseCapability();
  const consumption = validateOperationalConsumption();

  const validation = validateEnterpriseActivation({
    capability: 'alerts',
    packageRegistered: activation.packageRegistered,
    experienceRegistered: activation.experienceRegistered,
    pipelineConsumption: consumption.consumed,
  });

  const decision = decideEnterpriseActivation(validation);

  return Object.freeze({
    capabilityKey: 'alerts',
    module: request.module || request.moduleId || null,
    decision: decision.decision,
    activated: decision.activated,
    packageRegistered: activation.packageRegistered,
    experienceRegistered: activation.experienceRegistered,
    pipelineConsumed: consumption.consumed,
    pipeline: consumption.pipeline,
    executionEnabled: false,
    reasons: decision.reasons,
    boundary: ENTERPRISE_ACTIVATION_BOUNDARY,
  });
}

export const ALERT_ENTERPRISE_ACTIVATION = Object.freeze({
  key: 'enterprise-activation',
  name: 'Alert Enterprise Activation',
  execution: false,
});

export default ALERT_ENTERPRISE_ACTIVATION;

// ---------------------------------------------------------------------------
// Bootstrap side-effect — performed once at module load time.
// Registers the capability into the real Core registries so the pipeline
// consumes it from the first app render onward.
// ---------------------------------------------------------------------------

activateEnterpriseCapability();
