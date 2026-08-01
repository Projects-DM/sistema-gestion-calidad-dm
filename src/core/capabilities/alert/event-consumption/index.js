/**
 * Alert Event Consumption
 *
 * Sprint 170 — Controlled event consumption boundary.
 *
 * LEVEL 4 PHASE. Executes pure consumption validation and decisions.
 * NO event processing, NO subscription, NO alert generation.
 */

import { validateEventConsumption } from './EventConsumptionValidator.js';
import { decideEventConsumption } from './EventConsumptionDecision.js';

export { EventConsumptionContract, EVENT_CONSUMPTION_VERSION } from './EventConsumptionContract.js';
export { validateEventConsumption, EVENT_CONSUMPTION_VALIDATION } from './EventConsumptionValidator.js';
export { decideEventConsumption } from './EventConsumptionDecision.js';
export { EVENT_CONSUMPTION_BOUNDARY } from './EventConsumptionBoundary.js';

export function requestEventConsumption(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      consumptionAllowed: false,
      processingEnabled: false,
      executionEnabled: false,
      reasons: ['missing-request'],
    });
  }

  const validation = validateEventConsumption(request);
  const decision = decideEventConsumption(validation);

  return Object.freeze({
    ...decision,
    validation,
  });
}

export const ALERT_EVENT_CONSUMPTION = Object.freeze({
  key: 'event-consumption',
  name: 'Alert Controlled Event Consumption',
  processing: false,
});

export default ALERT_EVENT_CONSUMPTION;
