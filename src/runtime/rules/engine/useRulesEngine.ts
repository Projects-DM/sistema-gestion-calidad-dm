/**
 * useRulesEngine (Sprint 28)
 * React hook layer only — recompute results when formData/rules change.
 */

import { useMemo } from "react";

import type { FieldRule } from "../contracts/RuleContracts";
import { evaluateRules } from "./RulesEngine";

export type UseRulesEngineInput = {
  rules: FieldRule[];
  formData: Record<string, unknown>;
};

export type UseRulesEngineOutput = {
  hiddenFields: string[];
  disabledFields: string[];
  computedValues: Record<string, unknown>;
};

export function useRulesEngine({ rules, formData }: UseRulesEngineInput): UseRulesEngineOutput {
  return useMemo(() => {
    return evaluateRules({ rules, formData });
  }, [rules, formData]);
}

export default useRulesEngine;

