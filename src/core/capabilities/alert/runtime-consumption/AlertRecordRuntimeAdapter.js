/**
 * AlertRecordRuntimeAdapter
 *
 * Sprint 180 / Audit-3 — Delivers Alert Capability context to the existing
 * Dynamic Records engine.
 *
 * Audit-2/3: when a configurationDescriptor is present, the adapter derives
 * status/priority/message from the descriptor rules for the dynamicRecords
 * source. Existing engines remain untouched.
 *
 * Integration ONLY. Never creates records or alert-specific fields.
 */

export const RECORD_CONSUMER_KEY = 'dynamicRecords';

function descriptorAlertFor(request, source) {
  const descriptor = request?.configurationDescriptor;
  const alerts = descriptor && Array.isArray(descriptor.alerts) ? descriptor.alerts : [];
  return alerts.find((a) => a.source === source) || alerts[0] || null;
}

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

  const descriptorAlert = descriptorAlertFor(request, RECORD_CONSUMER_KEY);
  const expiring = request.expiryInDays !== undefined && Number(request.expiryInDays) <= 3;

  const alertContext = Object.freeze({
    status: descriptorAlert
      ? descriptorAlert.priority === 'critical' ? 'critical' : expiring ? 'expiring' : 'attention'
      : expiring ? 'expiring' : 'monitoring',
    message: descriptorAlert
      ? descriptorAlert.message
      : expiring ? 'Próximo vencimiento' : 'Bajo monitoreo',
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
