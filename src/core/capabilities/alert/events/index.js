/**
 * Alert Events
 *
 * Sprint 155 — Certified event consumption boundary.
 *
 * CERTIFIED STRUCTURE ONLY. Declares how the Alert Capability will
 * consume certified SGC-DM events. No Event Bus, no listeners, no
 * processing.
 */

export { EventConsumptionContract, EVENT_CONSUMPTION_VERSION } from './EventConsumptionContract.js';
export { EVENT_COMPATIBILITY } from './EventCompatibility.js';
export { EVENT_BOUNDARY } from './EventBoundary.js';

export const ALERT_EVENTS = Object.freeze({
  key: 'events',
  name: 'Alert Event Consumption Boundary',
  execution: false,
});

export default ALERT_EVENTS;
