/**
 * RuleRuntimeProvider (Sprint 39)
 * Provider accessors for Rule runtime resolver.
 */

import type { FieldRule } from "../contracts/RuleContracts";

export type RuleRuntimeResolverLike = {
  resolve: (ruleId: string) => FieldRule | undefined;
  has: (ruleId: string) => boolean;
};

let ruleRuntimeResolver: RuleRuntimeResolverLike | null = null;

/**
 * Returns a globally registered rule runtime resolver.
 * Safe default: resolver that always returns undefined.
 */
export function getRuleRuntimeResolver(): RuleRuntimeResolverLike {
  if (!ruleRuntimeResolver) {
    ruleRuntimeResolver = {
      resolve: (): FieldRule | undefined => undefined,
      has: (): boolean => false,
    };
  }

  return ruleRuntimeResolver;
}

export function setRuleRuntimeResolver(next: RuleRuntimeResolverLike): void {
  ruleRuntimeResolver = next;
}

