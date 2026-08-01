/**
 * IntegrationContract
 *
 * Sprint 164 — Declares the integration boundary of the Alert
 * Capability.
 *
 * Defines allowed consumers and integration requirements ONLY.
 * Executes no integration flow.
 */

export const INTEGRATION_VERSION = '1';

export const IntegrationContract = Object.freeze({
  contractKey: 'alert.integration',
  name: 'Integration Contract',
  version: INTEGRATION_VERSION,
  capabilityKey: 'alerts',
  integrationMode: 'controlled',
  execution: false,
  runtimeDependency: false,
  persistenceDependency: false,
  representation: Object.freeze({
    integrationIdentity: Object.freeze({ type: 'string', required: true, description: 'Integration identity' }),
    capabilityReference: Object.freeze({ type: 'string', required: true, description: 'Capability key reference' }),
    allowedConsumers: Object.freeze({ type: 'array', required: true, description: 'Certified consumer constraints' }),
    integrationRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified integration constraints' }),
  }),
  boundaries: Object.freeze({
    neverConsumes: Object.freeze([
      'Internal infrastructure',
      'Private runtime state',
      'Database structures',
    ]),
    neverExecutes: Object.freeze([
      'Integration flow',
      'External communication',
      'Operational processing',
    ]),
  }),
});

export default IntegrationContract;
