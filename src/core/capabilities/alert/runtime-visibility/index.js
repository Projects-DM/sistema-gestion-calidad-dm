/**
 * Alert Runtime Visibility
 *
 * Sprint 181 — Makes the Alert Runtime Context visible inside the
 * existing SGC-DM renderers (Dynamic Forms, Dynamic Records, Document
 * Repository) and the existing Dashboard.
 *
 * Visualization ONLY. Reuses existing engines and renderers. No new
 * screens, modules, dashboards, engines or persistence.
 */

import { buildAlertVisualDescriptor } from './AlertVisualDescriptor.js';
import { resolveAlertVisual } from './AlertVisualResolver.js';
import { renderFormAlertBadge, FORM_VISIBILITY_KEY } from './FormAlertBadgeRenderer.js';
import { renderRecordAlertBadge, RECORD_VISIBILITY_KEY } from './RecordAlertBadgeRenderer.js';
import { renderDocumentAlertBadge, DOCUMENT_VISIBILITY_KEY } from './DocumentAlertBadgeRenderer.js';
import { RUNTIME_VISIBILITY_BOUNDARY } from './RuntimeVisibilityBoundary.js';

export const RUNTIME_VISIBILITY_VERSION = 1;

export const AlertRuntimeVisibilityContract = Object.freeze({
  contractKey: 'alert.runtime-visibility',
  version: 1,
  capabilityKey: 'alerts',
  renderTargets: Object.freeze([
    'dynamicForms',
    'dynamicRecords',
    'documentRepository',
  ]),
  executionEnabled: false,
});

export { buildAlertVisualDescriptor } from './AlertVisualDescriptor.js';
export { resolveAlertVisual } from './AlertVisualResolver.js';
export { renderFormAlertBadge, FORM_VISIBILITY_KEY } from './FormAlertBadgeRenderer.js';
export { renderRecordAlertBadge, RECORD_VISIBILITY_KEY } from './RecordAlertBadgeRenderer.js';
export { renderDocumentAlertBadge, DOCUMENT_VISIBILITY_KEY } from './DocumentAlertBadgeRenderer.js';
export { RUNTIME_VISIBILITY_BOUNDARY } from './RuntimeVisibilityBoundary.js';

const RENDERER_BY_TARGET = Object.freeze({
  dynamicForms: renderFormAlertBadge,
  dynamicRecords: renderRecordAlertBadge,
  documentRepository: renderDocumentAlertBadge,
});

export function requestRuntimeVisibility(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      available: false,
      visible: false,
      badges: {},
      executionEnabled: false,
      executionBlocked: false,
      reasons: ['missing-visibility-context'],
    });
  }

  if (request.capability !== 'alerts' && request.capabilityKey !== 'alerts') {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      available: false,
      visible: false,
      badges: {},
      module: request.moduleId || request.module || null,
      executionEnabled: false,
      executionBlocked: request.executionRequested === true,
      reasons: ['capability-not-assigned'],
    });
  }

  const executionRequested = request.executionRequested === true || request.execute === true;

  const targets = Array.isArray(request.targets)
    ? request.targets.filter((t) => RENDERER_BY_TARGET[t])
    : Object.keys(RENDERER_BY_TARGET);

  const badges = {};
  let anyVisible = false;

  for (const target of targets) {
    const alertContext = request.context && request.context[target]
      ? request.context[target]
      : null;

    if (!alertContext) {
      badges[target] = Object.freeze({
        renderer: target,
        show: false,
        badge: null,
        reasons: ['no-alert-context'],
      });
      continue;
    }

    const descriptor = buildAlertVisualDescriptor(alertContext);
    const resolution = resolveAlertVisual(alertContext);

    if (!resolution.show) {
      badges[target] = Object.freeze({
        renderer: target,
        show: false,
        badge: null,
        reasons: descriptor.reasons,
      });
      continue;
    }

    const renderer = RENDERER_BY_TARGET[target];
    badges[target] = renderer({ visual: resolution.visual, severity: resolution.severity });
    if (badges[target].show === true) {
      anyVisible = true;
    }
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: executionRequested ? 'rejected' : 'ready',
    available: true,
    visible: anyVisible,
    module: request.moduleId || request.module || null,
    badges,
    executionEnabled: false,
    executionBlocked: executionRequested,
    blocked: executionRequested,
    reasons: executionRequested ? ['execution-not-allowed'] : [],
    boundary: RUNTIME_VISIBILITY_BOUNDARY,
  });
}

export const ALERT_RUNTIME_VISIBILITY = Object.freeze({
  key: 'runtime-visibility',
  name: 'Alert Runtime Visibility',
  execution: false,
});

export default ALERT_RUNTIME_VISIBILITY;
