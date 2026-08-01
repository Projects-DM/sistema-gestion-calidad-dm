/**
 * AlertWorkspaceBuilder
 *
 * Sprint 182-R — Builds operational cards for the Workspace.
 *
 * Builder ONLY. Never executes, never navigates directly, never
 * consults engines, never knows React Router.
 */

import { buildAlertVisualDescriptor } from '../runtime-visibility/AlertVisualDescriptor.js';
import { resolveAlertNavigation } from './AlertNavigationResolver.js';
import { buildActionDescriptor } from './AlertWorkspaceActionDescriptor.js';

const SOURCE_TYPES = Object.freeze({
  dynamicForms: { tipo: 'Formulario', origen: 'Dynamic Forms' },
  dynamicRecords: { tipo: 'Registro', origen: 'Dynamic Records' },
  documentRepository: { tipo: 'Documento', origen: 'Document Repository' },
});

export function buildAlertWorkspaceCard(alert, moduleId) {
  const mergedAlert = { ...alert, moduleId: moduleId || alert.moduleId };

  const visual = buildAlertVisualDescriptor({
    status: alert.status || 'attention',
    priority: alert.priority,
    priorityLabel: alert.priorityLabel,
    message: alert.message,
  });

  const navigation = resolveAlertNavigation(mergedAlert);
  const action = buildActionDescriptor(mergedAlert, navigation);

  const sourceInfo = SOURCE_TYPES[alert.source] || { tipo: alert.source || null, origen: null };
  const activeCount = Number(alert.activeCount ?? alert.count ?? (alert.active ? 1 : 1));

  return Object.freeze({
    id: alert.id || alert.alertId || null,
    title: alert.title || alert.message || 'Alerta operacional',
    tipo: sourceInfo.tipo,
    source: alert.source || null,
    sourceLabel: alert.sourceLabel || sourceInfo.origen,
    origen: alert.module || moduleId || null,
    module: alert.module || moduleId || null,
    priority: alert.priority || null,
    priorityLabel: visual.visual ? visual.visual.priorityLabel : alert.priorityLabel || null,
    estado: `${activeCount} ${activeCount === 1 ? 'alerta activa' : 'alertas activas'}`,
    activeCount,
    message: alert.message || null,
    icon: visual.visual ? visual.visual.icon : null,
    color: visual.visual ? visual.visual.color : null,
    status: alert.status || 'attention',
    action,
    navigationLabel: navigation.label,
    navigable: navigation.navigable,
  });
}

export default buildAlertWorkspaceCard;
