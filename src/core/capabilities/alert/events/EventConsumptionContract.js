/**
 * EventConsumptionContract
 *
 * Sprint 155 — Declares the certified event consumption boundary of
 * the Alert Capability.
 *
 * Consumes certified events only. Exposes nothing. Executes nothing.
 */

export const EVENT_CONSUMPTION_VERSION = '1';

export const EventConsumptionContract = Object.freeze({
  contractKey: 'alert.event',
  name: 'Event Consumption Contract',
  version: EVENT_CONSUMPTION_VERSION,
  consumes: 'certified-events-only',
  exposes: false,
  execution: false,
  representation: Object.freeze({
    eventIdentity: Object.freeze({ type: 'string', required: true, description: 'Certified event identity' }),
    eventVersion: Object.freeze({ type: 'string', required: true, description: 'Certified event version' }),
    producerBoundary: Object.freeze({ type: 'string', required: true, description: 'Producer contract reference' }),
    consumerRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified consumer constraints' }),
  }),
  boundaries: Object.freeze({
    neverConsumes: Object.freeze([
      'Database events',
      'Internal runtime objects',
      'Persistence models',
    ]),
    neverExecutes: Object.freeze([
      'Event processing',
      'Alert triggering',
      'Decision logic',
    ]),
  }),
});

export default EventConsumptionContract;
