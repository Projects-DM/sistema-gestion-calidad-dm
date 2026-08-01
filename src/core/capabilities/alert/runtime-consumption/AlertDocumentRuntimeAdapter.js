/**
 * AlertDocumentRuntimeAdapter
 *
 * Sprint 180 — Delivers Alert Capability context to the existing
 * Document Repository engine.
 *
 * Integration ONLY. Never creates documents or alert-specific fields.
 */

export const DOCUMENT_CONSUMER_KEY = 'documentRepository';

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
  const alertContext = Object.freeze({
    status: days !== null && days <= 5 ? 'expiring' : 'valid',
    message: days !== null && days <= 5
      ? `Faltan ${days} días para el vencimiento`
      : 'Documento dentro de vigencia',
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
