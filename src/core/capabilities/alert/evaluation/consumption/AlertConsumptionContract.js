/**
 * AlertConsumptionContract
 *
 * Sprint 200 — THE official contract of the Alert Consumption Layer.
 *
 * The ONLY input contract is EXACTLY:
 *
 *   { descriptor, evaluation }
 *
 * (the same object the Alert Evaluation Engine produces). Every consumer
 * (Dashboard, Alert Workspace, Dynamic Forms, Dynamic Records, Document
 * Repository) reads ALREADY-COMPUTED evaluation state. Consumers NEVER
 * interpret `AlertRuleDescriptor` internals and NEVER recalculate risk,
 * severity, due dates, expirations or priorities — those belong exclusively
 * to the Evaluation Engine (Strategy + Policy).
 *
 * Contract ONLY. Never executes, never evaluates.
 */

/**
 * The Consumption DTO field set (the "view" the consumers receive).
 * `status/severity/riskLevel/remaining/elapsed/overdue/nextDue/transition/
 * escalation` come EXCLUSIVELY from `evaluation`; `message/priority/
 * priorityLabel` are passthrough display identity of the descriptor;
 * `icon/color/label` are pure visual adaptation of the evaluation state.
 */
export const CONSUMPTION_KEYS = Object.freeze([
  'source',
  'status',
  'severity',
  'riskLevel',
  'remaining',
  'elapsed',
  'overdue',
  'nextDue',
  'transition',
  'escalation',
  'message',
  'priority',
  'priorityLabel',
  'icon',
  'color',
  'label',
  'action',
]);

/**
 * Evaluation fields consumed by each surface (single contract, per-surface
 * projection). The document (Repository) surface additionally consumes
 * `nextDue/remaining/overdue` for its expiry view.
 */
export const CONSUMER_FIELDS = Object.freeze({
  dynamicForms: Object.freeze([
    'status',
    'severity',
    'remaining',
    'nextDue',
    'transition',
    'escalation',
    'message',
  ]),
  dynamicRecords: Object.freeze([
    'status',
    'severity',
    'remaining',
    'nextDue',
    'transition',
    'escalation',
  ]),
  documentRepository: Object.freeze([
    'status',
    'severity',
    'remaining',
    'nextDue',
    'overdue',
    'transition',
    'escalation',
  ]),
  dashboard: Object.freeze([
    'status',
    'severity',
    'overdue',
  ]),
  workspace: Object.freeze([
    'status',
    'severity',
    'riskLevel',
    'remaining',
    'nextDue',
    'transition',
    'escalation',
  ]),
});

export const ALERT_CONSUMPTION_VERSION = 1;

export const AlertConsumptionContract = Object.freeze({
  contractKey: 'alert.consumption',
  version: ALERT_CONSUMPTION_VERSION,
  capabilityKey: 'alerts',
  layer: 'evaluation → consumption',
  input: Object.freeze({
    descriptor: 'AlertRuleDescriptor (inmutable, passthrough de identidad)',
    evaluation: 'AlertEvaluation Value Object (inmutable, única fuente de estado)',
  }),
  output: 'Consumption DTO (AlertConsumptionMapper)',
  consumers: CONSUMER_FIELDS,
  sourceFields: Object.freeze([
    'status',
    'severity',
    'riskLevel',
    'remaining',
    'elapsed',
    'overdue',
    'nextDue',
    'transition',
    'escalation',
  ]),
  passthroughFields: Object.freeze(['message', 'priority', 'priorityLabel']),
  singleContract: true,
  immutable: Object.freeze(['descriptor', 'evaluation']),
  never: Object.freeze([
    'interprets AlertRuleDescriptor internals',
    'recalculates risk',
    'recalculates severity',
    'recalculates due dates',
    'recalculates expirations',
    'recalculates priorities',
    'computes time',
    'invokes the Engine',
  ]),
});

export default AlertConsumptionContract;
