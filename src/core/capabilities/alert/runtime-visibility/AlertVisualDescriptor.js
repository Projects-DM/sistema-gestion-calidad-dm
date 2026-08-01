/**
 * AlertVisualDescriptor
 *
 * Sprint 181 — Transforms the Runtime Alert Context into visual
 * information (icon, color, label, tooltip) for existing renderers.
 *
 * Visual ONLY. Never executes rules, never evaluates conditions.
 */

import { resolvePriority, PRIORITY_LABELS } from '../operational-configuration/AlertPriorityPolicy.js';

export const PRIORITY_VISUALS = Object.freeze({
  low: Object.freeze({ icon: 'Info', color: 'gray', label: 'Baja', tooltip: 'Alerta de baja prioridad' }),
  medium: Object.freeze({ icon: 'AlertTriangle', color: 'yellow', label: 'Media', tooltip: 'Requiere atención' }),
  high: Object.freeze({ icon: 'AlertOctagon', color: 'orange', label: 'Alta', tooltip: 'Prioridad alta' }),
  critical: Object.freeze({ icon: 'AlertOctagon', color: 'red', label: 'Crítica', tooltip: 'Condición crítica' }),
});

export const STATUS_VISUALS = Object.freeze({
  expiring: Object.freeze({ icon: 'AlertTriangle', color: 'yellow', label: 'Próximo a vencer', tooltip: 'Documento próximo a vencer' }),
  expired: Object.freeze({ icon: 'AlertOctagon', color: 'red', label: 'Vencido', tooltip: 'Documento vencido' }),
  critical: Object.freeze({ icon: 'AlertOctagon', color: 'red', label: 'Crítica', tooltip: 'Condición crítica' }),
  attention: Object.freeze({ icon: 'AlertTriangle', color: 'yellow', label: 'Atención', tooltip: 'Requiere atención' }),
});

export function buildAlertVisualDescriptor(alertContext) {
  if (!alertContext) {
    return Object.freeze({ available: false, visual: null, reasons: ['missing-alert-context'] });
  }

  const priority = resolvePriority(alertContext.priority).level;
  const priorityLabel = alertContext.priorityLabel || PRIORITY_LABELS[priority];

  const status = alertContext.status || 'attention';
  const statusVisual = STATUS_VISUALS[status];

  if (statusVisual && status !== 'attention') {
    return Object.freeze({
      available: true,
      visual: Object.freeze({
        icon: statusVisual.icon,
        color: statusVisual.color,
        label: statusVisual.label,
        tooltip: alertContext.message || statusVisual.tooltip,
        message: alertContext.message || null,
        status,
        priority,
        priorityLabel,
      }),
      reasons: [],
    });
  }

  const priorityVisual = PRIORITY_VISUALS[priority] || PRIORITY_VISUALS.medium;

  return Object.freeze({
    available: true,
    visual: Object.freeze({
      icon: priorityVisual.icon,
      color: priorityVisual.color,
      label: priorityLabel,
      tooltip: alertContext.message || priorityVisual.tooltip,
      message: alertContext.message || null,
      status,
      priority,
      priorityLabel,
    }),
    reasons: [],
  });
}

export default buildAlertVisualDescriptor;
