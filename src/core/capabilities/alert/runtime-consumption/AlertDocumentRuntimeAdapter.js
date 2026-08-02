/**
 * AlertDocumentRuntimeAdapter
 *
 * Sprint 180 / Audit-3 — Delivers Alert Capability context to the existing
 * Document Repository engine.
 *
 * Sprint 200 — The adapter consumes ONLY the single Evaluation contract
 * `{ descriptor, evaluation }` produced by the Consumption layer. Status,
 * severity, remaining, nextDue, overdue, transition and escalation come
 * EXCLUSIVELY from `evaluation`; the Repository reads `nextDue/remaining/
 * overdue` for its expiry view. The adapter NEVER derives state from
 * descriptor rules and NEVER recomputes risk/severity/expirations/
 * priorities.
 *
 * Integration ONLY. Never creates documents or alert-specific fields.
 */

import { mapEvaluationToConsumption } from '../evaluation/consumption/AlertConsumptionMapper.js';

export const DOCUMENT_CONSUMER_KEY = 'documentRepository';

function evaluationEntryFor(request, source) {
  const entries = Array.isArray(request?.evaluationEntries) ? request.evaluationEntries : [];
  return entries.find((e) => e?.descriptor?.source === source) || null;
}

function neutralContext() {
  return Object.freeze({
    source: DOCUMENT_CONSUMER_KEY,
    status: 'NORMAL',
    severity: 'green',
    riskLevel: 'green',
    remaining: null,
    elapsed: null,
    overdue: false,
    nextDue: null,
    transition: 'UNCHANGED',
    escalation: 'none',
    message: 'Documento dentro de vigencia',
    priority: null,
    priorityLabel: null,
    icon: 'Bell',
    color: 'gray',
    action: 'view-detail',
  });
}

export function consumeDocumentAlertContext(request) {
  if (!request) {
    return Object.freeze({
      consumer: DOCUMENT_CONSUMER_KEY,
      capabilityKey: 'alerts',
      consumed: false,
      available: false,
      alertContext: null,
      reasons: ['missing-consumption-context'],
    });
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;
  const targetSupported = request.target === undefined || request.target === DOCUMENT_CONSUMER_KEY;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      consumer: DOCUMENT_CONSUMER_KEY,
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
      consumer: DOCUMENT_CONSUMER_KEY,
      capabilityKey: 'alerts',
      consumed: false,
      available: false,
      alertContext: null,
      moduleId: request.moduleId || request.module || null,
      reasons: ['unsupported-target'],
    });
  }

  const entry = evaluationEntryFor(request, DOCUMENT_CONSUMER_KEY);
  const alertContext = entry ? mapEvaluationToConsumption(entry) : neutralContext();

  return Object.freeze({
    consumer: DOCUMENT_CONSUMER_KEY,
    capabilityKey: 'alerts',
    consumed: true,
    available: true,
    moduleId: request.moduleId || request.module || null,
    alertContext,
    reasons: [],
  });
}

export default consumeDocumentAlertContext;
