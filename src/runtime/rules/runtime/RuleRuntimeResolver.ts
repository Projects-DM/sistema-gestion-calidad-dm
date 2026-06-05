/**
 * RuleRuntimeResolver (Sprint 38)
 * Resolution-only contract for FieldRule by id.
 */

import type { FieldRule } from "../contracts/RuleContracts";

import { getRuleRegistry } from "../registry/RuleRegistryProvider";

export type RuleRuntimeResolver = {
  resolve: (ruleId: string) => FieldRule | undefined;
  has: (ruleId: string) => boolean;
};

export const RuleRuntimeResolver: RuleRuntimeResolver = {
  resolve(ruleId: string): FieldRule | undefined {
    return getRuleRegistry().get(ruleId);
  },

  has(ruleId: string): boolean {
    return getRuleRegistry().has(ruleId);
  },
};

