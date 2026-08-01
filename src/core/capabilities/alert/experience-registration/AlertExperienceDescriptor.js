/**
 * AlertExperienceDescriptor
 *
 * Sprint 176 / 180-R — Defines the operational identity of the Alert
 * Capability.
 *
 * Sprint 180-R: Alert Monitoring is officially an OPERATIONAL
 * CONFIGURATION EXPERIENCE, NOT a visual operational experience.
 * Its only responsibility is producing an Alert Configuration
 * Descriptor consumed by existing engines. It never renders.
 *
 * Metadata ONLY. Never evaluates alerts, processes events or
 * generates notifications.
 */

export const ALERT_EXPERIENCE_DESCRIPTOR = Object.freeze({
  capabilityKey: 'alerts',
  experienceKey: 'alert-monitoring',
  version: 1,
  label: 'Alertas',
  category: 'operational-configuration',
  role: 'configuration',
  renderable: false,
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
