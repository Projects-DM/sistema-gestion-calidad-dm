/**
 * AlertVisualResolver
 *
 * Sprint 181 — Decides what to show for a given Alert Runtime Context.
 *
 * Resolution ONLY. Never renders, never executes.
 */

import { buildAlertVisualDescriptor } from './AlertVisualDescriptor.js';

export function resolveAlertVisual(alertContext) {
  const descriptor = buildAlertVisualDescriptor(alertContext);

  if (!descriptor.available) {
    return Object.freeze({
      decision: 'no-alert',
      show: false,
      visual: null,
      severity: null,
      reasons: descriptor.reasons,
    });
  }

  const severity = descriptor.visual.color === 'red'
    ? 'critical'
    : descriptor.visual.color === 'orange'
      ? 'high'
      : descriptor.visual.color === 'yellow'
        ? 'medium'
        : 'low';

  return Object.freeze({
    decision: 'show',
    show: true,
    visual: descriptor.visual,
    severity,
    reasons: [],
  });
}

export default resolveAlertVisual;
