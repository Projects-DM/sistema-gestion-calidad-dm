import { useMemo, useEffect, useState } from 'react';
import AlertCapability from '../core/capabilities/alert/index.js';
import { provideAlertDashboardData } from '../core/capabilities/alert/runtime-consumption/AlertDashboardDataProvider.js';
import { dynamicService } from '../services/dynamicService.js';
import { documentsService } from '../services/documentsService.js';
import { documentRepositoriesService } from '../services/documentRepositoriesService.js';

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

  // Global context (Dashboard): audit EVERY runtime module and aggregate.
  const modules = await safeFetch(dynamicService.getModules());
  const runtimeModules = (modules || []).filter((m) => m.visible !== false && m.state !== 'archived' && m.state !== 'deprecated');

  const collected = await Promise.all(
    (runtimeModules || []).map((mod) =>
      collectModuleOperationalData({ moduleId: mod.id, slug: mod.slug }),
    ),
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
 * Derives the operational configuration rules from the Runtime Binding.
 *
 * Every priority / priorityLabel / message is DERIVED from the real
 * VISIBLE existing resource data:
 *   - record status computed by the collector (critico → critical,
 *     advertencia → high)
 *   - form engine_type (BaseMediciones → high, otherwise medium)
 *   - real resource names as messages
 *
 * The Runtime Binding itself never produces priority/message/status —
 * those belong to the existing Runtime.
 */
export function deriveRulesFromBinding(binding, existing) {
  if (!binding?.boundAlerts || !Array.isArray(binding.boundAlerts)) return [];

  return binding.boundAlerts.map((alert) => {
    if (alert.source === 'dynamicForms') {
      const form = (existing?.forms || []).find((f) => String(f.id) === String(alert.resourceId));
      const priority = form?.engine_type === 'BaseMediciones' ? 'high' : 'medium';
      return {
        source: 'dynamicForms',
        formId: alert.resource,
        condition: alert.condition,
        priority,
        priorityLabel: priority === 'high' ? 'Alta' : 'Media',
        message: form?.name ? `Formulario ${form.name}` : `Formulario ${alert.resource}`,
        active: true,
      };
    }

    if (alert.source === 'dynamicRecords') {
      const record = (existing?.records || []).find((r) => String(r.id) === String(alert.resourceId));
      const status = record?.status || 'advertencia';
      const priority = status === 'critico' ? 'critical' : 'high';
      const issues = record?.criticalIssues?.length ? record.criticalIssues.join('; ') : null;
      return {
        source: 'dynamicRecords',
        recordType: alert.resource,
        condition: alert.condition,
        priority,
        priorityLabel: priority === 'critical' ? 'Crítica' : 'Alta',
        message: issues || `Registro ${record?.formName || alert.resource} requiere atención`,
        active: true,
      };
    }

    const doc = (existing?.documents || []).find((d) => String(d.id) === String(alert.resourceId));
    return {
      source: 'documentRepository',
      documentType: alert.resource,
      condition: alert.condition,
      priority: 'medium',
      priorityLabel: 'Media',
      message: doc?.name ? `Documento ${doc.name} en repositorio` : `Documento ${alert.resource}`,
      active: true,
    };
  });
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
    if (a.source === 'documentRepository') return { ...common, documentType: a.resource };
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
    return deriveRulesFromBinding(binding, binding.existing || visibleExisting);
  }, [binding, visibleExisting]);

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
    });
  }, [base, consumption, module]);

  const dashboard = useMemo(() => {
    if (!consumption) return null;
    return provideAlertDashboardData({
      ...base,
      configurationDescriptor: consumption.configurationDescriptor,
    });
  }, [base, consumption]);

  return { consumption, visibility, workspace, dashboard, rules, existing, visibleExisting, audit, binding };
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
