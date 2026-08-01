/**
 * AlertConfigurationResolver
 *
 * Sprint 180 (iteración 2) — Resolves the operational Alert
 * configuration for a module.
 *
 * Resolution ONLY. Never executes.
 */

import { buildAlertRuleDescriptor } from './AlertRuleDescriptor.js';

export function resolveOperationalConfiguration(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      resolved: false,
      configured: false,
      alerts: [],
      reasons: ['missing-configuration-context'],
    });
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      capabilityKey: 'alerts',
      resolved: false,
      configured: false,
      alerts: [],
      module: request.moduleId || request.module || null,
      reasons: ['capability-not-assigned'],
    });
  }

  const rules = Array.isArray(request.rules) ? request.rules : [];
  const descriptors = rules.map((r) => buildAlertRuleDescriptor(r));
  const validDescriptors = descriptors.filter((d) => d.valid === true);

  return Object.freeze({
    capabilityKey: 'alerts',
    resolved: true,
    configured: validDescriptors.length > 0,
    module: request.moduleId || request.module || null,
    alerts: validDescriptors.map((d) => ({
      source: d.source,
      priority: d.priority,
      formId: d.formId,
    })),
    reasons: descriptors.some((d) => d.valid === false)
      ? ['invalid-rules-present']
      : [],
  });
}

export default resolveOperationalConfiguration;
