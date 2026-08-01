/**
 * EventConsumptionBoundary
 *
 * Sprint 170 — Protects the capability from intake-driven execution.
 *
 * Path: Event Source → Alert Capability → Future Processing Layer.
 * Event intake NEVER triggers alert execution.
 */

export const EVENT_CONSUMPTION_BOUNDARY = Object.freeze({
  key: 'event-consumption-boundary',
  name: 'Alert Event Consumption Boundary',
  protectedPath: Object.freeze([
    'Event Source',
    'Alert Capability',
    'Future Processing Layer',
  ]),
  forbiddenPath: Object.freeze([
    'Event Intake',
    'Alert Execution',
  ]),
});

export default EVENT_CONSUMPTION_BOUNDARY;
