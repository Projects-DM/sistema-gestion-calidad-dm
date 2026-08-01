/**
 * AlertOperationalRenderer
 *
 * Sprint 175 — Resolves the operational availability of the Alert
 * Capability.
 *
 * Resolution ONLY. Never creates UI components, executes alerts or
 * processes events.
 */

export const ALERT_OPERATIONAL_TARGETS = Object.freeze([
  'dynamicForms',
  'dynamicRecords',
  'documentRepository',
]);

export function resolveOperationalAvailability(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      available: false,
      targets: [],
      executionEnabled: false,
      reasons: ['missing-capability-context'],
    });
  }

  const capabilityAvailable = request.capability === 'alerts' && request.capabilityAssigned === true;
  const runtimeTarget = !!request.runtimeTarget && ALERT_OPERATIONAL_TARGETS.includes(request.runtimeTarget);
  const rendererPermission = request.rendererPermission !== false;

  const available = capabilityAvailable && runtimeTarget && rendererPermission;

  return Object.freeze({
    capabilityKey: 'alerts',
    available,
    targets: available ? ALERT_OPERATIONAL_TARGETS : [],
    executionEnabled: false,
    module: request.module || null,
    runtimeTarget: request.runtimeTarget || null,
    reasons: available
      ? []
      : [
          ...(capabilityAvailable ? [] : ['capability-not-available']),
          ...(runtimeTarget ? [] : ['unsupported-target']),
          ...(rendererPermission ? [] : ['renderer-permission-denied']),
        ],
  });
}

export default resolveOperationalAvailability;
