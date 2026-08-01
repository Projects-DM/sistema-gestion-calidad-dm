/**
 * EventCompatibility
 *
 * Sprint 155 — Declares the supported certified event model.
 *
 * Describes compatibility only. Does NOT execute events.
 */

export const EVENT_COMPATIBILITY = Object.freeze({
  eventModel: Object.freeze({
    supportedModel: 'certified-events-only',
    producerBoundary: 'external — SGC-DM certified producers',
    consumerRole: 'future decision input',
  }),
  versionCompatibility: Object.freeze({
    contractVersioned: true,
    futureVersions: 'compatibility validated on consumption',
  }),
  schemaProtection: Object.freeze({
    validates: 'event contract schema only',
    neverBinds: Object.freeze([
      'Kafka',
      'RabbitMQ',
      'Supabase Realtime',
      'WebSockets',
      'External providers',
    ]),
  }),
  execution: false,
});

export default EVENT_COMPATIBILITY;
