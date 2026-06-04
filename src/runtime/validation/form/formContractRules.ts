/**
 * formContractRules.ts (Sprint 24)
 *
 * Source of truth for all Form Contract validation rules.
 * Derived directly from docs/02-contracts/form_schema_universal_full.md
 *
 * Rules are pure data — no side effects, no persistence, no async.
 */

// ─── ALLOWED ENGINES ─────────────────────────────────────────────────────────

/**
 * Canonical set of runtime engine identifiers.
 * Matches FORM_SCHEMA_UNIVERSAL_FULL § 2. Motores Dinámicos Oficiales.
 * Any form declaring a motor outside this set is BLOCKED.
 */
export const ALLOWED_ENGINES = [
  "BaseChecklist",
  "BaseMediciones",
  "BaseWorkflow",
  "BaseTrazabilidad",
  "BaseMantenimiento",
  "BaseCapacitaciones",
  "BaseDocumental",
] as const;

export type AllowedEngineType = typeof ALLOWED_ENGINES[number];

export function isAllowedEngine(value: unknown): value is AllowedEngineType {
  return typeof value === "string" && (ALLOWED_ENGINES as readonly string[]).includes(value);
}

// ─── ALLOWED ENUMS ───────────────────────────────────────────────────────────

export const ALLOWED_CRITICIDAD = ["alta", "media", "baja"] as const;
export const ALLOWED_RIESGO = ["alto", "medio", "bajo", "ninguno"] as const;
export const ALLOWED_IMPACTO = ["critico", "alto", "medio", "bajo", "ninguno"] as const;
export const ALLOWED_ESTADO = ["activo", "revision", "obsoleto", "borrador"] as const;
export const ALLOWED_FRECUENCIA = [
  "diario",
  "semanal",
  "quincenal",
  "mensual",
  "trimestral",
  "semestral",
  "anual",
  "por_evento",
  "bajo_demanda",
] as const;
export const ALLOWED_TIPO_DOCUMENTAL = [
  "registro",
  "instructivo",
  "procedimiento",
  "formato",
  "plan",
  "protocolo",
  "especificacion",
  "otro",
] as const;

// ─── MANDATORY CORE FIELDS ───────────────────────────────────────────────────

/**
 * Fields that MUST be present and non-empty in every form.
 * Blocking violation if any is missing.
 */
export const MANDATORY_STRING_FIELDS: Array<{ key: string; label: string }> = [
  { key: "codigo",      label: "Código documental"    },
  { key: "nombre",      label: "Nombre operativo"      },
  { key: "descripcion", label: "Descripción funcional" },
  { key: "modulo",      label: "Módulo principal"      },
  { key: "submodulo",   label: "Subproceso/Submodulo"  },
  { key: "responsable", label: "Responsable principal" },
  { key: "version",     label: "Versión documental"    },
  { key: "workflow",    label: "Workflow asociado"     },
];

/**
 * Enum fields with their allowed value sets.
 * Missing or invalid value = blocking violation.
 */
export const MANDATORY_ENUM_FIELDS: Array<{
  key: string;
  label: string;
  allowed: readonly string[];
}> = [
  { key: "criticidad",           label: "Criticidad",            allowed: ALLOWED_CRITICIDAD      },
  { key: "riesgo_sanitario",     label: "Riesgo sanitario",      allowed: ALLOWED_RIESGO          },
  { key: "riesgo_operativo",     label: "Riesgo operativo",      allowed: ALLOWED_RIESGO          },
  { key: "impacto_trazabilidad", label: "Impacto trazabilidad",  allowed: ALLOWED_IMPACTO         },
  { key: "estado",               label: "Estado lifecycle",      allowed: ALLOWED_ESTADO          },
  { key: "frecuencia",           label: "Frecuencia operativa",  allowed: ALLOWED_FRECUENCIA      },
  { key: "tipo_documental",      label: "Tipo documental",       allowed: ALLOWED_TIPO_DOCUMENTAL },
];

/**
 * Boolean flags that must be explicitly set (not undefined/null).
 * Warning if missing; all default to false by contract.
 */
export const BOOLEAN_FLAGS: string[] = [
  "requiere_firma",
  "requiere_aprobacion",
  "requiere_evidencia",
  "requiere_storage",
  "genera_workflow",
  "genera_historial",
  "offline_ready",
  "compatible_ia",
];

// ─── IA METADATA RULES ───────────────────────────────────────────────────────

/**
 * When compatible_ia === true, ia_tags must be present and non-empty.
 * Blocking violation if ia_tags is empty/missing when IA-compatible.
 */
export const IA_TAGS_MIN_LENGTH = 1;

// ─── MOTOR-SPECIFIC RULES ────────────────────────────────────────────────────

/**
 * Per-engine required field keys (from form.componentes or dedicated flags).
 * These map to constraints the runtime cannot execute without.
 */
export const ENGINE_REQUIRED_FLAGS: Record<AllowedEngineType, string[]> = {
  BaseChecklist:      [],                                      // flexible — no extra required flags
  BaseMediciones:     [],                                      // measurement ranges defined per-form
  BaseWorkflow:       ["requiere_aprobacion"],                 // workflow implies approval
  BaseTrazabilidad:   ["genera_historial"],                    // traceability must generate history
  BaseMantenimiento:  ["responsable"],                         // maintenance requires owner
  BaseCapacitaciones: ["requiere_firma"],                      // training requires signatures
  BaseDocumental:     ["requiere_storage", "requiere_aprobacion"], // docs need storage + approval
};

// ─── VIOLATION CODE REGISTRY ─────────────────────────────────────────────────

export const VIOLATION_CODES = {
  MISSING_MANDATORY_FIELD:   "MISSING_MANDATORY_FIELD",
  INVALID_ENGINE:            "INVALID_ENGINE",
  INVALID_ENUM_VALUE:        "INVALID_ENUM_VALUE",
  MISSING_BOOLEAN_FLAG:      "MISSING_BOOLEAN_FLAG",
  IA_TAGS_REQUIRED:          "IA_TAGS_REQUIRED",
  ENGINE_FLAG_VIOLATION:     "ENGINE_FLAG_VIOLATION",
  MISSING_FIELDS_ARRAY:      "MISSING_FIELDS_ARRAY",
  EMPTY_FIELDS_ARRAY:        "EMPTY_FIELDS_ARRAY",
} as const;

export type ViolationCode = typeof VIOLATION_CODES[keyof typeof VIOLATION_CODES];
