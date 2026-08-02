/**
 * PeriodicEvaluationStrategy
 *
 * Sprint 199 — FIRST official strategy of the Alert Evaluation Engine.
 *
 * Evaluates alerts driven by `configuration.periodicity`. This is the ONLY
 * family implemented; the others (FixedDate, Occurrence, Calendar,
 * OperationHours, Manual) remain reserved (Sprint 198.R5).
 *
 * Computation model (Sprint 199 §5):
 *
 *   baseDate = runtimeContext.lastExecution ?? runtimeContext.createdAt
 *   period   = durationToMs(configuration.periodicity)
 *   nextDue  = baseDate + period
 *   remaining= nextDue - now
 *   elapsed  = now - baseDate
 *   overdue  = now > nextDue
 *   risk     = relative scale (remaining / period) vs risk.thresholds
 *   severity = Green/Yellow/Red/Critical from risk + priority
 *   status   = NORMAL | WARNING | CRITICAL | OVERDUE
 *   transition = UNCHANGED | ESCALATED | RECOVERED
 *   escalation = configuration.priority + severity
 *
 * Strategy ONLY. Never reads metadata keys, never reads the Runtime, never
 * touches the Dashboard. `now` is ALWAYS transported (never computed here).
 */

import { EvaluationStrategy } from './EvaluationStrategy.js';
import { createAlertEvaluation } from './AlertEvaluation.js';
import {
  EVALUATION_STATUSES,
  EVALUATION_SEVERITIES,
  EVALUATION_TRANSITIONS,
  EVALUATION_ESCALATIONS,
} from './AlertEvaluationContract.js';

const UNIT_MS = Object.freeze({
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
  months: 30 * 24 * 60 * 60 * 1000,
  years: 365 * 24 * 60 * 60 * 1000,
});

const PRIORITY_RANK = Object.freeze({ low: 0, medium: 1, high: 2, critical: 3 });
const SEVERITY_RANK = Object.freeze({ green: 0, yellow: 1, red: 2, critical: 3 });
const STATUS_RANK = Object.freeze({ NORMAL: 0, WARNING: 1, CRITICAL: 2, OVERDUE: 3 });

function durationToMs(duration) {
  if (!duration || typeof duration !== 'object') return null;
  const amount = duration.amount;
  const unit = duration.unit;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return null;
  if (!(unit in UNIT_MS)) return null;
  return amount * UNIT_MS[unit];
}

function resolveBaseDate(runtimeContext) {
  return runtimeContext?.lastExecution ?? runtimeContext?.createdAt ?? null;
}

function computeRisk(remaining, periodMs, configuration) {
  const thresholds = configuration?.risk?.thresholds ?? { yellow: 0.5, red: 0.25 };
  const yellow = thresholds.yellow ?? 0.5;
  const red = thresholds.red ?? 0.25;
  if (remaining === null || remaining === undefined) return 'green';
  if (remaining < 0) return 'red';
  if (periodMs === null || periodMs === undefined || periodMs <= 0) return 'green';
  const ratio = remaining / periodMs;
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

export class PeriodicEvaluationStrategy extends EvaluationStrategy {
  constructor() {
    super({ key: 'periodic' });
  }

  /**
   * Metadata-driven selection: handles recurring periodicities
   * ({ amount, unit }) and single-event 'once'.
   */
  selects(periodicity) {
    if (periodicity === 'once') return true;
    return !!periodicity && typeof periodicity === 'object';
  }

  /**
   * Evaluates a periodic alert rule.
   *
   * @param {Object} descriptor AlertRuleDescriptor (inmutable).
   * @param {Object} configuration AlertConfiguration Value Object (inmutable).
   * @param {Object} runtimeContext Transport context (inmutable).
   * @returns {Object} AlertEvaluation Value Object.
   */
  evaluate(descriptor, configuration, runtimeContext) {
    const now = runtimeContext?.now ?? null;
    const baseDate = resolveBaseDate(runtimeContext);
    const periodMs = durationToMs(configuration?.periodicity);
    const nextDue = baseDate === null || periodMs === null ? null : baseDate + periodMs;
    const remaining = nextDue === null || now === null ? null : nextDue - now;
    const elapsed = baseDate === null || now === null ? null : now - baseDate;
    const overdue = nextDue !== null && now !== null ? now > nextDue : false;

    const risk = computeRisk(remaining, periodMs, configuration);
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
      elapsed,
      overdue,
      nextDue,
      transition,
      escalation,
    });
  }
}

export const PERIODIC_STRATEGY_KEY = 'periodic';

export const PeriodicEvaluationStrategyContract = Object.freeze({
  contractKey: 'alert.evaluation.strategy.periodic',
  key: PERIODIC_STRATEGY_KEY,
  family: 'PeriodicEvaluationStrategy',
  statuses: EVALUATION_STATUSES,
  severities: EVALUATION_SEVERITIES,
  transitions: EVALUATION_TRANSITIONS,
  escalations: EVALUATION_ESCALATIONS,
  driver: 'configuration.periodicity',
  reserved: Object.freeze([
    'FixedDateEvaluationStrategy',
    'OccurrenceEvaluationStrategy',
    'CalendarEvaluationStrategy',
    'OperationHoursEvaluationStrategy',
    'ManualEvaluationStrategy',
  ]),
});

export default PeriodicEvaluationStrategy;
