/**
 * AlertFormRuntimeAdapter
 *
 * Sprint 180 — Delivers Alert Capability context to the existing
 * Dynamic Forms engine.
 *
 * Integration ONLY. Never creates forms or alert-specific fields.
 */

export const FORM_CONSUMER_KEY = 'dynamicForms';

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

  const alertContext = Object.freeze({
    status: request.condition === 'critical' ? 'critical' : 'attention',
    message: request.condition === 'critical'
      ? 'Condición crítica detectada'
      : 'Condición que requiere atención',
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
