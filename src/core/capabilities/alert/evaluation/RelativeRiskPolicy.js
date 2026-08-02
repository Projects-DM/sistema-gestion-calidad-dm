/**
 * RelativeRiskPolicy
 *
 * Sprint 199.R — FIRST official business policy of the Alert Evaluation
 * Engine.
 *
 * Responsible ONLY for producing:
 *   riskLevel, severity, status, transition, escalation
 *
 * It NEVER computes dates: it receives the already-computed AlertTemporalState
 * (remaining, period, overdue) and interprets it against the Configuration.
 *
 * Policy ONLY. Never computes time.
 */

import { AlertEvaluationPolicy } from './AlertEvaluationPolicy.js';
import { createAlertEvaluation } from './AlertEvaluation.js';
import {
  EVALUATION_STATUSES,
  EVALUATION_SEVERITIES,
  EVALUATION_TRANSITIONS,
  EVALUATION_ESCALATIONS,
} from './AlertEvaluationContract.js';

const PRIORITY_RANK = Object.freeze({ low: 0, medium: 1, high: 2, critical: 3 });
const SEVERITY_RANK = Object.freeze({ green: 0, yellow: 1, red: 2, critical: 3 });
const STATUS_RANK = Object.freeze({ NORMAL: 0, WARNING: 1, CRITICAL: 2, OVERDUE: 3 });

function computeRisk(remaining, period, configuration) {
  const thresholds = configuration?.risk?.thresholds ?? { yellow: 0.5, red: 0.25 };
  const yellow = thresholds.yellow ?? 0.5;
  const red = thresholds.red ?? 0.25;
  if (remaining === null || remaining === undefined) return 'green';
  if (remaining < 0) return 'red';
  if (period === null || period === undefined || period <= 0) return 'green';
  const ratio = remaining / period;
  if (ratio <= red) return 'red';
  if (ratio <= yellow) return 'yellow';
  return 'green';
}

function computeSeverity(risk, overdue) {
  // Severity is driven by the risk thresholds ONLY (Sprint 199 §5):
  // green/yellow/red from the relative remaining/period ratio; the
  // OVERDUE zone escalates to critical. Priority NEVER drives severity —
  // it only drives escalation (priority + severity).
  if (overdue) return 'critical';
  return risk;
}

function computeStatus(overdue, severity) {
  if (overdue) return 'OVERDUE';
  if (severity === 'critical' || severity === 'red') return 'CRITICAL';
  if (severity === 'yellow') return 'WARNING';
  return 'NORMAL';
}

function computeTransition(previousStatus, newStatus) {
  if (!previousStatus) return 'UNCHANGED';
  const prev = STATUS_RANK[previousStatus] ?? 0;
  const next = STATUS_RANK[newStatus] ?? 0;
  if (next > prev) return 'ESCALATED';
  if (next < prev) return 'RECOVERED';
  return 'UNCHANGED';
}

function computeEscalation(configuration, severity) {
  const priority = configuration?.priority ?? 'medium';
  const severityRank = SEVERITY_RANK[severity] ?? 0;
  const priorityRank = PRIORITY_RANK[priority] ?? 1;
  const effective = Math.max(severityRank, priorityRank);
  if (effective >= 3) return 'critical';
  if (effective >= 2) return 'escalated';
  return 'none';
}

export class RelativeRiskPolicy extends AlertEvaluationPolicy {
  constructor() {
    super({ key: 'relative-risk' });
  }

  /**
   * Metadata-driven selection: handles the 'relative' risk model.
   */
  selects(riskModel) {
    return riskModel === 'relative';
  }

  /**
   * Interprets the Temporal State into an AlertEvaluation.
   *
   * @param {Object} temporalState AlertTemporalState (inmutable).
   * @param {Object} descriptor AlertRuleDescriptor (inmutable).
   * @param {Object} configuration AlertConfiguration Value Object (inmutable).
   * @param {Object} runtimeContext Transport context (inmutable).
   * @returns {Object} AlertEvaluation Value Object.
   */
  evaluate(temporalState, descriptor, configuration, runtimeContext) {
    const remaining = temporalState?.remaining ?? null;
    const period = temporalState?.period ?? null;
    const overdue = temporalState?.overdue ?? false;

    const risk = computeRisk(remaining, period, configuration);
    const severity = computeSeverity(risk, overdue);
    const status = computeStatus(overdue, severity);
    const previousStatus = runtimeContext?.lastStatus ?? null;
    const transition = computeTransition(previousStatus, status);
    const escalation = computeEscalation(configuration, severity);

    return createAlertEvaluation({
      status,
      severity,
      riskLevel: risk,
      remaining,
      elapsed: temporalState?.elapsed ?? null,
      overdue,
      nextDue: temporalState?.nextDue ?? null,
      transition,
      escalation,
    });
  }
}

export const RELATIVE_RISK_POLICY_KEY = 'relative-risk';

export const RelativeRiskPolicyContract = Object.freeze({
  contractKey: 'alert.evaluation.policy.relative-risk',
  key: RELATIVE_RISK_POLICY_KEY,
  produces: Object.freeze(['riskLevel', 'severity', 'status', 'transition', 'escalation']),
  never: Object.freeze(['computes dates']),
  statuses: EVALUATION_STATUSES,
  severities: EVALUATION_SEVERITIES,
  transitions: EVALUATION_TRANSITIONS,
  escalations: EVALUATION_ESCALATIONS,
  reserved: Object.freeze([
    'RegulatoryPolicy',
    'SLAPolicy',
    'EnterprisePolicy',
    'CustomerPolicy',
  ]),
});

export default RelativeRiskPolicy;
