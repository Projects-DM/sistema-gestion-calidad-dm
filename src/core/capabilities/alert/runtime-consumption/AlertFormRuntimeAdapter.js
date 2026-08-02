/**
 * AlertFormRuntimeAdapter
 *
 * Sprint 180 / Audit-3 — Delivers Alert Capability context to the existing
 * Dynamic Forms engine.
 *
 * Sprint 200 — The adapter consumes ONLY the single Evaluation contract
 * `{ descriptor, evaluation }` produced by the Consumption layer. Status,
 * severity, remaining, nextDue, transition and escalation come EXCLUSIVELY
 * from `evaluation`; the adapter NEVER derives state from descriptor rules
 * and NEVER recomputes risk/severity/due dates/priorities.
 *
 * Integration ONLY. Never creates forms or alert-specific fields.
 */

import { mapEvaluationToConsumption } from '../evaluation/consumption/AlertConsumptionMapper.js';

export const FORM_CONSUMER_KEY = 'dynamicForms';

function evaluationEntryFor(request, source) {
  const entries = Array.isArray(request?.evaluationEntries) ? request.evaluationEntries : [];
  return entries.find((e) => e?.descriptor?.source === source) || null;
}

function neutralContext() {
  return Object.freeze({
    source: FORM_CONSUMER_KEY,
    status: 'NORMAL',
    severity: 'green',
    riskLevel: 'green',
    remaining: null,
    elapsed: null,
    overdue: false,
    nextDue: null,
    transition: 'UNCHANGED',
    escalation: 'none',
    message: 'Bajo monitoreo',
    priority: null,
    priorityLabel: null,
    icon: 'Bell',
    color: 'gray',
    action: 'view-detail',
  });
}

export function consumeFormAlertContext(request) {
  if (!request) {
    return Object.freeze({
      consumer: FORM_CONSUMER_KEY,
      capabilityKey: 'alerts',
      consumed: false,
      available: false,
      alertContext: null,
      reasons: ['missing-consumption-context'],
    });
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;
  const targetSupported = request.target === undefined || request.target === FORM_CONSUMER_KEY;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      consumer: FORM_CONSUMER_KEY,
      capabilityKey: 'alerts',
      consumed: false,
      available: false,
      alertContext: null,
      moduleId: request.moduleId || request.module || null,
      reasons: ['capability-not-assigned'],
    });
  }

  if (!targetSupported) {
    return Object.freeze({
      consumer: FORM_CONSUMER_KEY,
      capabilityKey: 'alerts',
      consumed: false,
      available: false,
      alertContext: null,
      moduleId: request.moduleId || request.module || null,
      reasons: ['unsupported-target'],
    });
  }

  const entry = evaluationEntryFor(request, FORM_CONSUMER_KEY);
  const alertContext = entry ? mapEvaluationToConsumption(entry) : neutralContext();

  return Object.freeze({
    consumer: FORM_CONSUMER_KEY,
    capabilityKey: 'alerts',
    consumed: true,
    available: true,
    moduleId: request.moduleId || request.module || null,
    alertContext,
    reasons: [],
  });
}

export default consumeFormAlertContext;
