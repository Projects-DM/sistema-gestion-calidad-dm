import { useMemo, useEffect, useState } from 'react';
import AlertCapability from '../core/capabilities/alert/index.js';
import { provideAlertDashboardData } from '../core/capabilities/alert/runtime-consumption/AlertDashboardDataProvider.js';
import { dynamicService } from '../services/dynamicService.js';
import { documentsService } from '../services/documentsService.js';

/**
 * useAlertRuntime — Sprint 185 (Runtime Binding Finalization)
 *
 * The ONLY UI consumption bridge for the Alert Capability.
 *
 * The UI NEVER computes rules, NEVER consults DEFAULT_ALERT_RULES,
 * NEVER queries Runtime internals and NEVER invents alert data.
 *
 * Flow:
 *   1. Collect the module's EXISTING operational resources via the
 *      existing services (forms, records, documents).
 *   2. Bind them through `AlertCapability.runtimeBinding` → Runtime
 *      Context derived 100% from existing resources.
 *   3. Derive the operational configuration rules from the bound
 *      alerts + real resource data (record status, form engine_type,
 *      real resource names). Nothing is invented.
 *   4. Consume ONLY the certified facade surfaces:
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
      return [];
    });
}

async function collectExistingResources({ moduleId, module, moduleSlug }) {
  const slug = moduleSlug || module || null;

  let resolvedModuleId = moduleId;
  if (!resolvedModuleId && slug) {
    const mod = await safeFetch(dynamicService.getModuleBySlug(slug));
    resolvedModuleId = mod?.id ?? null;
  }

  // Single-module context: collect that module's existing resources.
  if (resolvedModuleId || slug) {
    const [forms, records, documents] = await Promise.all([
      resolvedModuleId ? safeFetch(dynamicService.getFormsByModule(resolvedModuleId)) : Promise.resolve([]),
      resolvedModuleId ? safeFetch(dynamicService.getModuleResponses(resolvedModuleId)) : Promise.resolve([]),
      slug ? safeFetch(documentsService.getRecords(slug)) : Promise.resolve([]),
    ]);
    return { forms, records, documents };
  }

  // Global context (Dashboard): aggregate the existing resources across
  // all runtime modules so the dashboard only counts existing Runtime.
  const modules = await safeFetch(dynamicService.getRuntimeModules());
  const results = await Promise.all(
    (modules || []).map((mod) =>
      Promise.all([
        safeFetch(dynamicService.getFormsByModule(mod.id)),
        safeFetch(dynamicService.getModuleResponses(mod.id)),
        safeFetch(documentsService.getRecords(mod.slug)),
      ]).then(([forms, records, documents]) => ({ forms, records, documents })),
    ),
  );

  return {
    forms: results.flatMap((r) => r.forms),
    records: results.flatMap((r) => r.records),
    documents: results.flatMap((r) => r.documents),
  };
}

/**
 * Derives the operational configuration rules from the Runtime Binding.
 *
 * Every priority / priorityLabel / message is DERIVED from the real
 * existing resource data:
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
      const record = (binding.existing?.records || []).find((r) => String(r.id) === String(alert.resourceId));
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

  const binding = useMemo(() => {
    if (!existing) return null;
    return AlertCapability.runtimeBinding({ ...base, existing });
  }, [base, existing]);

  const rules = useMemo(() => {
    if (!binding) return [];
    return deriveRulesFromBinding(binding, existing);
  }, [binding, existing]);

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

  return { consumption, visibility, workspace, dashboard, rules, existing, binding };
}

export default useAlertRuntime;
