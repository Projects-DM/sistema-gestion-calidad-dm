/**
 * AlertOperationalContext
 *
 * Sprint 180 (iteración 2) — Generates the runtime context consumed
 * by existing engines.
 *
 * Context generation ONLY. Never executes or notifies.
 */

import { buildAlertRuleDescriptor } from './AlertRuleDescriptor.js';

export function buildAlertOperationalContext(request) {
  if (!request) {
    return Object.freeze({
      module: null,
      alerts: [],
      available: false,
      reasons: ['missing-operational-context'],
    });
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      module: request.moduleId || request.module || null,
      alerts: [],
      available: false,
      reasons: ['capability-not-assigned'],
    });
  }

  const rules = Array.isArray(request.rules) ? request.rules : [];
  const contextAlerts = rules
    .map((r) => buildAlertRuleDescriptor(r))
    .filter((d) => d.valid === true && d.active === true)
    .map((d) => ({
      type: 'condition',
      priority: d.priority,
      source: d.source,
    }));

  return Object.freeze({
    module: request.moduleId || request.module || null,
    alerts: contextAlerts,
    available: contextAlerts.length > 0,
    reasons: [],
  });
}

export default buildAlertOperationalContext;
