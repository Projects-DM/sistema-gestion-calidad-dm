/**
 * AlertWorkspaceBuilder
 *
 * Sprint 181 (iteración 2) — Builds operational cards for the Workspace.
 *
 * Builder ONLY. Never executes, never navigates directly.
 */

import { buildAlertVisualDescriptor } from '../runtime-visibility/AlertVisualDescriptor.js';
import { resolveAlertNavigation } from './AlertNavigationResolver.js';
import { buildActionDescriptor } from './AlertWorkspaceActionDescriptor.js';

export function buildAlertWorkspaceCard(alert, moduleId) {
  const visual = buildAlertVisualDescriptor({
    status: alert.status || 'attention',
    priority: alert.priority,
    priorityLabel: alert.priorityLabel,
    message: alert.message,
  });

  const navigation = resolveAlertNavigation(alert);
  const action = buildActionDescriptor({ ...alert, moduleId: moduleId || alert.moduleId }, navigation);

  return Object.freeze({
    id: alert.id || alert.alertId || null,
    title: alert.title || alert.message || 'Alerta operacional',
    source: alert.source || null,
    sourceLabel: alert.sourceLabel || null,
    module: alert.module || moduleId || null,
    priority: alert.priority || null,
    priorityLabel: visual.visual ? visual.visual.priorityLabel : alert.priorityLabel || null,
    message: alert.message || null,
    icon: visual.visual ? visual.visual.icon : null,
    color: visual.visual ? visual.visual.color : null,
    status: alert.status || 'attention',
    action,
  });
}

export default buildAlertWorkspaceCard;
