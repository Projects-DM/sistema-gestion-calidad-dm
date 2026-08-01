/**
 * AlertExperienceDescriptor
 *
 * Sprint 176 — Defines the operational identity of the Alert
 * Capability.
 *
 * Metadata ONLY. Never evaluates alerts, processes events or
 * generates notifications.
 */

export const ALERT_EXPERIENCE_DESCRIPTOR = Object.freeze({
  capabilityKey: 'alerts',
  experienceKey: 'alert-monitoring',
  version: 1,
  label: 'Alertas',
  category: 'operational-control',
  supportedTargets: Object.freeze([
    'dynamicForms',
    'dynamicRecords',
    'documentRepository',
  ]),
  enabled: true,
  executionEnabled: false,
});

export function buildAlertExperienceDescriptor(request) {
  if (!request || request.capability !== 'alerts') {
    return Object.freeze({
      ...ALERT_EXPERIENCE_DESCRIPTOR,
      valid: false,
      reasons: !request ? ['missing-experience-context'] : ['capability-not-registered'],
    });
  }

  return Object.freeze({
    ...ALERT_EXPERIENCE_DESCRIPTOR,
    module: request.module || null,
    valid: true,
    reasons: [],
  });
}

export default ALERT_EXPERIENCE_DESCRIPTOR;
