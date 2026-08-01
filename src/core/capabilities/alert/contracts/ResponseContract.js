/**
 * ResponseContract
 *
 * Sprint 152 — Contract First capability contract.
 *
 * Represents the RESPONSE boundary. Structure-only:
 * NO notifications, providers or execution runtime.
 */

export const RESPONSE_CONTRACT_VERSION = '1';

export const ResponseContract = Object.freeze({
  contractKey: 'alert.response',
  name: 'Response Contract',
  version: RESPONSE_CONTRACT_VERSION,
  purpose: 'Represent the response boundary.',
  representation: Object.freeze({
    responseId: Object.freeze({
      type: 'string',
      required: true,
      description: 'Response identity',
    }),
    responseType: Object.freeze({
      type: 'string',
      required: true,
      description: 'Response type classification',
    }),
    target: Object.freeze({
      type: 'string',
      required: false,
      description: 'Response target',
    }),
  }),
  boundaries: Object.freeze({
    owns: Object.freeze(['Response definition', 'Response lifecycle']),
    neverOwns: Object.freeze([
      'Notifications',
      'Providers',
      'Execution runtime',
    ]),
  }),
});

export default ResponseContract;
