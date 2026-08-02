/**
 * Alert Runtime Binding — CONSOLIDATED (Sprint 185)
 *
 * Runtime Binding Finalization.
 *
 * Binds the Alert Capability EXCLUSIVELY to the module's existing
 * operational resources (forms, records, documents). The Runtime Context
 * produced here derives 100% from existing resources — never from demo
 * rules, fake alerts, hardcoded messages or generated data.
 *
 * Binding ONLY. Reuses existing Runtime. No parallel runtime,
 * no independent UI, no persistence.
 */

import { collectExistingModuleRuntime } from './ExistingModuleRuntimeCollector.js';
import { resolveExistingOperationalSources } from './ExistingOperationalSourceResolver.js';
import { buildRuntimeBindingDescriptor } from './RuntimeBindingDescriptor.js';
import { validateRuntimeBinding } from './RuntimeBindingValidator.js';
import { resolveRuntimeBinding, buildBoundAlertContexts } from './RuntimeBindingResolver.js';
import {
  RUNTIME_BINDING_BOUNDARY,
  findForbiddenDataToken,
} from './RuntimeBindingBoundary.js';

export { collectExistingModuleRuntime } from './ExistingModuleRuntimeCollector.js';
export { resolveExistingOperationalSources, resolveExistingOperationalSource } from './ExistingOperationalSourceResolver.js';
export { buildRuntimeBindingDescriptor, buildResourceBindingDescriptor } from './RuntimeBindingDescriptor.js';
export { validateRuntimeBinding } from './RuntimeBindingValidator.js';
export { resolveRuntimeBinding, buildBoundAlertContexts } from './RuntimeBindingResolver.js';
export { RUNTIME_BINDING_BOUNDARY, findForbiddenDataToken, FORBIDDEN_DATA_TOKENS } from './RuntimeBindingBoundary.js';

/**
 * Requests the Runtime Binding for a module.
 *
 * The request MUST carry the module's EXISTING resources under
 * `request.existing = { forms, records, documents }`. Any request that
 * attempts to inject demo/fake/hardcoded data is rejected by the
 * RuntimeBindingBoundary.
 *
 * @param {Object} request
 * @param {Object} [request.existing] Existing module resources.
 * @returns {Object} Runtime binding resolution.
 */
export function requestRuntimeBinding(request) {
  const executionRequested = !!(request && (request.executionRequested === true || request.execute === true));

  if (!request) {
    return Object.freeze({
      module: null,
      runtimeCapabilities: [],
      runtimeAvailable: false,
      available: false,
      runtimeEnabled: false,
      runtimeBound: false,
      executionEnabled: false,
      executionBlocked: false,
      blocked: false,
      rejected: true,
      reason: 'missing-capability-context',
    });
  }

  // RuntimeBindingBoundary — block any demo/simulated/hardcoded data.
  const forbiddenToken = findForbiddenDataToken(request.existing);
  if (forbiddenToken) {
    return Object.freeze({
      module: request.moduleId || request.module || null,
      runtimeCapabilities: [],
      runtimeAvailable: false,
      available: false,
      runtimeEnabled: false,
      runtimeBound: false,
      executionEnabled: false,
      executionBlocked: executionRequested,
      blocked: true,
      rejected: true,
      reason: `demo-data-blocked:${forbiddenToken}`,
      boundary: RUNTIME_BINDING_BOUNDARY,
    });
  }

  const resolution = resolveRuntimeBinding(request);

  if (!resolution.resolved) {
    return Object.freeze({
      module: request.moduleId || request.module || null,
      runtimeCapabilities: [],
      runtimeAvailable: false,
      available: false,
      runtimeEnabled: false,
      runtimeBound: false,
      executionEnabled: false,
      executionBlocked: executionRequested,
      blocked: executionRequested,
      rejected: true,
      reason: resolution.reasons[0] || 'runtime-binding-not-resolved',
      boundary: RUNTIME_BINDING_BOUNDARY,
    });
  }

  const runtimeCapabilities = [
    Object.freeze({
      key: 'alerts',
      experience: 'alert-monitoring',
      available: true,
      runtimeEnabled: true,
      targets: ['dynamicForms', 'dynamicRecords', 'documentRepository'],
      allowed: true,
    }),
  ];

  return Object.freeze({
    module: request.moduleId || request.module || null,
    runtimeCapabilities,
    runtimeAvailable: true,
    available: true,
    runtimeEnabled: true,
    runtimeBound: resolution.runtimeBound,
    executionEnabled: false,
    executionBlocked: executionRequested,
    blocked: executionRequested,
    rejected: false,
    existing: resolution.existing,
    sources: resolution.sources,
    counts: resolution.counts,
    anySourceExists: resolution.anySourceExists,
    descriptor: resolution.descriptor,
    validation: resolution.validation,
    boundAlerts: resolution.boundAlerts,
    reasons: [],
    boundary: RUNTIME_BINDING_BOUNDARY,
  });
}

export const RUNTIME_BINDING_VERSION = '2';

export const AlertRuntimeBindingContract = Object.freeze({
  contractKey: 'alert.runtime-binding',
  name: 'Alert Runtime Binding Contract',
  version: RUNTIME_BINDING_VERSION,
  capabilityKey: 'alerts',
  runtimeMode: 'controlled',
  source: 'existing-module-resources',
  supportedContexts: Object.freeze([
    'dynamicForms',
    'dynamicRecords',
    'documentRepository',
  ]),
  executionEnabled: false,
  representation: Object.freeze({
    module: Object.freeze({ type: 'string', required: true, description: 'Module runtime reference' }),
    resource: Object.freeze({ type: 'string', required: true, description: 'Existing resource identity' }),
    resourceId: Object.freeze({ type: 'string', required: true, description: 'Existing resource id' }),
    resourceType: Object.freeze({ type: 'string', required: true, description: 'Existing resource type' }),
    available: Object.freeze({ type: 'boolean', required: true, description: 'Resource exists' }),
    runtimeBound: Object.freeze({ type: 'boolean', required: true, description: 'Bound to existing Runtime' }),
  }),
});

export const ALERT_RUNTIME_BINDING = Object.freeze({
  key: 'runtime-binding',
  name: 'Alert Runtime Binding',
  execution: false,
});

export default ALERT_RUNTIME_BINDING;
