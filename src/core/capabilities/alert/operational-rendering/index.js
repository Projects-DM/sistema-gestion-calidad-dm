/**
 * Alert Operational Rendering
 *
 * Sprint 175 — Final operational rendering resolution and enterprise
 * activation.
 *
 * Resolution ONLY. Reuses existing Runtime and Renderers. No
 * parallel infrastructure, no independent UI.
 */

import { resolveOperationalAvailability } from './AlertOperationalRenderer.js';
import { resolveAlertRendering } from './AlertRenderingResolver.js';
import { decideAlertRendering } from './AlertRenderingDecision.js';
import { OPERATIONAL_RENDERING_BOUNDARY } from './OperationalRenderingBoundary.js';

export { resolveOperationalAvailability, ALERT_OPERATIONAL_TARGETS } from './AlertOperationalRenderer.js';
export { resolveAlertRendering, SUPPORTED_RESOLUTION_TARGETS } from './AlertRenderingResolver.js';
export { decideAlertRendering } from './AlertRenderingDecision.js';
export { OPERATIONAL_RENDERING_BOUNDARY } from './OperationalRenderingBoundary.js';

export function requestOperationalRendering(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      renderingAllowed: false,
      executionAllowed: false,
      governanceValidated: false,
      reasons: ['missing-capability-context'],
    });
  }

  const availability = resolveOperationalAvailability(request);
  const resolution = resolveAlertRendering(request);
  const decision = decideAlertRendering(resolution);

  const executionBlocked = request.executionRequested === true;

  return Object.freeze({
    capabilityKey: 'alerts',
    module: request.module || null,
    status: availability.available ? 'available' : 'unavailable',
    available: availability.available,
    renderingAllowed: availability.available && decision.renderingAllowed,
    executionAllowed: false,
    executionBlocked: executionBlocked ? true : undefined,
    targets: resolution.targets,
    governanceValidated: decision.governanceValidated,
    reasons: availability.available && decision.renderingAllowed ? [] : [...new Set([...availability.reasons, ...resolution.reasons])],
    boundary: OPERATIONAL_RENDERING_BOUNDARY,
  });
}

export const ALERT_OPERATIONAL_RENDERING = Object.freeze({
  key: 'operational-rendering',
  name: 'Alert Operational Rendering',
  execution: false,
});

export default ALERT_OPERATIONAL_RENDERING;
