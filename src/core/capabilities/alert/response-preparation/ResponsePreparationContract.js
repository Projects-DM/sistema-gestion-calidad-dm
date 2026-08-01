/**
 * ResponsePreparationContract
 *
 * Sprint 173 — Declares the controlled response preparation boundary
 * of the Alert Capability.
 *
 * Response preparation declaration ONLY. Prepares no response.
 */

export const RESPONSE_PREPARATION_VERSION = '1';

export const ResponsePreparationContract = Object.freeze({
  contractKey: 'alert.response-preparation',
  name: 'Response Preparation Contract',
  version: RESPONSE_PREPARATION_VERSION,
  capabilityKey: 'alerts',
  responseMode: 'controlled',
  responseExecution: false,
  notificationEnabled: false,
  automationEnabled: false,
  representation: Object.freeze({
    responseIdentity: Object.freeze({ type: 'string', required: true, description: 'Response preparation identity' }),
    capabilityReference: Object.freeze({ type: 'string', required: true, description: 'Capability key reference' }),
    policyResultReference: Object.freeze({ type: 'string', required: true, description: 'Policy result reference' }),
    responseRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified response constraints' }),
  }),
});

export default ResponsePreparationContract;
