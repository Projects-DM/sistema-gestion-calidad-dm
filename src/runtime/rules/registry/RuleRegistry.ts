/**
 * RuleRegistry (Sprint 38)
 * Metadata-driven registry for FieldRule resolution.
 * Contracts only — no orchestration and no side effects.
 */

import type { FieldRule } from "../contracts/RuleContracts";

export type RuleId = string;

export type RuleRegistry = {
  register: (rule: FieldRule) => void;
  get: (ruleId: RuleId) => FieldRule | undefined;
  has: (ruleId: RuleId) => boolean;
  getAll: () => FieldRule[];
};

export const createRuleRegistry = (): RuleRegistry => {
  const map = new Map<RuleId, FieldRule>();

  return {
    register(rule: FieldRule): void {
      map.set(rule.id, rule);
    },

    get(ruleId: RuleId): FieldRule | undefined {
      return map.get(ruleId);
    },

    has(ruleId: RuleId): boolean {
      return map.has(ruleId);
    },

    getAll(): FieldRule[] {
      return Array.from(map.values());
    },
  };
};

