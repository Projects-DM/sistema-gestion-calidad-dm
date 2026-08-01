/**
 * AlertFormRuntimeAdapter
 *
 * Sprint 180 / Audit-3 — Delivers Alert Capability context to the existing
 * Dynamic Forms engine.
 *
 * Audit-2/3: when a configurationDescriptor is present, the adapter derives
 * status/priority/message/icon from the descriptor rules for the
 * dynamicForms source. Existing engines remain untouched.
 *
 * Integration ONLY. Never creates forms or alert-specific fields.
 */

export const FORM_CONSUMER_KEY = 'dynamicForms';

function descriptorAlertFor(request, source) {
  const descriptor = request?.configurationDescriptor;
  const alerts = descriptor && Array.isArray(descriptor.alerts) ? descriptor.alerts : [];
  return alerts.find((a) => a.source === source) || alerts[0] || null;
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

  const descriptorAlert = descriptorAlertFor(request, FORM_CONSUMER_KEY);

  const alertContext = Object.freeze({
    status: descriptorAlert
      ? descriptorAlert.priority === 'critical' ? 'critical' : 'attention'
      : request.condition === 'critical' ? 'critical' : 'attention',
    message: descriptorAlert
      ? descriptorAlert.message
      : request.condition === 'critical'
        ? 'Condición crítica detectada'
        : 'Condición que requiere atención',
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
