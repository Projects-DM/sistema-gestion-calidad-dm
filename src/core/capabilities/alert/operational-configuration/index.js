/**
 * Alert Operational Configuration
 *
 * Sprint 180 (iteración 2) — Operational alert configuration and
 * runtime context generation.
 *
 * Configuration ONLY. Reuses existing engines. Never executes,
 * automates or notifies.
 */

import { resolveOperationalConfiguration } from './AlertConfigurationResolver.js';
import { buildAlertRuleDescriptor } from './AlertRuleDescriptor.js';
import { resolvePriority, ALERT_PRIORITY_LEVELS, PRIORITY_LABELS } from './AlertPriorityPolicy.js';
import { buildAlertOperationalContext } from './AlertOperationalContext.js';
import { buildAlertConfigurationDescriptor } from './AlertConfigurationDescriptor.js';
import { OPERATIONAL_CONFIGURATION_BOUNDARY } from './OperationalConfigurationBoundary.js';

export { AlertConfigurationContract, OPERATIONAL_CONFIGURATION_VERSION } from './AlertConfigurationContract.js';
export { resolveOperationalConfiguration } from './AlertConfigurationResolver.js';
export { buildAlertRuleDescriptor } from './AlertRuleDescriptor.js';
export { resolvePriority, ALERT_PRIORITY_LEVELS, PRIORITY_LABELS } from './AlertPriorityPolicy.js';
export { buildAlertOperationalContext } from './AlertOperationalContext.js';
export { buildAlertConfigurationDescriptor } from './AlertConfigurationDescriptor.js';
export { OPERATIONAL_CONFIGURATION_BOUNDARY } from './OperationalConfigurationBoundary.js';

export function requestOperationalConfiguration(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      configured: false,
      executionEnabled: false,
      executionBlocked: false,
      reasons: ['missing-configuration-context'],
    });
  }

  if (request.capability !== 'alerts' && request.capabilityKey !== 'alerts') {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      configured: false,
      module: request.moduleId || request.module || null,
      executionEnabled: false,
      executionBlocked: request.executionRequested === true,
      reasons: ['capability-not-assigned'],
    });
  }

  const executionRequested = request.executionRequested === true || request.execute === true;

  const resolution = resolveOperationalConfiguration(request);

  if (!resolution.resolved) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      configured: false,
      module: request.moduleId || request.module || null,
      executionEnabled: false,
      executionBlocked: executionRequested,
      blocked: executionRequested,
      reasons: resolution.reasons,
    });
  }

  const context = buildAlertOperationalContext(request);
  const descriptor = buildAlertConfigurationDescriptor(request);

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: executionRequested ? 'rejected' : 'ready',
    configured: resolution.configured,
    module: request.moduleId || request.module || null,
    alerts: resolution.alerts,
    runtimeContext: context,
    configurationDescriptor: descriptor,
    executionEnabled: false,
    executionBlocked: executionRequested,
    blocked: executionRequested,
    reasons: executionRequested ? ['execution-not-allowed'] : resolution.reasons,
    boundary: OPERATIONAL_CONFIGURATION_BOUNDARY,
  });
}

export const ALERT_OPERATIONAL_CONFIGURATION = Object.freeze({
  key: 'operational-configuration',
  name: 'Alert Operational Configuration',
  execution: false,
});

export default ALERT_OPERATIONAL_CONFIGURATION;
