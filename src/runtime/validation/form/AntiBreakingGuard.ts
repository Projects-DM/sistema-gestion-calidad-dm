/**
 * AntiBreakingGuard.ts (Sprint 24)
 *
 * GUARD RUNTIME — Pre-save enforcement layer.
 *
 * This is the anti-regression gate for the entire SGC form system.
 * Any form attempting to enter the system must pass this guard.
 *
 * Behaviour:
 * - BLOCKING violations (errors): throws GuardViolationError — form is REJECTED
 * - NON-BLOCKING violations (warnings): logs visibly — form is ADMITTED with advisories
 *
 * Where to call this:
 *   - Before saving any new form definition (admin creation flow)
 *   - Before updating an existing form definition (admin edit flow)
 *   - NEVER in the runtime response submission path (that path validates field values,
 *     not form definitions)
 *
 * This guard does NOT touch Supabase, the Runtime Engine, or any UI.
 * It is pure synchronous enforcement.
 */

import { FormContractValidator, type FormUniversalInput, type FormValidationReport } from "./FormContractValidator";

// ─── ERROR CONTRACT ───────────────────────────────────────────────────────────

export class GuardViolationError extends Error {
  public readonly report: FormValidationReport;
  public readonly formIdentifier: string;

  constructor(report: FormValidationReport, formIdentifier: string) {
    const summary = report.errors
      .map((e) => `  [${e.code}] ${e.field}: ${e.message}`)
      .join("\n");

    super(
      `[AntiBreakingGuard] Form "${formIdentifier}" REJECTED — ${report.summary.errorCount} blocking violation(s):\n${summary}`
    );

    this.name       = "GuardViolationError";
    this.report     = report;
    this.formIdentifier = formIdentifier;
  }
}

// ─── GUARD RESULT ─────────────────────────────────────────────────────────────

export interface GuardPassResult {
  admitted:       true;
  report:         FormValidationReport;
  formIdentifier: string;
  /** Warnings that should be surfaced to the admin UI */
  advisories:     string[];
}

// ─── ANTI-BREAKING GUARD ──────────────────────────────────────────────────────

export class AntiBreakingGuard {
  /**
   * Run the form definition through the contract validator and enforce policy.
   *
   * @param input - The raw form definition being saved
   * @param formIdentifier - Human-readable identifier for logging (codigo or nombre)
   *
   * @returns GuardPassResult when the form passes (zero blocking violations)
   * @throws GuardViolationError when one or more blocking violations exist
   */
  static enforce(input: FormUniversalInput, formIdentifier?: string): GuardPassResult {
    const identifier = formIdentifier
      ?? (typeof input.codigo === "string" ? input.codigo : null)
      ?? (typeof input.nombre === "string" ? input.nombre : null)
      ?? input.id
      ?? "UNKNOWN_FORM";

    const report = FormContractValidator.validate(input);

    // ── Surface warnings (non-blocking) ─────────────────────────────────────
    if (report.warnings.length > 0) {
      console.warn(
        `[AntiBreakingGuard] Form "${identifier}" admitted with ${report.summary.warningCount} advisory warning(s):`
      );
      for (const w of report.warnings) {
        console.warn(`  [${w.code}] ${w.field}: ${w.message}`);
      }
    }

    // ── Enforce BLOCKING violations ──────────────────────────────────────────
    if (!report.isValid) {
      console.error(
        `[AntiBreakingGuard] Form "${identifier}" BLOCKED — ${report.summary.errorCount} blocking violation(s):`
      );
      for (const e of report.errors) {
        console.error(`  [${e.code}] ${e.field}: ${e.message}`);
      }
      throw new GuardViolationError(report, String(identifier));
    }

    // ── Admitted ─────────────────────────────────────────────────────────────
    console.info(
      `[AntiBreakingGuard] Form "${identifier}" ADMITTED. Engine: ${report.resolvedEngine ?? "N/A"}. ` +
      `Warnings: ${report.summary.warningCount}.`
    );

    return {
      admitted:       true,
      report,
      formIdentifier: String(identifier),
      advisories:     report.warnings.map((w) => `[${w.code}] ${w.field}: ${w.message}`),
    };
  }

  /**
   * Safe inspection mode — runs validation but never throws.
   * Use this for admin UI live feedback (show errors as the admin types).
   *
   * @returns FormValidationReport always
   */
  static inspect(input: FormUniversalInput): FormValidationReport {
    return FormContractValidator.validate(input);
  }
}
