/**
 * index.ts — Sprint 24 Form Contract Engine
 *
 * Public API surface for the form validation and blueprint pipeline.
 *
 * Usage (in admin form save flow):
 *
 *   import { AntiBreakingGuard, FormBlueprintGenerator } from "@/runtime/validation/form";
 *
 *   const guardResult = AntiBreakingGuard.enforce(formInput);
 *   const blueprint   = FormBlueprintGenerator.generate(formInput, guardResult.report);
 *
 * Usage (admin UI live inspection):
 *
 *   import { AntiBreakingGuard } from "@/runtime/validation/form";
 *
 *   const report = AntiBreakingGuard.inspect(formInput);
 *   // Display report.errors and report.warnings in UI
 */

// Rules
export {
  ALLOWED_ENGINES,
  ENGINE_REQUIRED_FLAGS,
  VIOLATION_CODES,
  isAllowedEngine,
} from "./formContractRules";
export type { AllowedEngineType, ViolationCode } from "./formContractRules";

// Validator
export { FormContractValidator } from "./FormContractValidator";
export type {
  FormUniversalInput,
  FormValidationReport,
  FormContractViolation,
  ViolationSeverity,
} from "./FormContractValidator";

// Guard
export { AntiBreakingGuard, GuardViolationError } from "./AntiBreakingGuard";
export type { GuardPassResult } from "./AntiBreakingGuard";

// Blueprint generator
export { FormBlueprintGenerator } from "./FormBlueprintGenerator";
export type {
  FormBlueprint,
  FormBlueprintWorkflow,
  FormBlueprintSecurity,
  FormBlueprintAI,
  FormBlueprintMetadata,
} from "./FormBlueprintGenerator";
