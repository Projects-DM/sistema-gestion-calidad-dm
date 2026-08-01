/**
 * DecisionContract
 *
 * Sprint 152 — Contract First capability contract.
 *
 * Represents the DECISION boundary. Structure-only:
 * NO rules engine, evaluation logic or decision execution.
 */

export const DECISION_CONTRACT_VERSION = '1';

export const DecisionContract = Object.freeze({
  contractKey: 'alert.decision',
  name: 'Decision Contract',
  version: DECISION_CONTRACT_VERSION,
  purpose: 'Represent the decision boundary.',
  representation: Object.freeze({
    decisionId: Object.freeze({
      type: 'string',
      required: true,
      description: 'Decision identity',
    }),
    context: Object.freeze({
      type: 'object',
      required: false,
      description: 'Decision context',
    }),
    outcome: Object.freeze({
      type: 'string',
      required: true,
      description: 'Decision outcome',
    }),
  }),
  boundaries: Object.freeze({
    owns: Object.freeze(['Decision context', 'Decision outcome']),
    neverOwns: Object.freeze([
      'Rules engine',
      'Evaluation logic',
      'Decision execution',
    ]),
  }),
});

export default DecisionContract;
