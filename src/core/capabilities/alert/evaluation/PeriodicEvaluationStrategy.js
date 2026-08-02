/**
 * PeriodicEvaluationStrategy
 *
 * Sprint 199 — FIRST official strategy of the Alert Evaluation Engine.
 * Sprint 199.R — Temporal dimension ONLY. The Strategy computes time;
 * the Policy interprets business.
 *
 * Evaluates alerts driven by `configuration.periodicity`. This is the ONLY
 * family implemented; the others (FixedDate, Occurrence, Calendar,
 * OperationHours, Manual) remain reserved (Sprint 198.R5).
 *
 * Temporal computation model (Sprint 199 §5):
 *
 *   baseDate = runtimeContext.lastExecution ?? runtimeContext.createdAt
 *   period   = durationToMs(configuration.periodicity)
 *   nextDue  = baseDate + period
 *   remaining= nextDue - now
 *   elapsed  = now - baseDate
 *   overdue  = now > nextDue
 *
 * The result is an AlertTemporalState Value Object. Business interpretation
 * (risk/severity/status/transition/escalation) is delegated to the policy
 * resolved by AlertEvaluationPolicyResolver (Sprint 199.R).
 *
 * Strategy ONLY. Never interprets business, never reads metadata keys, never
 * touches the Dashboard. `now` is ALWAYS transported (never computed here).
 */

import { EvaluationStrategy } from './EvaluationStrategy.js';
import { createAlertTemporalState } from './AlertTemporalState.js';
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
   * Computes the temporal state of a periodic alert rule. The Engine (not the
   * Strategy) resolves the policy that interprets this state (Sprint 199.R2).
   *
   * @param {Object} descriptor AlertRuleDescriptor (inmutable).
   * @param {Object} configuration AlertConfiguration Value Object (inmutable).
   * @param {Object} runtimeContext Transport context (inmutable).
   * @returns {Object} AlertTemporalState Value Object.
   */
  evaluate(descriptor, configuration, runtimeContext) {
    const now = runtimeContext?.now ?? null;
    const baseDate = resolveBaseDate(runtimeContext);
    const period = durationToMs(configuration?.periodicity);
    const nextDue = baseDate === null || period === null ? null : baseDate + period;
    const remaining = nextDue === null || now === null ? null : nextDue - now;
    const elapsed = baseDate === null || now === null ? null : now - baseDate;
    const overdue = nextDue !== null && now !== null ? now > nextDue : false;

    return createAlertTemporalState({
      baseDate,
      period,
      nextDue,
      remaining,
      elapsed,
      overdue,
    });
  }
}

export const PERIODIC_STRATEGY_KEY = 'periodic';

export const PeriodicEvaluationStrategyContract = Object.freeze({
  contractKey: 'alert.evaluation.strategy.periodic',
  key: PERIODIC_STRATEGY_KEY,
  family: 'PeriodicEvaluationStrategy',
  dimension: 'temporal',
  produces: Object.freeze(['AlertTemporalState']),
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
