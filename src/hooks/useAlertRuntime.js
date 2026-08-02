import { useMemo } from 'react';
import AlertCapability from '../core/capabilities/alert/index.js';
import { provideAlertDashboardData } from '../core/capabilities/alert/runtime-consumption/AlertDashboardDataProvider.js';

/**
 * DEFAULT_ALERT_RULES
 *
 * Sprint 184 — Operational UI Consumption.
 *
 * Alert configuration consumed by the existing UI surfaces. There is no
 * persisted alert-rules store in the app; these representative rules
 * stand in for the module's operational alert configuration and flow
 * through the certified Runtime surfaces exactly like real rules would.
 *
 * Single source for ALL UI surfaces so the whole workspace shows the
 * same runtime truth (SSOT). The UI never calculates — it consumes.
 */

export const DEFAULT_ALERT_RULES = Object.freeze([
  {
    source: 'dynamicForms',
    formId: 'temperature-control',
    condition: { field: 'temperatura', operator: '>', value: 5 },
    priority: 'high',
    priorityLabel: 'Alta',
    message: 'Temperatura fuera del rango permitido',
    active: true,
  },
  {
    source: 'dynamicRecords',
    formId: 'mantenimiento',
    condition: { field: 'fecha', operator: '<=', value: 30 },
    priority: 'critical',
    priorityLabel: 'Crítica',
    message: 'Registro de temperatura superior al límite',
    active: true,
  },
  {
    source: 'documentRepository',
    documentType: 'poe-limpieza',
    condition: { field: 'fechaVencimiento', operator: '<=', value: 5 },
    priority: 'medium',
    priorityLabel: 'Media',
    message: 'Documento próximo a vencer',
    active: true,
  },
]);

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

/**
 * useAlertRuntime
 *
 * The ONLY UI consumption bridge for the Alert Capability.
 *
 * Consumes exclusively the certified facade surfaces:
 *   runtimeConsumption → alertContext per existing engine
 *   runtimeVisibility   → badges for existing renderers
 *   workspace           → Operational Workspace ViewModel + Action Descriptors
 *   AlertDashboardDataProvider → metrics for the existing Dashboard
 *
 * The UI NEVER computes, NEVER consults rules, NEVER queries Runtime
 * internals, NEVER creates navigation. It renders what these surfaces
 * return.
 */
export function useAlertRuntime({ moduleId, module, moduleSlug, rules = DEFAULT_ALERT_RULES }) {
  const base = useMemo(
    () => ({ capability: 'alerts', moduleAssigned: true, moduleId, module, moduleSlug }),
    [moduleId, module, moduleSlug],
  );
  const rulesKey = JSON.stringify(rules);

  const consumption = useMemo(
    () => AlertCapability.runtimeConsumption({ ...base, rules }),
    [base, rulesKey],
  );

  const visibility = useMemo(() => {
    if (!consumption) return null;
    return AlertCapability.runtimeVisibility({
      ...base,
      context: {
        dynamicForms: consumption.engines?.dynamicForms?.alertContext ?? null,
        dynamicRecords: consumption.engines?.dynamicRecords?.alertContext ?? null,
        documentRepository: consumption.engines?.documentRepository?.alertContext ?? null,
      },
    });
  }, [base, consumption]);

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

  return { consumption, visibility, workspace, dashboard, rules };
}

export default useAlertRuntime;
