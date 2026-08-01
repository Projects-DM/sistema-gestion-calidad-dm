/**
 * AlertContract
 *
 * Sprint 152 — Contract First capability contract.
 *
 * Represents the ALERT DEFINITION boundary. Structure-only:
 * NO alert processing, evaluation or generation.
 *
 * Consumers interact with the capability ONLY through certified
 * contracts — never through internal domains.
 */

export const ALERT_CONTRACT_VERSION = '1';

export const AlertContract = Object.freeze({
  contractKey: 'alert.definition',
  name: 'Alert Contract',
  version: ALERT_CONTRACT_VERSION,
  purpose: 'Represent the alert definition boundary.',
  representation: Object.freeze({
    identity: Object.freeze({
      type: 'string',
      required: true,
      description: 'Alert identity',
    }),
    name: Object.freeze({
      type: 'string',
      required: true,
      description: 'Alert name',
    }),
    description: Object.freeze({
      type: 'string',
      required: false,
      description: 'Alert description',
    }),
  }),
  boundaries: Object.freeze({
    owns: Object.freeze(['Alert identity', 'Alert state']),
    neverOwns: Object.freeze([
      'Alert processing',
      'Alert evaluation',
      'Alert generation',
    ]),
  }),
});

export default AlertContract;
