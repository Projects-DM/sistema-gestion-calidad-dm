/**
 * RuleRegistryProvider (Sprint 38)
 * Provider accessors for RuleRegistry.
 */

import type { RuleRegistry } from "./RuleRegistry";

import { createRuleRegistry } from "./RuleRegistry";

let ruleRegistry: RuleRegistry | null = null;

export function getRuleRegistry(): RuleRegistry {
  if (!ruleRegistry) {
    ruleRegistry = createRuleRegistry();
  }

  return ruleRegistry;
}

export function setRuleRegistry(next: RuleRegistry): void {
  ruleRegistry = next;
}

