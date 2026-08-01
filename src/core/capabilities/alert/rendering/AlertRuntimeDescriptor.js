/**
 * AlertRuntimeDescriptor
 *
 * Sprint 174 — Defines how the Runtime recognizes the Alert
 * Capability.
 *
 * Metadata ONLY. Never executes or renders.
 */

export const ALERT_RUNTIME_DESCRIPTOR = Object.freeze({
  capabilityKey: 'alerts',
  runtimeMode: 'controlled',
  enabledTargets: Object.freeze(['dynamicForms', 'dynamicRecords', 'documentRepository']),
  executable: false,
  governanceRequired: true,
});

export function buildRuntimeDescriptor(request) {
  if (!request || request.capability !== 'alerts' || request.enabled !== true) {
    return Object.freeze({
      ...ALERT_RUNTIME_DESCRIPTOR,
      available: false,
      reasons: !request ? ['missing-capability-context'] : ['capability-not-available'],
    });
  }

  return Object.freeze({
    ...ALERT_RUNTIME_DESCRIPTOR,
    available: true,
    moduleId: request.moduleId || null,
    reasons: [],
  });
}

export default ALERT_RUNTIME_DESCRIPTOR;
