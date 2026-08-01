/**
 * AlertDocumentRuntimeAdapter
 *
 * Sprint 180 / Audit-3 — Delivers Alert Capability context to the existing
 * Document Repository engine.
 *
 * Audit-2/3: when a configurationDescriptor is present, the adapter derives
 * status/priority/message from the descriptor rules for the
 * documentRepository source. Existing engines remain untouched.
 *
 * Integration ONLY. Never creates documents or alert-specific fields.
 */

export const DOCUMENT_CONSUMER_KEY = 'documentRepository';

function descriptorAlertFor(request, source) {
  const descriptor = request?.configurationDescriptor;
  const alerts = descriptor && Array.isArray(descriptor.alerts) ? descriptor.alerts : [];
  return alerts.find((a) => a.source === source) || alerts[0] || null;
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

  const days = request.expiryInDays !== undefined ? Number(request.expiryInDays) : null;
  const descriptorAlert = descriptorAlertFor(request, DOCUMENT_CONSUMER_KEY);
  const expiring = days !== null && days <= 5;

  const alertContext = Object.freeze({
    status: descriptorAlert
      ? descriptorAlert.priority === 'critical' ? 'critical' : expiring ? 'expiring' : 'attention'
      : expiring ? 'expiring' : 'valid',
    message: descriptorAlert
      ? descriptorAlert.message
      : expiring ? `Faltan ${days} días para el vencimiento` : 'Documento dentro de vigencia',
    priority: descriptorAlert ? descriptorAlert.priority : null,
    priorityLabel: descriptorAlert ? descriptorAlert.priorityLabel : null,
    icon: descriptorAlert && descriptorAlert.priority === 'critical'
      ? 'AlertOctagon'
      : descriptorAlert
        ? 'AlertTriangle'
        : 'Bell',
    action: 'view-detail',
  });

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
