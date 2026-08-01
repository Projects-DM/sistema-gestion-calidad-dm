/**
 * Alert Capability Rendering
 *
 * Sprint 174 — Dynamic rendering integration with the existing
 * Module Capability Assignment model.
 *
 * Integration ONLY. Reuses existing Runtime, Resolver and Renderers.
 * No independent UI, no persistence.
 */

import { AlertCapabilityRendererContract } from './AlertCapabilityRendererContract.js';
import { buildRuntimeDescriptor } from './AlertRuntimeDescriptor.js';
import { ALERT_RENDERING_BOUNDARY } from './AlertRenderingBoundary.js';

export { AlertCapabilityRendererContract, ALERT_RENDERER_VERSION } from './AlertCapabilityRendererContract.js';
export { buildRuntimeDescriptor, ALERT_RUNTIME_DESCRIPTOR } from './AlertRuntimeDescriptor.js';
export { ALERT_RENDERING_BOUNDARY } from './AlertRenderingBoundary.js';

export const SUPPORTED_RENDER_TARGETS = Object.freeze(['forms', 'records', 'documents']);

export function requestRendering(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      capabilityAvailable: false,
      renderingAllowed: false,
      executionAllowed: false,
      reasons: ['missing-capability-context'],
    });
  }

  if (request.capability !== 'alerts' || request.enabled !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      capabilityAvailable: false,
      renderingAllowed: false,
      executionAllowed: false,
      moduleId: request.moduleId || null,
      reasons: ['capability-not-available'],
    });
  }

  if (!SUPPORTED_RENDER_TARGETS.includes(request.target)) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      capabilityAvailable: true,
      renderingAllowed: false,
      executionAllowed: false,
      moduleId: request.moduleId || null,
      reasons: ['unsupported-target'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: 'ready',
    capabilityAvailable: true,
    renderingAllowed: true,
    executionAllowed: false,
    moduleId: request.moduleId || null,
    target: request.target,
    reasons: [],
    boundary: ALERT_RENDERING_BOUNDARY,
  });
}

export const ALERT_CAPABILITY_RENDERING = Object.freeze({
  key: 'rendering',
  name: 'Alert Capability Rendering',
  execution: false,
});

export default ALERT_CAPABILITY_RENDERING;
