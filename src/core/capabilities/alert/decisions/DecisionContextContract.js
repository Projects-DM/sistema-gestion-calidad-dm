/**
 * DecisionContextContract
 *
 * Sprint 156 — Declares how a certified event becomes a governed
 * decision context.
 *
 * Transforms nothing. Evaluates nothing. Executes nothing.
 */

export const DECISION_CONTEXT_VERSION = '1';

export const DecisionContextContract = Object.freeze({
  contractKey: 'alert.decision-context',
  name: 'Decision Context Contract',
  version: DECISION_CONTEXT_VERSION,
  source: 'certified-event',
  evaluation: false,
  execution: false,
  representation: Object.freeze({
    decisionIdentity: Object.freeze({ type: 'string', required: true, description: 'Decision context identity' }),
    sourceEventReference: Object.freeze({ type: 'string', required: true, description: 'Certified source event' }),
    contextVersion: Object.freeze({ type: 'string', required: true, description: 'Decision context version' }),
    decisionRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified decision constraints' }),
  }),
  boundaries: Object.freeze({
    neverConsumes: Object.freeze([
      'Internal decision objects',
      'Rule structures',
      'Runtime state',
    ]),
    neverExecutes: Object.freeze([
      'Decision processing',
      'Rule evaluation',
      'Alert generation',
    ]),
  }),
});

export default DecisionContextContract;
