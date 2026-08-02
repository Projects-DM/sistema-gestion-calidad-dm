/**
 * Alert Runtime Consumption
 *
 * Sprint 180 — Consumes the Alert Capability through the existing
 * operational engines.
 *
 * Consumption ONLY. Reuses existing engines. No parallel system,
 * no independent UI, no persistence.
 */

import { resolveRuntimeConsumption, SUPPORTED_CONSUMERS } from './AlertRuntimeConsumptionResolver.js';
import { consumeFormAlertContext, FORM_CONSUMER_KEY } from './AlertFormRuntimeAdapter.js';
import { consumeRecordAlertContext, RECORD_CONSUMER_KEY } from './AlertRecordRuntimeAdapter.js';
import { consumeDocumentAlertContext, DOCUMENT_CONSUMER_KEY } from './AlertDocumentRuntimeAdapter.js';
import { provideAlertDashboardData, DASHBOARD_CONSUMER_KEY } from './AlertDashboardDataProvider.js';
import { buildAlertConfigurationDescriptor } from '../operational-configuration/AlertConfigurationDescriptor.js';
import { buildAlertRuleDescriptor } from '../operational-configuration/AlertRuleDescriptor.js';
import { createAlertConfiguration } from '../operational-configuration/AlertConfiguration.js';
import { evaluateAlert } from '../evaluation/index.js';
import { RUNTIME_CONSUMPTION_BOUNDARY } from './RuntimeConsumptionBoundary.js';

export { AlertRuntimeConsumptionContract, RUNTIME_CONSUMPTION_VERSION } from './AlertRuntimeConsumptionContract.js';
export { resolveRuntimeConsumption, SUPPORTED_CONSUMERS } from './AlertRuntimeConsumptionResolver.js';
export { consumeFormAlertContext, FORM_CONSUMER_KEY } from './AlertFormRuntimeAdapter.js';
export { consumeRecordAlertContext, RECORD_CONSUMER_KEY } from './AlertRecordRuntimeAdapter.js';
export { consumeDocumentAlertContext, DOCUMENT_CONSUMER_KEY } from './AlertDocumentRuntimeAdapter.js';
export { provideAlertDashboardData, DASHBOARD_CONSUMER_KEY, EMPTY_ALERT_METRICS } from './AlertDashboardDataProvider.js';
export { RUNTIME_CONSUMPTION_BOUNDARY } from './RuntimeConsumptionBoundary.js';
export { AlertConsumptionContract, ALERT_CONSUMPTION_VERSION } from '../evaluation/consumption/AlertConsumptionContract.js';
export {
  buildConsumptionEntry,
  mapEvaluationToConsumption,
  mapEvaluationsToDashboardMetrics,
  mapEvaluationToWorkspaceCard,
} from '../evaluation/consumption/AlertConsumptionMapper.js';

/**
 * Produces the evaluation entries of the single contract { descriptor,
 * evaluation } for every rule of the Runtime Context.
 *
 * The Engine (public API) computes; this layer ONLY transports the results
 * to the consumers. `runtimeContext` is transported (never built here), so
 * no temporal decision happens inside the Consumption layer.
 *
 * @param {Object} request Runtime consumption request (rules + runtimeContext).
 * @returns {Array} List of frozen { descriptor, evaluation }.
 */
function buildEvaluationEntries(request) {
  const rules = Array.isArray(request?.rules) ? request.rules : [];
  const runtimeContext = request?.runtimeContext ?? {};
  const entries = [];

  for (const rule of rules) {
    const descriptor = buildAlertRuleDescriptor(rule);
    if (!descriptor.valid) continue;
    const configuration = createAlertConfiguration(rule);
    const { evaluation } = evaluateAlert(descriptor, configuration, runtimeContext);
    entries.push(Object.freeze({ descriptor, evaluation }));
  }

  return entries;
}

export function requestRuntimeConsumption(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      available: false,
      consumed: false,
      executionEnabled: false,
      executionBlocked: false,
      reasons: ['missing-consumption-context'],
    });
  }

  if (request.capability !== 'alerts' && request.capabilityKey !== 'alerts') {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      available: false,
      consumed: false,
      module: request.moduleId || request.module || null,
      executionEnabled: false,
      executionBlocked: request.executionRequested === true,
      reasons: ['capability-not-assigned'],
    });
  }

  const executionRequested = request.executionRequested === true || request.execute === true;
  const resolution = resolveRuntimeConsumption(request);

  if (!resolution.resolved) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      available: false,
      consumed: false,
      module: request.moduleId || request.module || null,
      executionEnabled: false,
      executionBlocked: executionRequested,
      blocked: executionRequested,
      reasons: resolution.reasons,
    });
  }

  const configurationDescriptor = buildAlertConfigurationDescriptor(request);
  const evaluationEntries = buildEvaluationEntries(request);
  const consumptionRequest = Object.freeze({
    ...request,
    configurationDescriptor,
    evaluationEntries,
  });

  const engineConsumption = Object.freeze({
    dynamicForms: consumeFormAlertContext(consumptionRequest),
    dynamicRecords: consumeRecordAlertContext(consumptionRequest),
    documentRepository: consumeDocumentAlertContext(consumptionRequest),
    dashboard: provideAlertDashboardData(consumptionRequest),
  });

  const consumed = Object.values(engineConsumption).every((e) => e.consumed === true);

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: executionRequested ? 'rejected' : 'ready',
    available: true,
    consumed,
    module: request.moduleId || request.module || null,
    consumers: resolution.consumers,
    configurationDescriptor,
    evaluationEntries,
    engines: engineConsumption,
    executionEnabled: false,
    executionBlocked: executionRequested,
    blocked: executionRequested,
    reasons: executionRequested ? ['execution-not-allowed'] : [],
    boundary: RUNTIME_CONSUMPTION_BOUNDARY,
  });
}

export const ALERT_RUNTIME_CONSUMPTION = Object.freeze({
  key: 'runtime-consumption',
  name: 'Alert Runtime Consumption',
  execution: false,
});

export default ALERT_RUNTIME_CONSUMPTION;
