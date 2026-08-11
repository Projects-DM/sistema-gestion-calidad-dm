import { useMemo, useEffect, useState } from 'react';
import AlertCapability from '../core/capabilities/alert/index.js';
import { provideAlertDashboardData } from '../core/capabilities/alert/runtime-consumption/AlertDashboardDataProvider.js';
import { provideNotificationRequests } from '../core/capabilities/alert/notification-activation/NotificationActivationProvider.js';
import { provideLifecycleRecords } from '../core/capabilities/alert/lifecycle/AlertLifecycleProvider.js';
import { provideOperationalActions } from '../core/capabilities/alert/operational-actions/AlertOperationalActionProvider.js';
import {
  evaluateAlertEnrollments,
  PRIORITY_LABELS,
} from '../core/capabilities/alert/operational-configuration/index.js';
import { dynamicService } from '../services/dynamicService.js';
import { documentsService } from '../services/documentsService.js';
import { documentRepositoriesService } from '../services/documentRepositoriesService.js';
import { dashboardService } from '../modules/dashboard/services/dashboardService.js';
import projectCurrentOccurrences from '../core/capabilities/alert/occurrence/OccurrenceProjection.js';
import {
  wireCompletionBridge,
  registerCompletionOccurrenceProvider,
} from '../core/capabilities/alert/occurrence/CompletionBridge.js';

/**
 * useAlertRuntime — Sprint 186 (Operational Resource Integrity Audit)
 *
 * The ONLY UI consumption bridge for the Alert Capability.
 *
 * The UI NEVER computes rules, NEVER consults DEFAULT_ALERT_RULES,
 * NEVER queries Runtime internals and NEVER invents alert data.
 *
 * Flow:
 *   1. Collect the module's EXISTING operational resources via the
 *      existing services (forms, records, documents + document
 *      repositories/categories for visibility).
 *   2. Run the Operational Resource Integrity Audit
 *      (AlertCapability.runtimeAudit) → ONLY the VISIBLE resources
 *      (the Operational Resource Set) survive.
 *   3. Bind ONLY the visible set through
 *      `AlertCapability.runtimeBinding` → Runtime Context derived 100%
 *      from visible existing resources. Orphan/archived/hidden/
 *      detached resources NEVER reach the Runtime.
 *   4. Derive the operational configuration rules from the bound
 *      alerts + real visible resource data.
 *   5. Consume ONLY the certified facade surfaces:
 *        runtimeConsumption → alertContext per existing engine
 *        runtimeVisibility   → badges for existing renderers
 *        workspace           → Operational Workspace ViewModel
 *        AlertDashboardDataProvider → metrics for the existing Dashboard
 */

function safeFetch(promise) {
  return Promise.resolve()
    .then(() => promise)
    .catch((err) => {
      console.error('[useAlertRuntime] collect existing resource failed:', err?.message || err);
      return null;
    });
}

async function collectModuleOperationalData({ moduleId, slug }) {
  let module = null;
  if (moduleId) {
    module = await safeFetch(dynamicService.getModuleById({ moduleId }));
  } else if (slug) {
    module = await safeFetch(dynamicService.getModuleBySlug(slug));
  }

  const effectiveId = moduleId || module?.id || null;
  const effectiveSlug = slug || module?.slug || null;

  const [forms, records, documents, repositories] = await Promise.all([
    effectiveId ? safeFetch(dynamicService.getFormsByModule(effectiveId)) : Promise.resolve([]),
    effectiveId ? safeFetch(dynamicService.getModuleResponses(effectiveId)) : Promise.resolve([]),
    effectiveSlug ? safeFetch(documentsService.getRecords(effectiveSlug)) : Promise.resolve([]),
    effectiveSlug ? safeFetch(documentRepositoriesService.getRepositories({ moduleSlug: effectiveSlug })) : Promise.resolve([]),
  ]);

  let categories = [];
  if (Array.isArray(repositories) && repositories.length > 0) {
    const categoryResults = await Promise.all(
      repositories.map((repo) => safeFetch(documentRepositoriesService.getCategories(repo.id))),
    );
    categories = categoryResults.flat().filter(Boolean);
  }

  return { module, forms, records, documents, repositories, categories };
}

async function collectExistingResources({ moduleId, module, moduleSlug }) {
  const slug = moduleSlug || module || null;

  // Single-module context: audit that module's existing resources.
  if (moduleId || slug) {
    return collectModuleOperationalData({ moduleId, slug });
  }

  // Global context (Dashboard) — Sprint 195: Shared Query Layer.
  //
  // The Dashboard already loads this data through the SAME existing queries:
  //   - modules    → dynamicService.getRuntimeModules()  (GET_RUNTIME_MODULES)
  //   - responses  → dashboardService.getRawResponses()   (Dashboard Metrics)
  // The in-flight de-duplication in those queries merges both consumers into
  // a single network request per query. Alert Runtime therefore NEVER re-fetches
  // sgc_modules or sgc_form_responses, and it depends ONLY on the Query Layer —
  // never on Dashboard React state.
  const [modules, responses] = await Promise.all([
    safeFetch(dynamicService.getRuntimeModules()),
    safeFetch(dashboardService.getRawResponses()),
  ]);

  const runtimeModules = (modules || []).filter(
    (m) => m.visible !== false && m.state !== 'archived' && m.state !== 'deprecated',
  );

  const collected = await Promise.all(
    (runtimeModules || []).map(async (mod) => {
      // Records come from the SHARED responses query, grouped by module.
      const moduleResponses = (responses || []).filter(
        (r) => String(r?.sgc_forms?.module_id) === String(mod.id),
      );

      // Alert Runtime ONLY queries what the Dashboard does not own.
      const [forms, documents, repositories] = await Promise.all([
        safeFetch(dynamicService.getFormsByModule(mod.id)),
        safeFetch(documentsService.getRecords(mod.slug)),
        safeFetch(documentRepositoriesService.getRepositories({ moduleSlug: mod.slug })),
      ]);

      let categories = [];
      if (Array.isArray(repositories) && repositories.length > 0) {
        const categoryResults = await Promise.all(
          repositories.map((repo) => safeFetch(documentRepositoriesService.getCategories(repo.id))),
        );
        categories = categoryResults.flat().filter(Boolean);
      }

      return {
        module: mod,
        forms: forms || [],
        records: moduleResponses,
        documents: documents || [],
        repositories: repositories || [],
        categories,
      };
    }),
  );

  const report = collected
    .map((data) => AlertCapability.runtimeAudit({
      forms: data.forms,
      records: data.records,
      documents: data.documents,
      module: data.module,
      repositories: data.repositories,
      categories: data.categories,
    }).report)
    .filter(Boolean);

  return {
    module: null,
    global: true,
    modules: collected,
    globalReport: report,
    forms: collected.flatMap((c) => c.forms),
    records: collected.flatMap((c) => c.records),
    documents: collected.flatMap((c) => c.documents),
    repositories: collected.flatMap((c) => c.repositories),
    categories: collected.flatMap((c) => c.categories),
  };
}

/**
 * Resolves the RAW resource object that OWNS the Alert Configuration of a
 * bound alert. The RESOURCE is always the metadata owner (SSOT, Sprint 197):
 *   - dynamicForms        → the form
 *   - dynamicRecords      → the form the record belongs to
 *   - documentRepository  → the repository that hosts the document
 *
 * The Runtime NEVER reads the resource's alert configuration directly — it
 * only hands the resource to the AlertConfigurationResolver (the only owner).
 */
function resolveResourceForAlert(alert, resources) {
  if (!alert || !resources || typeof resources !== 'object') return null;

  if (alert.source === 'dynamicForms') {
    return (resources.forms || []).find((f) => String(f.id) === String(alert.resourceId)) || null;
  }

  if (alert.source === 'dynamicRecords') {
    const record = (resources.records || []).find((r) => String(r.id) === String(alert.resourceId)) || null;
    if (!record) return null;
    const formId = record?.sgc_forms?.id ?? record?.form_id ?? record?.formId ?? null;
    if (formId) {
      return (resources.forms || []).find((f) => String(f.id) === String(formId)) || record;
    }
    return record;
  }

  if (alert.source === 'documentRepository') {
    const doc = (resources.documents || []).find((d) => String(d.id) === String(alert.resourceId)) || null;
    const repositoryId = doc?.repository_id ?? doc?.repositoryId ?? null;
    if (repositoryId) {
      const repo = (resources.repositories || []).find((r) => String(r.id) === String(repositoryId)) || null;
      if (repo) return repo;
    }
    return doc || null;
  }

  return null;
}

/**
 * Sprint 198.R — PURE transport of the AlertConfiguration Value Object into
 * a runtime rule. Copies every canonical field AS-IS. Never interprets,
 * never transforms, never re-defaults. The Runtime assumes the configuration
 * is ALWAYS complete (guaranteed by the MetadataNormalizer).
 */
function transportConfiguration(configuration) {
  return Object.freeze({
    enabled: configuration.enabled,
    periodicity: configuration.periodicity,
    expiration: configuration.expiration,
    risk: configuration.risk,
    priority: configuration.priority,
    notification: configuration.notification,
    gracePeriod: configuration.gracePeriod,
    automaticClose: configuration.automaticClose,
    repeatPolicy: configuration.repeatPolicy,
  });
}

/**
 * Derives the operational configuration rules from the Runtime Binding.
 *
 * Sprint 198.R — The Runtime NEVER interprets metadata. Every configuration
 * value is transported AS-IS from the AlertConfigurationResolver (SSOT,
 * Sprint 197) into the rule. The descriptor conceptually separates:
 *
 *   Runtime Information:  source, resourceId/condition, message
 *   Configuration Info:   enabled, priority, repeatPolicy, notification,
 *                         automaticClose, gracePeriod, periodicity,
 *                         expiration, risk
 *
 * The Runtime knows ONLY `configuration` (a frozen Value Object). It never
 * reads storage keys, never knows special forms/modules and never writes
 * configuration values. The `enabled` existence decision goes through the
 * Resolver (`shouldProduceAlert`).
 *
 * @param {Object} binding Runtime Binding (boundAlerts).
 * @param {Object} [collected] Collected/visible snapshot (message identity).
 * @param {Object} [runtimeResources] RAW existing resources (metadata owner).
 * @returns {Array} Derived rules.
 */
export function deriveRulesFromBinding(binding, collected, runtimeResources) {
  if (!binding?.boundAlerts || !Array.isArray(binding.boundAlerts)) return [];

  const snapshot = collected || runtimeResources || {};
  const resources = runtimeResources || snapshot;

  return binding.boundAlerts
    .flatMap((alert) => {
      const resource = resolveResourceForAlert(alert, resources);

      // Sprint 211 / 261 — EXPLICIT ENROLLMENT (LEVEL 5). A resource ONLY
      // enters the Runtime when it holds explicit, non-empty, ENABLED
      // configuration (E1–E4). Creating a Form/Repository/Document/Record
      // NEVER generates an implicit alert; resources never configured by the
      // user are IGNORED entirely: no rule, no descriptor, no Dashboard card.
      // Sprint 261 — MULTI-ALERT: `evaluateAlertEnrollments` evaluates E1–E4
      // per configuration, so ONE resource with MULTIPLE enrolled configs
      // produces ONE rule (and one alert identity) PER enrolled configuration.
      // The single-configuration case is backward compatible (one item → one
      // rule, AC-01/AC-13).
      const enrollments = evaluateAlertEnrollments(resource);
      const enrolled = enrollments.items.filter((i) => i.enrolled === true);
      if (enrolled.length === 0) return [];

      return enrolled.map((item) => {
        const configuration = item.configuration;

        const transport = transportConfiguration(configuration);
        const priority = transport.priority;
        const priorityLabel = PRIORITY_LABELS[priority] || 'Media';
        const base = {
          source: null,
          alertId: item.alertId,
          condition: alert.condition,
          priority,
          priorityLabel,
          active: transport.enabled,
          ...transport,
          prioritySource: enrollments.source,
        };

        if (alert.source === 'dynamicForms') {
          const form = (snapshot?.forms || []).find((f) => String(f.id) === String(alert.resourceId)) || null;
          return Object.freeze({
            ...base,
            source: 'dynamicForms',
            formId: alert.resource,
            message: form?.name ? `Formulario ${form.name}` : `Formulario ${alert.resource}`,
          });
        }

        if (alert.source === 'dynamicRecords') {
          const record = (snapshot?.records || []).find((r) => String(r.id) === String(alert.resourceId)) || null;
          const issues = record?.criticalIssues?.length ? record.criticalIssues.join('; ') : null;
          return Object.freeze({
            ...base,
            source: 'dynamicRecords',
            recordType: alert.resource,
            message: issues || `Registro ${record?.formName || alert.resource} requiere atención`,
          });
        }

        const doc = (snapshot?.documents || []).find((d) => String(d.id) === String(alert.resourceId)) || null;
        return Object.freeze({
          ...base,
          source: 'documentRepository',
          documentType: alert.resource,
          documentId: doc?.id ?? doc?.type ?? alert.resourceId ?? null,
          message: doc?.name ? `Documento ${doc.name} en repositorio` : `Documento ${alert.resource}`,
        });
      });
    })
    .filter(Boolean);
}

function alertsFromDescriptor(descriptor, module) {
  if (!descriptor || !Array.isArray(descriptor.alerts)) return [];

  return descriptor.alerts.map((a) => {
    const common = {
      id: a.resource,
      source: a.source,
      module,
      priority: a.priority,
      priorityLabel: a.priorityLabel,
      status: a.priority === 'critical' ? 'critical' : 'attention',
      message: a.message,
      activeCount: a.active === false ? 0 : 1,
    };
    if (a.source === 'dynamicForms') return { ...common, formId: a.resource };
    if (a.source === 'dynamicRecords') return { ...common, recordType: a.resource };
    if (a.source === 'documentRepository') return { ...common, documentType: a.resource, documentId: a.documentId || null };
    return common;
  });
}

export function useAlertRuntime({ moduleId, module, moduleSlug } = {}) {
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    let cancelled = false;
    collectExistingResources({ moduleId, module, moduleSlug }).then((data) => {
      if (cancelled) return;
      setExisting(data);
    });
    return () => {
      cancelled = true;
    };
  }, [moduleId, module, moduleSlug]);

  const base = useMemo(
    () => ({ capability: 'alerts', moduleAssigned: true, moduleId, module, moduleSlug }),
    [moduleId, module, moduleSlug],
  );

  const audit = useMemo(() => {
    if (!existing) return null;
    if (existing.global) {
      const audits = (existing.modules || []).map((data) =>
        AlertCapability.runtimeAudit({
          forms: data.forms,
          records: data.records,
          documents: data.documents,
          module: data.module,
          repositories: data.repositories,
          categories: data.categories,
        }),
      );
      const reports = audits.map((a) => a.report).filter(Boolean);
      return {
        global: true,
        moduleAudits: audits,
        report: mergeAuditReports(reports),
      };
    }
    return AlertCapability.runtimeAudit({
      forms: existing.forms,
      records: existing.records,
      documents: existing.documents,
      module: existing.module,
      repositories: existing.repositories,
      categories: existing.categories,
    });
  }, [existing]);

  // The Operational Resource Set — ONLY visible resources may reach the Runtime.
  const visibleExisting = useMemo(() => {
    if (!audit) return null;
    if (audit.global) {
      return {
        forms: (audit.moduleAudits || []).flatMap((a) => a.operational.forms),
        records: (audit.moduleAudits || []).flatMap((a) => a.operational.records),
        documents: (audit.moduleAudits || []).flatMap((a) => a.operational.documents),
      };
    }
    return audit.operational;
  }, [audit]);

  const binding = useMemo(() => {
    if (!visibleExisting) return null;
    return AlertCapability.runtimeBinding({ ...base, existing: visibleExisting });
  }, [base, visibleExisting]);

  const rules = useMemo(() => {
    if (!binding) return [];
    // Sprint 198 — deriveRulesFromBinding consumes the AlertConfigurationResolver
    // exclusively. `existing` (RAW resources) provides the metadata owner;
    // `binding.existing || visibleExisting` provides message identity.
    return deriveRulesFromBinding(binding, binding.existing || visibleExisting, existing);
  }, [binding, visibleExisting, existing]);

  const consumption = useMemo(() => {
    if (!binding) return null;
    return AlertCapability.runtimeConsumption({ ...base, rules });
  }, [base, binding, rules]);

  const visibility = useMemo(() => {
    if (!consumption) return null;
    const boundSources = new Set((binding?.boundAlerts ?? []).map((a) => a.source));
    return AlertCapability.runtimeVisibility({
      ...base,
      context: {
        dynamicForms: boundSources.has('dynamicForms')
          ? (consumption.engines?.dynamicForms?.alertContext ?? null)
          : null,
        dynamicRecords: boundSources.has('dynamicRecords')
          ? (consumption.engines?.dynamicRecords?.alertContext ?? null)
          : null,
        documentRepository: boundSources.has('documentRepository')
          ? (consumption.engines?.documentRepository?.alertContext ?? null)
          : null,
      },
    });
  }, [base, consumption, binding]);

  const workspace = useMemo(() => {
    if (!consumption) return null;
    const descriptor = consumption.configurationDescriptor;
    return AlertCapability.workspace({
      ...base,
      alerts: alertsFromDescriptor(descriptor, module),
      evaluationEntries: consumption.evaluationEntries,
    });
  }, [base, consumption, module]);

  const dashboard = useMemo(() => {
    if (!consumption) return null;
    return provideAlertDashboardData({
      ...base,
      configurationDescriptor: consumption.configurationDescriptor,
      evaluationEntries: consumption.evaluationEntries,
    });
  }, [base, consumption]);

  // Sprint 210 — R5: Notification consumes the certified Consumption entries
  // + the persisted `notification` intent transported from the resolved
  // configuration. Notification NEVER decides when to execute.
  const notification = useMemo(() => {
    if (!consumption || !rules.length) return null;
    const intent = rules.find((r) => r.notification)?.notification ?? null;
    return provideNotificationRequests({
      ...base,
      evaluationEntries: consumption.evaluationEntries,
      notification: intent,
    });
  }, [base, consumption, rules]);

  // Sprint 210 — R6: Lifecycle persists ONLY the certified Consumption entries;
  // the timestamp is transported (the hook supplies it; Lifecycle never generates time).
  const lifecycle = useMemo(() => {
    if (!consumption) return null;
    return provideLifecycleRecords({
      ...base,
      evaluationEntries: consumption.evaluationEntries,
      timestamp: null,
    });
  }, [base, consumption]);

  // Sprint 210 — R7: Operational Actions operate on the real Alert IDs derived
  // from the certified Consumption entries; user intents are transported in.
  const operationalActions = useMemo(() => {
    if (!consumption) return null;
    return provideOperationalActions({
      ...base,
      evaluationEntries: consumption.evaluationEntries,
      actions: [],
    });
  }, [base, consumption]);

  // Sprint 257 — OCCURRENCE SURFACE. The runtime wires the ONE operational
  // completion signal (single subscription, idempotent) and projects the
  // current occurrences of the visible enrolled collections via the certified
  // schedule (pure read, OCC-CERT-01..05). Additive: the existing CD surfaces
  // are untouched.
  //
  // Sprint 280 — F6. Registers the certified projection as the bridge's
  // OccurrenceProvider so `origin='resource'` intents select ONE eligible
  // occurrence deterministically (DeterministicCompletionResolver) without the
  // bridge fetching or re-evaluating anything.
  useEffect(() => {
    const unwire = wireCompletionBridge();
    registerCompletionOccurrenceProvider(() =>
      projectCurrentOccurrences(existing, base.moduleId ?? moduleSlug ?? module),
    );
    return () => unwire?.();
  }, [existing, base, moduleId, module, moduleSlug]);

  const occurrences = useMemo(() => {
    if (!existing) return null;
    return projectCurrentOccurrences(existing, base.moduleId ?? moduleSlug ?? module);
  }, [existing, base, moduleId, module, moduleSlug]);

  return {
    consumption,
    visibility,
    workspace,
    dashboard,
    notification,
    lifecycle,
    operationalActions,
    rules,
    existing,
    visibleExisting,
    audit,
    binding,
    occurrences,
  };
}

function mergeAuditReports(reports) {
  const keys = ['scanned', 'valid', 'orphan', 'archived', 'hidden', 'rejected'];
  const sources = ['forms', 'records', 'documents'];
  const merged = {};
  for (const key of keys) {
    merged[key] = {};
    for (const source of sources) {
      merged[key][source] = reports.reduce((sum, r) => sum + (r?.[key]?.[source] ?? 0), 0);
    }
    merged[key].total = merged[key].forms + merged[key].records + merged[key].documents;
  }
  return merged;
}

export default useAlertRuntime;
