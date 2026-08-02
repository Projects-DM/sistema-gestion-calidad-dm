/**
 * AlertExperienceDescriptor
 *
 * Sprint 176 / 180-R — Defines the operational identity of the Alert
 * Capability.
 *
 * Sprint 180-R: Alert Monitoring is an OPERATIONAL CONFIGURATION
 * EXPERIENCE. Its only responsibility is producing an Alert
 * Configuration Descriptor consumed by existing engines.
 *
 * Sprint 184: the experience becomes RENDERABLE by consuming the
 * Operational Workspace ViewModel + Action Descriptor (see
 * AlertMonitoringExperience). It still never executes, never creates
 * CRUD, never creates a parallel runtime.
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
  renderable: true,
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
