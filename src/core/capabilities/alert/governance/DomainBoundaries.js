/**
 * DomainBoundaries
 *
 * Sprint 151 (v2) — Physical domain isolation of the Alert Capability.
 *
 * Bounded contexts represent RESPONSIBILITY MODELS ONLY — not functional
 * domains. There are no rules, engines or processes yet.
 *
 * Each bounded context is an independent boundary. No shared internal
 * state, no cross-domain leakage, no circular dependencies.
 *
 * Bounded contexts communicate ONLY through contracts/.
 */

export const DOMAIN_BOUNDARIES = Object.freeze([
  {
    key: 'alert-definition',
    name: 'Alert Definition Bounded Context',
    boundary: Object.freeze({
      owns: Object.freeze(['Alert identity', 'Alert state']),
      neverOwns: Object.freeze(['Evaluation', 'Decision', 'Policy', 'Response']),
      communication: 'contracts only',
    }),
  },
  {
    key: 'decision-context',
    name: 'Decision Context Bounded Context',
    boundary: Object.freeze({
      owns: Object.freeze(['Decision context', 'Decision outcome']),
      neverOwns: Object.freeze(['Alert state', 'Policy', 'Response']),
      communication: 'contracts only',
    }),
  },
  {
    key: 'policy-definition',
    name: 'Policy Definition Bounded Context',
    boundary: Object.freeze({
      owns: Object.freeze(['Policy identity', 'Policy lifecycle']),
      neverOwns: Object.freeze(['Alert state', 'Decision', 'Response']),
      communication: 'contracts only',
    }),
  },
  {
    key: 'response-definition',
    name: 'Response Definition Bounded Context',
    boundary: Object.freeze({
      owns: Object.freeze(['Response definition', 'Response lifecycle']),
      neverOwns: Object.freeze(['Alert state', 'Decision', 'Policy']),
      communication: 'contracts only',
    }),
  },
]);

export function getDomainBoundary(key) {
  return DOMAIN_BOUNDARIES.find((d) => d.key === key) ?? null;
}
