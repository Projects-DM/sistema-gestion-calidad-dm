/**
 * AlertEvaluationContract
 *
 * Sprint 199 — THE official contract of the Alert Evaluation Engine.
 *
 * Certified by Sprint 198.R4 (Runtime ↔ Evaluation Contract) and
 * Sprint 198.R5 (Evaluation Strategy Model).
 *
 * - The Runtime delivers exactly { descriptor, configuration, runtimeContext }.
 * - The Engine returns exactly { descriptor, evaluation }.
 * - `evaluation` is a Value Object completely independent of the descriptor.
 * - `evaluation` NEVER modifies descriptor, configuration or runtimeContext.
 * - `evaluation` carries EXACTLY the EVALUATION_KEYS (and nothing else).
 *
 * The Engine NEVER contains a single algorithm. It always works through
 * strategies selected by METADATA (never modules, names, slugs or special
 * forms). Adding a new alert model NEVER modifies the Engine.
 *
 * Contract ONLY. Never executes, never evaluates.
 */

/**
 * The exact canonical field set of an Alert Evaluation (Sprint 199 §4.1).
 * No additional properties are permitted.
 */
export const EVALUATION_KEYS = Object.freeze([
  'status',
  'severity',
  'riskLevel',
  'remaining',
  'elapsed',
  'overdue',
  'nextDue',
  'transition',
  'escalation',
]);

/**
 * Official evaluation status model (Sprint 199 §5).
 */
export const EVALUATION_STATUSES = Object.freeze([
  'NORMAL',
  'WARNING',
  'CRITICAL',
  'OVERDUE',
]);

/**
 * Official severity model (Green / Yellow / Red / Critical — Sprint 199 §5),
 * driven by configuration.risk.thresholds.
 */
export const EVALUATION_SEVERITIES = Object.freeze([
  'green',
  'yellow',
  'red',
  'critical',
]);

/**
 * Official transition model (Sprint 199 §5).
 */
export const EVALUATION_TRANSITIONS = Object.freeze([
  'UNCHANGED',
  'ESCALATED',
  'RECOVERED',
]);

/**
 * Official escalation model (derived from configuration.priority + severity).
 */
export const EVALUATION_ESCALATIONS = Object.freeze([
  'none',
  'escalated',
  'critical',
]);

/**
 * The single certified strategy contract (Sprint 198.R5 §6). Every strategy
 * implements EXACTLY this shape:
 *
 *   evaluate(descriptor, configuration, runtimeContext) → AlertEvaluation
 */
export const STRATEGY_EVALUATE_SIGNATURE = 'evaluate(descriptor, configuration, runtimeContext)';

export const ALERT_EVALUATION_VERSION = 1;

export const AlertEvaluationContract = Object.freeze({
  contractKey: 'alert.evaluation',
  version: ALERT_EVALUATION_VERSION,
  capabilityKey: 'alerts',
  evaluationType: 'strategy-driven',
  input: Object.freeze({
    descriptor: 'AlertRuleDescriptor (inmutable)',
    configuration: 'AlertConfiguration Value Object (inmutable)',
    runtimeContext: 'contexto de transporte (inmutable)',
  }),
  output: Object.freeze({
    descriptor: 'mismo descriptor (nunca modificado)',
    evaluation: 'AlertEvaluation Value Object (nuevo, inmutable)',
  }),
  strategyContract: STRATEGY_EVALUATE_SIGNATURE,
  ownerFields: EVALUATION_KEYS,
  statuses: EVALUATION_STATUSES,
  severities: EVALUATION_SEVERITIES,
  transitions: EVALUATION_TRANSITIONS,
  escalations: EVALUATION_ESCALATIONS,
  selection: 'metadata-driven',
  immutable: Object.freeze(['descriptor', 'configuration', 'runtimeContext']),
  executionEnabled: false,
  never: Object.freeze([
    'contains a single algorithm',
    'reads modules/names/slugs/special forms',
    'reconstructs metadata',
    'modifies descriptor/configuration/runtimeContext',
    'notifies',
  ]),
});

export default AlertEvaluationContract;
