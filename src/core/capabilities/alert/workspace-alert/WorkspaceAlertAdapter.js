/**
 * WorkspaceAlertAdapter
 *
 * Sprint 204 — Alert Workspace Runtime Integration.
 *
 * Adapts a certified Consumption entry `{ descriptor, evaluation }` into a
 * Workspace Alert View Model (card). It copies ONLY the permitted consumption
 * fields:
 *
 *   descriptor.message, descriptor.priority
 *   evaluation.status, severity, remaining, nextDue, transition, overdue,
 *   escalation
 *
 * It NEVER calculates, NEVER interprets and NEVER consults metadata. It reuses
 * the certified Consumption Mapper for visual presentation (icon/color/label)
 * — it does not derive state itself.
 *
 * Adapter ONLY. Never executes, never recomputes. AlertEvaluation stays
 * immutable (it is only read, never modified).
 */

import { mapEvaluationToConsumption } from '../evaluation/consumption/AlertConsumptionMapper.js';

export const WORKSPACE_ALERT_VERSION = '204.1';

/**
 * Maps a certified Consumption entry { descriptor, evaluation } into a
 * Workspace Alert View Model (card). Pure passthrough of already-computed
 * evaluation state + display identity. Never computes.
 *
 * @param {Object} entry { descriptor, evaluation } Consumption entry.
 * @returns {Object} Deeply frozen Workspace Alert View Model.
 */
export function adaptWorkspaceAlert(entry) {
  if (!entry || !entry.evaluation) {
    return Object.freeze({
      provided: false,
      viewModel: null,
      reasons: ['missing-consumption-entry'],
    });
  }

  const descriptor = entry.descriptor || null;
  const evaluation = entry.evaluation || null;
  const consumption = mapEvaluationToConsumption(entry);

  return Object.freeze({
    provided: true,
    viewModel: Object.freeze({
      id: descriptor?.formId || descriptor?.documentId || descriptor?.resource || descriptor?.source || null,
      source: consumption.source,
      message: consumption.message,
      priority: consumption.priority,
      priorityLabel: consumption.priorityLabel,
      status: consumption.status,
      severity: consumption.severity,
      remaining: consumption.remaining,
      nextDue: consumption.nextDue,
      transition: consumption.transition,
      overdue: consumption.overdue,
      escalation: consumption.escalation,
      icon: consumption.icon,
      color: consumption.color,
      label: consumption.label,
      action: 'view-detail',
    }),
    reasons: [],
  });
}

export const workspaceAlertAdapter = Object.freeze({
  key: 'workspace-alert-adapter',
  name: 'Alert Workspace Adapter',
  version: WORKSPACE_ALERT_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  produces: 'workspace-view-model',
  computes: false,
  interprets: false,
  queriesMetadata: false,
  adapt: adaptWorkspaceAlert,
});

export default workspaceAlertAdapter;