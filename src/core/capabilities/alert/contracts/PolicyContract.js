/**
 * PolicyContract
 *
 * Sprint 152 — Contract First capability contract.
 *
 * Represents the POLICY boundary. Structure-only:
 * NO policy evaluation, severity calculation or workflow logic.
 */

export const POLICY_CONTRACT_VERSION = '1';

export const PolicyContract = Object.freeze({
  contractKey: 'alert.policy',
  name: 'Policy Contract',
  version: POLICY_CONTRACT_VERSION,
  purpose: 'Represent the policy boundary.',
  representation: Object.freeze({
    policyId: Object.freeze({
      type: 'string',
      required: true,
      description: 'Policy identity',
    }),
    name: Object.freeze({
      type: 'string',
      required: true,
      description: 'Policy name',
    }),
    severity: Object.freeze({
      type: 'string',
      required: false,
      description: 'Policy severity classification',
    }),
  }),
  boundaries: Object.freeze({
    owns: Object.freeze(['Policy identity', 'Policy lifecycle']),
    neverOwns: Object.freeze([
      'Policy evaluation',
      'Severity calculation',
      'Workflow logic',
    ]),
  }),
});

export default PolicyContract;
