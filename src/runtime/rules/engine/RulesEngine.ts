/**
 * RulesEngine (Sprint 28)
 * Pure functions only — no React, no DOM, no persistence.
 */

import type { FieldRule, RuleAction, RuleCondition } from "../contracts/RuleContracts";

export type RulesEngineInput = {
  rules: FieldRule[];
  formData: Record<string, unknown>;
};

export type RulesEngineResult = {
  hiddenFields: string[];
  disabledFields: string[];
  computedValues: Record<string, unknown>;
};

type ConditionFn = (actual: unknown, expected: unknown) => boolean;

const equals: ConditionFn = (actual, expected) => {
  return actual === expected;
};

const notEquals: ConditionFn = (actual, expected) => {
  return actual !== expected;
};

const greaterThan: ConditionFn = (actual, expected) => {
  const a = typeof actual === "number" ? actual : Number(actual);
  const e = typeof expected === "number" ? expected : Number(expected);
  if (!Number.isFinite(a) || !Number.isFinite(e)) return false;
  return a > e;
};

const lessThan: ConditionFn = (actual, expected) => {
  const a = typeof actual === "number" ? actual : Number(actual);
  const e = typeof expected === "number" ? expected : Number(expected);
  if (!Number.isFinite(a) || !Number.isFinite(e)) return false;
  return a < e;
};

const contains: ConditionFn = (actual, expected) => {
  if (actual == null) return false;
  const aStr = Array.isArray(actual) ? actual.map(String).join(",") : String(actual);
  const eStr = expected == null ? "" : String(expected);
  return aStr.includes(eStr);
};

const notEmpty: ConditionFn = (actual) => {
  if (Array.isArray(actual)) return actual.length > 0;
  if (typeof actual === "string") return actual.trim().length > 0;
  return actual !== null && actual !== undefined;
};

const conditionResolvers: Record<RuleCondition, ConditionFn> = {
  equals,
  not_equals: notEquals,
  greater_than: greaterThan,
  less_than: lessThan,
  contains,
  not_empty: notEmpty,
};

const evaluateCondition = (rule: FieldRule, formData: Record<string, unknown>): boolean => {
  const actual = formData[rule.conditionFieldId];
  const expected = rule.value;

  const fn = conditionResolvers[rule.condition];
  return fn(actual, expected);
};

const resolveVisibility = (rules: FieldRule[], formData: Record<string, unknown>): string[] => {
  const hidden = new Set<string>();

  for (const rule of rules) {
    const matches = evaluateCondition(rule, formData);
    if (!matches) continue;

    if (rule.action === "hide") hidden.add(rule.targetFieldId);
    if (rule.action === "show") hidden.delete(rule.targetFieldId);
  }

  return Array.from(hidden);
};

const resolveDisabledState = (rules: FieldRule[], formData: Record<string, unknown>): string[] => {
  const disabled = new Set<string>();

  for (const rule of rules) {
    const matches = evaluateCondition(rule, formData);
    if (!matches) continue;

    if (rule.action === "disable") disabled.add(rule.targetFieldId);
    if (rule.action === "enable") disabled.delete(rule.targetFieldId);
  }

  return Array.from(disabled);
};

const resolveComputedValues = (rules: FieldRule[], formData: Record<string, unknown>): Record<string, unknown> => {
  const computed: Record<string, unknown> = {};

  for (const rule of rules) {
    const matches = evaluateCondition(rule, formData);
    if (!matches) continue;

    if (rule.action === "set_value") {
      computed[rule.targetFieldId] = rule.value;
    }
  }

  return computed;
};

/**
 * evaluateRules is the main API.
 */
export function evaluateRules(input: RulesEngineInput): RulesEngineResult {
  const { rules, formData } = input;

  const hiddenFields = resolveVisibility(rules, formData);
  const disabledFields = resolveDisabledState(rules, formData);
  const computedValues = resolveComputedValues(rules, formData);

  return {
    hiddenFields,
    disabledFields,
    computedValues,
  };
}

export const RulesEngine = {
  evaluateRules,
  resolveVisibility,
  resolveDisabledState,
  resolveComputedValues,
};

