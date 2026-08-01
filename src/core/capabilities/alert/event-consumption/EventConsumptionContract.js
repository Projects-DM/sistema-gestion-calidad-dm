/**
 * EventConsumptionContract
 *
 * Sprint 170 — Declares the controlled event consumption boundary of
 * the Alert Capability.
 *
 * Consumption declaration ONLY. Processes nothing.
 */

export const EVENT_CONSUMPTION_VERSION = '1';

export const EventConsumptionContract = Object.freeze({
  contractKey: 'alert.event-consumption',
  name: 'Event Consumption Contract',
  version: EVENT_CONSUMPTION_VERSION,
  capabilityKey: 'alerts',
  consumptionMode: 'controlled',
  eventProcessing: false,
  decisionExecution: false,
  policyExecution: false,
  responseExecution: false,
  representation: Object.freeze({
    eventConsumptionIdentity: Object.freeze({ type: 'string', required: true, description: 'Event consumption identity' }),
    capabilityReference: Object.freeze({ type: 'string', required: true, description: 'Capability key reference' }),
    allowedEventSources: Object.freeze({ type: 'array', required: true, description: 'Certified event source constraints' }),
    consumptionRestrictions: Object.freeze({ type: 'array', required: true, description: 'Certified consumption constraints' }),
  }),
});

export default EventConsumptionContract;
