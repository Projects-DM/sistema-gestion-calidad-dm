/**
 * Alert Runtime Binding
 *
 * Sprint 178 — Binds the Alert Capability into the existing Runtime
 * and prepares renderer consumption.
 *
 * Binding ONLY. Reuses existing Runtime and Renderers. No parallel
 * runtime, no independent UI.
 */

import { buildRuntimeCapabilityContext } from './AlertRuntimeCapabilityContext.js';
import { resolveRuntimeBinding } from './AlertRuntimeBindingResolver.js';
import { RUNTIME_BINDING_BOUNDARY } from './RuntimeBindingBoundary.js';

export { AlertRuntimeBindingContract, RUNTIME_BINDING_VERSION } from './AlertRuntimeBindingContract.js';
export { buildRuntimeCapabilityContext } from './AlertRuntimeCapabilityContext.js';
export { resolveRuntimeBinding } from './AlertRuntimeBindingResolver.js';
export { RUNTIME_BINDING_BOUNDARY } from './RuntimeBindingBoundary.js';

export function requestRuntimeBinding(request) {
  const executionRequested = !!(request && (request.executionRequested === true || request.execute === true));

  if (!request) {
    return Object.freeze({
      module: null,
      runtimeCapabilities: [],
      runtimeAvailable: false,
      available: false,
      executionEnabled: false,
      executionBlocked: false,
      blocked: false,
      rejected: true,
      reason: 'missing-capability-context',
    });
  }

  const resolution = resolveRuntimeBinding(request);
  const context = buildRuntimeCapabilityContext(request);

  if (!resolution.resolved) {
    return Object.freeze({
      module: request.moduleId || request.module || null,
      runtimeCapabilities: [],
      runtimeAvailable: false,
      available: false,
      executionEnabled: false,
      executionBlocked: executionRequested,
      blocked: executionRequested,
      rejected: true,
      reason: resolution.reasons[0],
    });
  }

  const runtimeCapabilities = [
    Object.freeze({
      key: 'alerts',
      experience: 'alert-monitoring',
      available: true,
      runtimeEnabled: true,
      targets: context.targets,
      allowed: true,
    }),
  ];

  return Object.freeze({
    module: request.moduleId || request.module || null,
    runtimeCapabilities,
    runtimeAvailable: true,
    available: true,
    runtimeEnabled: true,
    allowed: true,
    executionEnabled: false,
    executionBlocked: executionRequested,
    blocked: executionRequested,
    rejected: false,
    context,
    boundary: RUNTIME_BINDING_BOUNDARY,
  });
}

export const ALERT_RUNTIME_BINDING = Object.freeze({
  key: 'runtime-binding',
  name: 'Alert Runtime Binding',
  execution: false,
});

export default ALERT_RUNTIME_BINDING;
