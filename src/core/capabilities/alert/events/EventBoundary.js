/**
 * EventBoundary
 *
 * Sprint 155 — Protects the internal domain from external events.
 *
 * Path: External Event → Capability Contract → Internal Domain.
 * Event payloads NEVER map directly onto domain objects.
 */

export const EVENT_BOUNDARY = Object.freeze({
  key: 'event-boundary',
  name: 'Alert Event Boundary',
  protectedPath: Object.freeze([
    'External Event',
    'Capability Contract',
    'Internal Domain',
  ]),
  forbiddenPath: Object.freeze([
    'Event Payload',
    'Domain Objects',
  ]),
});

export default EVENT_BOUNDARY;
