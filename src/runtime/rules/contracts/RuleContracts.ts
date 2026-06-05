/**
 * RuleContracts (Sprint 28)
 * Contracts only — runtime pure rules definitions.
 */

export type RuleCondition =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "contains"
  | "not_empty";

export type RuleAction = "show" | "hide" | "enable" | "disable" | "set_value";

export type FieldRule = {
  id: string;
  targetFieldId: string;
  conditionFieldId: string;
  condition: RuleCondition;
  value: unknown;
  action: RuleAction;
};

