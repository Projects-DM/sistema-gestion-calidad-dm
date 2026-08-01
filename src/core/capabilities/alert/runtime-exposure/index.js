/**
 * Alert Runtime Exposure
 *
 * Sprint 169 — Controlled runtime exposure boundary.
 *
 * LEVEL 4 PHASE. Executes pure visibility validation and decisions.
 * NO runtime execution, NO event consumption, NO policy execution.
 */

import { validateRuntimeExposure } from './RuntimeExposureValidator.js';
import { decideRuntimeExposure } from './RuntimeExposureDecision.js';

export { RuntimeExposureContract, RUNTIME_EXPOSURE_VERSION } from './RuntimeExposureContract.js';
export { validateRuntimeExposure, RUNTIME_EXPOSURE_VALIDATION } from './RuntimeExposureValidator.js';
export { decideRuntimeExposure } from './RuntimeExposureDecision.js';
export { RUNTIME_EXPOSURE_BOUNDARY } from './RuntimeExposureBoundary.js';

export function requestRuntimeExposure(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      visible: false,
      executable: false,
      runtimeActivated: false,
      reasons: ['missing-request'],
    });
  }

  const validation = validateRuntimeExposure(request);
  const decision = decideRuntimeExposure(validation);

  return Object.freeze({
    ...decision,
    validation,
  });
}

export const ALERT_RUNTIME_EXPOSURE = Object.freeze({
  key: 'runtime-exposure',
  name: 'Alert Controlled Runtime Exposure',
  execution: false,
});

export default ALERT_RUNTIME_EXPOSURE;
