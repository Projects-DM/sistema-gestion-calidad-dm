/**
 * DecisionContextContract
 *
 * Sprint 171 — Declares the controlled decision context boundary of
 * the Alert Capability.
 *
 * Context declaration ONLY. Evaluates nothing.
 */

export const DECISION_CONTEXT_VERSION = '1';

export const DecisionContextContract = Object.freeze({
  contractKey: 'alert.decision-context',
  name: 'Decision Context Contract',
  version: DECISION_CONTEXT_VERSION,
  capabilityKey: 'alerts',
  contextMode: 'controlled',
  decisionExecution: false,
  policyExecution: false,
  responseExecution: false,
  representation: Object.freeze({
    decisionContextIdentity: Object.freeze({ type: 'string', required: true, description: 'Decision context identity' }),
    capabilityReference: Object.freeze({ type: 'string', required: true, description: 'Capability key reference' }),
    eventReference: Object.freeze({ type: 'string', required: true, description: 'Source event reference' }),
    contextRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified context constraints' }),
  }),
});

export default DecisionContextContract;
