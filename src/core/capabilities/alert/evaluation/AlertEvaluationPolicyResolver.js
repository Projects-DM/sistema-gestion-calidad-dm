/**
 * AlertEvaluationPolicyResolver
 *
 * Sprint 199.R — Resolves the business policy for an evaluation.
 *
 * Today it returns ONLY RelativeRiskPolicy. In the future it may return
 * RegulatoryPolicy, SLAPolicy, EnterprisePolicy or CustomerPolicy WITHOUT
 * modifying the Engine (Open/Closed, Sprint 198.R5).
 *
 * The resolver does NOT know the Dashboard, the Runtime or the Metadata
 * internals — it only inspects the Configuration Value Object.
 *
 * Resolution ONLY. Never evaluates.
 */

import { RelativeRiskPolicy } from './RelativeRiskPolicy.js';

const IMPLEMENTED_POLICIES = Object.freeze([
  new RelativeRiskPolicy(),
]);

/**
 * Resolves the policy for a configuration.
 *
 * Metadata-driven: today the relative risk model is the only implemented
 * policy, so it is always returned.
 *
 * @param {Object} configuration AlertConfiguration Value Object (inmutable).
 * @returns {Object} AlertEvaluationPolicy.
 */
export function resolveEvaluationPolicy(configuration) {
  const riskModel = configuration?.risk?.model ?? 'relative';
  const matches = IMPLEMENTED_POLICIES.filter((p) => p.selects && p.selects(riskModel));
  if (matches.length > 0) return matches[0];
  return IMPLEMENTED_POLICIES[0];
}

export const EVALUATION_POLICY_RESOLVER = Object.freeze({
  contractKey: 'alert.evaluation.policy-resolver',
  version: 1,
  capabilityKey: 'alerts',
  implemented: IMPLEMENTED_POLICIES.map((p) => p.key),
  selection: 'metadata-driven',
  reserved: Object.freeze([
    'RegulatoryPolicy',
    'SLAPolicy',
    'EnterprisePolicy',
    'CustomerPolicy',
  ]),
});

export default resolveEvaluationPolicy;
