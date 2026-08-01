/**
 * AlertRecordRuntimeAdapter
 *
 * Sprint 180 — Delivers Alert Capability context to the existing
 * Dynamic Records engine.
 *
 * Integration ONLY. Never creates records or alert-specific fields.
 */

export const RECORD_CONSUMER_KEY = 'dynamicRecords';

export function consumeRecordAlertContext(request) {
  if (!request) {
    return Object.freeze({
      consumer: RECORD_CONSUMER_KEY,
      capabilityKey: 'alerts',
      consumed: false,
      available: false,
      alertContext: null,
      reasons: ['missing-consumption-context'],
    });
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;
  const targetSupported = request.target === undefined || request.target === RECORD_CONSUMER_KEY;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      consumer: RECORD_CONSUMER_KEY,
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
      consumer: RECORD_CONSUMER_KEY,
      capabilityKey: 'alerts',
      consumed: false,
      available: false,
      alertContext: null,
      moduleId: request.moduleId || request.module || null,
      reasons: ['unsupported-target'],
    });
  }

  const alertContext = Object.freeze({
    status: request.expiryInDays !== undefined && Number(request.expiryInDays) <= 3
      ? 'expiring'
      : 'monitoring',
    message: request.expiryInDays !== undefined && Number(request.expiryInDays) <= 3
      ? 'Próximo vencimiento'
      : 'Bajo monitoreo',
    action: 'view-detail',
  });

  return Object.freeze({
    consumer: RECORD_CONSUMER_KEY,
    capabilityKey: 'alerts',
    consumed: true,
    available: true,
    moduleId: request.moduleId || request.module || null,
    alertContext,
    reasons: [],
  });
}

export default consumeRecordAlertContext;
