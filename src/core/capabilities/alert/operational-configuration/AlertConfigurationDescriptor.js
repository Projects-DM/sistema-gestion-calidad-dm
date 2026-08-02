/**
 * AlertConfigurationDescriptor
 *
 * Sprint 180-R — THE SINGLE SSOT DESCRIPTOR of Alert Monitoring.
 *
 * Alert Monitoring is an OPERATIONAL CONFIGURATION EXPERIENCE, not a
 * visual experience. Its ONLY responsibility is to produce this
 * descriptor, which existing engines consume.
 *
 * Descriptor ONLY. Never renders, executes or notifies.
 */

import { buildAlertRuleDescriptor } from './AlertRuleDescriptor.js';
import { resolveOperationalConfiguration } from './AlertConfigurationResolver.js';

export function buildAlertConfigurationDescriptor(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      experience: 'alert-monitoring',
      role: 'configuration',
      configured: false,
      alerts: [],
      reasons: ['missing-configuration-context'],
    });
  }

  const resolution = resolveOperationalConfiguration(request);

  if (!resolution.resolved) {
    return Object.freeze({
      capabilityKey: 'alerts',
      experience: 'alert-monitoring',
      role: 'configuration',
      configured: false,
      alerts: [],
      module: request.moduleId || request.module || null,
      reasons: resolution.reasons,
    });
  }

  const rules = Array.isArray(request.rules) ? request.rules : [];
  const alertDescriptors = rules
    .map((r) => buildAlertRuleDescriptor(r))
    .filter((d) => d.valid === true);

  return Object.freeze({
    capabilityKey: 'alerts',
    experience: 'alert-monitoring',
    role: 'configuration',
    configured: alertDescriptors.length > 0,
    module: request.moduleId || request.module || null,
    alerts: alertDescriptors.map((d) => ({
      resource: d.formId || d.source,
      source: d.source,
      condition: d.condition,
      priority: d.priority,
      priorityLabel: d.priorityLabel,
      message: d.message,
      active: d.active,
      documentId: d.documentId || null,
    })),
    reasons: [],
  });
}

export default buildAlertConfigurationDescriptor;
