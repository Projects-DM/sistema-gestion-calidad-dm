/**
 * FormContractValidator.ts (Sprint 24)
 *
 * Validates any form input against FORM_SCHEMA_UNIVERSAL_FULL before persistence.
 * This is the CONTRACT ENFORCER — the system's first line of defence against
 * inconsistent, incomplete, or runtime-incompatible form definitions.
 *
 * Design principles:
 * - Pure synchronous validation (no DB calls, no side effects)
 * - Returns structured FormValidationReport — never throws
 * - Violations are either BLOCKING (error) or NON-BLOCKING (warning)
 * - BLOCKING violations must prevent form from being saved
 * - NON-BLOCKING violations should surface to the admin UI as warnings
 */

import {
  MANDATORY_STRING_FIELDS,
  MANDATORY_ENUM_FIELDS,
  BOOLEAN_FLAGS,
  ENGINE_REQUIRED_FLAGS,
  VIOLATION_CODES,
  isAllowedEngine,
  IA_TAGS_MIN_LENGTH,
  type ViolationCode,
  type AllowedEngineType,
} from "./formContractRules";

// ─── INPUT CONTRACT ───────────────────────────────────────────────────────────

/**
 * Raw form input — mirrors FORM_SCHEMA_UNIVERSAL_FULL.
 * All fields are optional here; the validator determines what is missing.
 */
export interface FormUniversalInput {
  id?: string;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  modulo?: string;
  submodulo?: string;
  tipo_documental?: string;
  criticidad?: string;
  riesgo_sanitario?: string;
  riesgo_operativo?: string;
  impacto_trazabilidad?: string;
  motor?: string;
  workflow?: string;
  tipo_interaccion?: string;
  estado?: string;
  version?: string;
  frecuencia?: string;
  responsable?: string;
  verificador?: string;

  // Boolean flags
  requiere_firma?: boolean;
  requiere_aprobacion?: boolean;
  requiere_evidencia?: boolean;
  requiere_storage?: boolean;
  genera_workflow?: boolean;
  genera_historial?: boolean;
  offline_ready?: boolean;
  compatible_ia?: boolean;

  // Array fields
  ia_tags?: string[];
  componentes?: string[];
  catalogos?: string[];
  tablas_relacionadas?: string[];
  exportacion?: string[];
  roles?: string[];

  // Fields array (runtime fields)
  fields?: unknown[];

  // Allow any additional metadata
  [key: string]: unknown;
}

// ─── OUTPUT CONTRACTS ─────────────────────────────────────────────────────────

export type ViolationSeverity = "error" | "warning";

export interface FormContractViolation {
  code: ViolationCode;
  severity: ViolationSeverity;
  field: string;
  message: string;
  /** Present when the violation is engine-specific */
  engine?: string;
}

export interface FormValidationReport {
  /** True only when zero BLOCKING (error) violations exist */
  isValid: boolean;
  /** True only when zero violations of any kind exist */
  isPerfect: boolean;
  violations: FormContractViolation[];
  errors: FormContractViolation[];
  warnings: FormContractViolation[];
  /** Resolved motor if valid, undefined otherwise */
  resolvedEngine?: AllowedEngineType;
  /** Summary counts */
  summary: {
    errorCount: number;
    warningCount: number;
    totalViolations: number;
  };
}

// ─── VALIDATOR ────────────────────────────────────────────────────────────────

export class FormContractValidator {
  /**
   * Validate a form input against FORM_SCHEMA_UNIVERSAL_FULL.
   *
   * @param input - Raw form input (from DB record, admin UI, or API payload)
   * @returns FormValidationReport — structured, never throws
   */
  static validate(input: FormUniversalInput): FormValidationReport {
    const violations: FormContractViolation[] = [];

    // ── 1. Mandatory string fields ───────────────────────────────────────────
    for (const { key, label } of MANDATORY_STRING_FIELDS) {
      const val = input[key];
      if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
        violations.push({
          code: VIOLATION_CODES.MISSING_MANDATORY_FIELD,
          severity: "error",
          field: key,
          message: `Campo obligatorio ausente: "${label}" (${key}) no puede estar vacío.`,
        });
      }
    }

    // ── 2. Motor validation ──────────────────────────────────────────────────
    let resolvedEngine: AllowedEngineType | undefined;
    const rawMotor = input.motor;

    if (!rawMotor || (typeof rawMotor === "string" && rawMotor.trim() === "")) {
      violations.push({
        code: VIOLATION_CODES.INVALID_ENGINE,
        severity: "error",
        field: "motor",
        message: `Motor no especificado. Se requiere uno de los motores oficiales: BaseChecklist, BaseMediciones, BaseWorkflow, BaseTrazabilidad, BaseMantenimiento, BaseCapacitaciones, BaseDocumental.`,
      });
    } else if (!isAllowedEngine(rawMotor)) {
      violations.push({
        code: VIOLATION_CODES.INVALID_ENGINE,
        severity: "error",
        field: "motor",
        message: `Motor inválido: "${rawMotor}" no está registrado como motor oficial. Motores permitidos: BaseChecklist, BaseMediciones, BaseWorkflow, BaseTrazabilidad, BaseMantenimiento, BaseCapacitaciones, BaseDocumental.`,
      });
    } else {
      resolvedEngine = rawMotor as AllowedEngineType;
    }

    // ── 3. Mandatory enum fields ─────────────────────────────────────────────
    for (const { key, label, allowed } of MANDATORY_ENUM_FIELDS) {
      const val = input[key];
      if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
        violations.push({
          code: VIOLATION_CODES.MISSING_MANDATORY_FIELD,
          severity: "error",
          field: key,
          message: `Campo obligatorio ausente: "${label}" (${key}). Valores permitidos: ${allowed.join(", ")}.`,
        });
      } else if (!allowed.includes(val as any)) {
        violations.push({
          code: VIOLATION_CODES.INVALID_ENUM_VALUE,
          severity: "error",
          field: key,
          message: `Valor inválido para "${label}": "${val}". Valores permitidos: ${allowed.join(", ")}.`,
        });
      }
    }

    // ── 4. Boolean flags (warnings if missing — they default to false) ───────
    for (const flag of BOOLEAN_FLAGS) {
      const val = input[flag];
      if (val === undefined || val === null) {
        violations.push({
          code: VIOLATION_CODES.MISSING_BOOLEAN_FLAG,
          severity: "warning",
          field: flag,
          message: `Flag booleano no declarado: "${flag}" no está presente. Se asumirá false por defecto, pero se recomienda declararlo explícitamente.`,
        });
      }
    }

    // ── 5. IA metadata enforcement ───────────────────────────────────────────
    if (input.compatible_ia === true) {
      const tags = input.ia_tags;
      if (!Array.isArray(tags) || tags.length < IA_TAGS_MIN_LENGTH) {
        violations.push({
          code: VIOLATION_CODES.IA_TAGS_REQUIRED,
          severity: "error",
          field: "ia_tags",
          message: `El formulario declara compatible_ia=true pero no tiene ia_tags definidos. Se requiere al menos ${IA_TAGS_MIN_LENGTH} etiqueta IA para indexación y análisis predictivo.`,
        });
      }
    }

    // ── 6. Motor-specific flag enforcement ───────────────────────────────────
    if (resolvedEngine) {
      const requiredFlags = ENGINE_REQUIRED_FLAGS[resolvedEngine];
      for (const flag of requiredFlags) {
        const val = input[flag];
        if (val !== true) {
          violations.push({
            code: VIOLATION_CODES.ENGINE_FLAG_VIOLATION,
            severity: "error",
            field: flag,
            engine: resolvedEngine,
            message: `El motor "${resolvedEngine}" requiere que "${flag}" esté en true. El runtime no puede ejecutar este formulario sin esta configuración.`,
          });
        }
      }
    }

    // ── 7. Fields array presence ─────────────────────────────────────────────
    if (input.fields === undefined || input.fields === null) {
      violations.push({
        code: VIOLATION_CODES.MISSING_FIELDS_ARRAY,
        severity: "warning",
        field: "fields",
        message: `El formulario no tiene un array "fields" definido. El runtime renderizará un formulario vacío hasta que se configuren los campos.`,
      });
    } else if (Array.isArray(input.fields) && input.fields.length === 0) {
      violations.push({
        code: VIOLATION_CODES.EMPTY_FIELDS_ARRAY,
        severity: "warning",
        field: "fields",
        message: `El formulario tiene "fields: []". El runtime no podrá capturar datos hasta que se definan los campos.`,
      });
    }

    // ── Build report ─────────────────────────────────────────────────────────
    const errors   = violations.filter((v) => v.severity === "error");
    const warnings = violations.filter((v) => v.severity === "warning");

    return {
      isValid:        errors.length === 0,
      isPerfect:      violations.length === 0,
      violations,
      errors,
      warnings,
      resolvedEngine,
      summary: {
        errorCount:      errors.length,
        warningCount:    warnings.length,
        totalViolations: violations.length,
      },
    };
  }
}
