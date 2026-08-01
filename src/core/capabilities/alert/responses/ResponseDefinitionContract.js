/**
 * ResponseDefinitionContract
 *
 * Sprint 158 — Declares the response boundary of the Alert
 * Capability.
 *
 * Sources from a policy outcome. Authorizes nothing. Executes
 * nothing.
 */

export const RESPONSE_DEFINITION_VERSION = '1';

export const ResponseDefinitionContract = Object.freeze({
  contractKey: 'alert.response-definition',
  name: 'Response Definition Contract',
  version: RESPONSE_DEFINITION_VERSION,
  source: 'policy-outcome',
  authorization: false,
  execution: false,
  representation: Object.freeze({
    responseIdentity: Object.freeze({ type: 'string', required: true, description: 'Response identity' }),
    responseVersion: Object.freeze({ type: 'string', required: true, description: 'Response version' }),
    policyOutcomeReference: Object.freeze({ type: 'string', required: true, description: 'Governed policy outcome' }),
    responseRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified response constraints' }),
  }),
  boundaries: Object.freeze({
    neverConsumes: Object.freeze([
      'Notification providers',
      'External services',
      'Runtime state',
    ]),
    neverExecutes: Object.freeze([
      'Response execution',
      'Messaging',
      'Escalation',
    ]),
  }),
});

export default ResponseDefinitionContract;
