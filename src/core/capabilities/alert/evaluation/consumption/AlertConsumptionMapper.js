/**
 * AlertConsumptionMapper
 *
 * Sprint 200 — THE adapter that maps the single Evaluation contract
 * `{ descriptor, evaluation }` into the Consumption DTO used by Dashboard,
 * Alert Workspace, Dynamic Forms, Dynamic Records and Document Repository.
 *
 * Adaptation ONLY. This module NEVER computes risk, severity, due dates,
 * expirations or priorities — it copies the ALREADY-COMPUTED evaluation
 * fields and applies pure visual presentation (icon/color) derived from
 * evaluation status/severity. It NEVER interprets `AlertRuleDescriptor`
 * internals beyond passthrough display identity (message/priority/label).
 *
 * Mapper ONLY. Never executes, never computes time, never invokes the Engine.
 */

import { assertAlertEvaluation } from '../AlertEvaluation.js';

export const CONSUMPTION_VISUALS = Object.freeze({
  OVERDUE: Object.freeze({ icon: 'AlertOctagon', color: 'red', label: 'Vencido' }),
  CRITICAL: Object.freeze({ icon: 'AlertOctagon', color: 'red', label: 'Crítica' }),
  WARNING: Object.freeze({ icon: 'AlertTriangle', color: 'yellow', label: 'Atención' }),
  NORMAL: Object.freeze({ icon: 'Bell', color: 'gray', label: 'Normal' }),
  critical: Object.freeze({ icon: 'AlertOctagon', color: 'red', label: 'Crítica' }),
  red: Object.freeze({ icon: 'AlertOctagon', color: 'orange', label: 'Riesgo alto' }),
  yellow: Object.freeze({ icon: 'AlertTriangle', color: 'yellow', label: 'Riesgo medio' }),
  green: Object.freeze({ icon: 'Bell', color: 'gray', label: 'Riesgo bajo' }),
});

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}

/**
 * Pure visual adaptation of an evaluation state. Never recalculates:
 * icon/color are derived ONLY from the already-computed status/severity.
 */
export function resolveConsumptionVisual(evaluation) {
  if (!evaluation) return CONSUMPTION_VISUALS.NORMAL;
  if (evaluation.status === 'OVERDUE') return CONSUMPTION_VISUALS.OVERDUE;
  if (evaluation.status === 'CRITICAL') return CONSUMPTION_VISUALS.CRITICAL;
  if (evaluation.severity === 'critical') return CONSUMPTION_VISUALS.critical;
  if (evaluation.severity === 'red') return CONSUMPTION_VISUALS.red;
  if (evaluation.status === 'WARNING' || evaluation.severity === 'yellow') return CONSUMPTION_VISUALS.WARNING;
  return CONSUMPTION_VISUALS.NORMAL;
}

/**
 * Normalizes the single input contract. The evaluation MUST be a complete,
 * immutable AlertEvaluation Value Object; the descriptor is passed through
 * as display identity.
 *
 * @param {Object} descriptor AlertRuleDescriptor (inmutable).
 * @param {Object} evaluation AlertEvaluation Value Object (inmutable).
 * @returns {Object} { descriptor, evaluation } deeply frozen.
 */
export function buildConsumptionEntry(descriptor, evaluation) {
  assertAlertEvaluation(evaluation);
  return deepFreeze({ descriptor, evaluation });
}

/**
 * Maps a `{ descriptor, evaluation }` entry into the Consumption DTO.
 *
 * @param {Object} entry { descriptor, evaluation }.
 * @returns {Object} Deeply frozen Consumption DTO.
 */
export function mapEvaluationToConsumption(entry) {
  const descriptor = entry?.descriptor ?? null;
  const evaluation = entry?.evaluation ?? null;
  const visual = resolveConsumptionVisual(evaluation);

  return deepFreeze({
    source: descriptor?.source ?? null,
    status: evaluation?.status ?? null,
    severity: evaluation?.severity ?? null,
    riskLevel: evaluation?.riskLevel ?? null,
    remaining: evaluation?.remaining ?? null,
    elapsed: evaluation?.elapsed ?? null,
    overdue: evaluation?.overdue ?? false,
    nextDue: evaluation?.nextDue ?? null,
    transition: evaluation?.transition ?? null,
    escalation: evaluation?.escalation ?? null,
    message: descriptor?.message ?? null,
    priority: descriptor?.priority ?? null,
    priorityLabel: descriptor?.priorityLabel ?? null,
    icon: visual.icon,
    color: visual.color,
    label: visual.label,
    action: 'view-detail',
  });
}

function needsAttention(entry) {
  const evaluation = entry?.evaluation ?? null;
  if (!evaluation) return false;
  if (evaluation.status !== 'NORMAL') return true;
  return evaluation.severity !== 'green' && evaluation.severity !== null;
}

/**
 * Aggregates evaluations into the Dashboard metric set. ONLY counts the
 * ALREADY-COMPUTED evaluation states — never recomputes them.
 *
 * @param {Array} entries List of { descriptor, evaluation }.
 * @returns {Object} { activeAlerts, criticalAlerts, expiringDocuments, pendingActions }.
 */
export function mapEvaluationsToDashboardMetrics(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const critical = list.filter((e) => {
    const s = e?.evaluation?.status;
    const sev = e?.evaluation?.severity;
    return s === 'CRITICAL' || s === 'OVERDUE' || sev === 'red' || sev === 'critical';
  }).length;
  const expiringDocuments = list.filter((e) => e?.descriptor?.source === 'documentRepository' && needsAttention(e)).length;
  const pendingActions = list.filter((e) => e?.descriptor?.source === 'dynamicRecords' && needsAttention(e)).length;

  return deepFreeze({
    activeAlerts: list.length,
    criticalAlerts: critical,
    expiringDocuments,
    pendingActions,
  });
}

/**
 * Merges the evaluation state onto an existing Workspace card. The card
 * keeps its identity/navigation/grouping; status/severity/icon/color and the
 * remaining evaluation fields are taken from the Evaluation (never
 * recomputed).
 *
 * @param {Object} entry { descriptor, evaluation }.
 * @param {Object} base Pre-built Workspace card.
 * @returns {Object} Deeply frozen card with evaluation state merged.
 */
export function mapEvaluationToWorkspaceCard(entry, base) {
  const mapped = mapEvaluationToConsumption(entry);
  return deepFreeze({
    ...(base || {}),
    status: mapped.status,
    severity: mapped.severity,
    riskLevel: mapped.riskLevel,
    remaining: mapped.remaining,
    elapsed: mapped.elapsed,
    overdue: mapped.overdue,
    nextDue: mapped.nextDue,
    transition: mapped.transition,
    escalation: mapped.escalation,
    icon: mapped.icon,
    color: mapped.color,
    priority: mapped.priority,
    priorityLabel: mapped.priorityLabel,
    message: mapped.message,
  });
}

export default mapEvaluationToConsumption;
