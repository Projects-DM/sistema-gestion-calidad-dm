/**
 * FormBlueprintGenerator.ts (Sprint 24)
 *
 * FORM BLUEPRINT GENERATOR — converts a validated form definition into
 * a FORM_BLUEPRINT that the Runtime Engine can consume directly.
 *
 * This is the final step of the Sprint 24 Contract Engine:
 *   FormUniversalInput
 *     → AntiBreakingGuard.enforce()   [validation]
 *     → FormBlueprintGenerator.generate() [compilation]
 *     → FormBlueprint                 [runtime-ready output]
 *
 * The blueprint is what the RuntimeSchemaParser, PersistenceExecutionRouter,
 * and all downstream engines receive. It is the normalized runtime representation.
 *
 * Design rules:
 * - MUST only be called after AntiBreakingGuard.enforce() passes
 * - Does NOT call AntiBreakingGuard internally (caller's responsibility)
 * - Pure synchronous — no async, no DB, no side effects
 */

import type { FormUniversalInput } from "./FormContractValidator";
import type { AllowedEngineType }  from "./formContractRules";
import type { FormValidationReport } from "./FormContractValidator";

// ─── BLUEPRINT CONTRACTS ──────────────────────────────────────────────────────

export interface FormBlueprintWorkflow {
  workflowId:          string;
  requiresApproval:    boolean;
  requiresSignature:   boolean;
  generatesWorkflow:   boolean;
  generatesHistory:    boolean;
}

export interface FormBlueprintSecurity {
  requiresStorage:  boolean;
  requiresEvidence: boolean;
  offlineReady:     boolean;
  roles:            string[];
}

export interface FormBlueprintAI {
  compatible:   boolean;
  tags:         string[];
}

export interface FormBlueprintMetadata {
  modulo:               string;
  submodulo:            string;
  tipo_documental:      string;
  criticidad:           string;
  riesgo_sanitario:     string;
  riesgo_operativo:     string;
  impacto_trazabilidad: string;
  estado:               string;
  frecuencia:           string;
  version:              string;
  responsable:          string;
  verificador:          string;
  componentes:          string[];
  catalogos:            string[];
  tablas_relacionadas:  string[];
  exportacion:          string[];
}

export interface FormBlueprint {
  /** Blueprint schema version for forward compatibility */
  __blueprint_version: "1.0";
  /** Timestamp this blueprint was generated (ISO 8601) */
  generatedAt:         string;

  // ── Identity ────────────────────────────────────────────────────────────
  id:     string;
  codigo: string;
  nombre: string;
  descripcion: string;

  // ── Engine ──────────────────────────────────────────────────────────────
  engine: AllowedEngineType;

  // ── Operational config ──────────────────────────────────────────────────
  workflow: FormBlueprintWorkflow;
  security: FormBlueprintSecurity;
  ai:       FormBlueprintAI;
  metadata: FormBlueprintMetadata;

  // ── Field definitions (passed through as-is for renderer) ───────────────
  fields: unknown[];

  /** Full original input preserved for audit/replay */
  _source: FormUniversalInput;
}

// ─── GENERATOR ────────────────────────────────────────────────────────────────

export class FormBlueprintGenerator {
  /**
   * Generate a FORM_BLUEPRINT from a validated FormUniversalInput.
   *
   * IMPORTANT: Call AntiBreakingGuard.enforce() BEFORE calling this method.
   * This method trusts the input has already been validated and will NOT
   * re-validate. It will throw if critical fields (engine, codigo, nombre)
   * are missing — indicating it was called without prior guard enforcement.
   *
   * @param input   - The form definition (must have passed AntiBreakingGuard)
   * @param report  - Optional validation report (for traceability metadata)
   */
  static generate(input: FormUniversalInput, report?: FormValidationReport): FormBlueprint {
    // Safety assertion — should never be reached in correct usage
    if (!input.motor || !input.codigo || !input.nombre) {
      throw new Error(
        "[FormBlueprintGenerator] generate() called on unvalidated input. " +
        "Always call AntiBreakingGuard.enforce() before generating a blueprint."
      );
    }

    const engine      = input.motor as AllowedEngineType;
    const generatedAt = new Date().toISOString();

    const blueprint: FormBlueprint = {
      __blueprint_version: "1.0",
      generatedAt,

      // ── Identity ─────────────────────────────────────────────────────────
      id:          String(input.id ?? ""),
      codigo:      String(input.codigo),
      nombre:      String(input.nombre),
      descripcion: String(input.descripcion ?? ""),

      // ── Engine ───────────────────────────────────────────────────────────
      engine,

      // ── Workflow ──────────────────────────────────────────────────────────
      workflow: {
        workflowId:        String(input.workflow ?? ""),
        requiresApproval:  Boolean(input.requiere_aprobacion),
        requiresSignature: Boolean(input.requiere_firma),
        generatesWorkflow: Boolean(input.genera_workflow),
        generatesHistory:  Boolean(input.genera_historial),
      },

      // ── Security ──────────────────────────────────────────────────────────
      security: {
        requiresStorage:  Boolean(input.requiere_storage),
        requiresEvidence: Boolean(input.requiere_evidencia),
        offlineReady:     Boolean(input.offline_ready),
        roles:            Array.isArray(input.roles) ? input.roles.map(String) : [],
      },

      // ── AI ────────────────────────────────────────────────────────────────
      ai: {
        compatible: Boolean(input.compatible_ia),
        tags:       Array.isArray(input.ia_tags) ? input.ia_tags.map(String) : [],
      },

      // ── Metadata ──────────────────────────────────────────────────────────
      metadata: {
        modulo:               String(input.modulo               ?? ""),
        submodulo:            String(input.submodulo            ?? ""),
        tipo_documental:      String(input.tipo_documental      ?? ""),
        criticidad:           String(input.criticidad           ?? ""),
        riesgo_sanitario:     String(input.riesgo_sanitario     ?? ""),
        riesgo_operativo:     String(input.riesgo_operativo     ?? ""),
        impacto_trazabilidad: String(input.impacto_trazabilidad ?? ""),
        estado:               String(input.estado               ?? ""),
        frecuencia:           String(input.frecuencia           ?? ""),
        version:              String(input.version              ?? ""),
        responsable:          String(input.responsable          ?? ""),
        verificador:          String(input.verificador          ?? ""),
        componentes:          Array.isArray(input.componentes)         ? input.componentes.map(String)         : [],
        catalogos:            Array.isArray(input.catalogos)           ? input.catalogos.map(String)           : [],
        tablas_relacionadas:  Array.isArray(input.tablas_relacionadas) ? input.tablas_relacionadas.map(String) : [],
        exportacion:          Array.isArray(input.exportacion)         ? input.exportacion.map(String)         : [],
      },

      // ── Fields ────────────────────────────────────────────────────────────
      fields: Array.isArray(input.fields) ? input.fields : [],

      // ── Source preservation ───────────────────────────────────────────────
      _source: input,
    };

    console.info(
      `[FormBlueprintGenerator] Blueprint generated for "${blueprint.codigo}" ` +
      `(engine: ${engine}, fields: ${blueprint.fields.length}, ` +
      `warnings: ${report?.summary.warningCount ?? "N/A"}).`
    );

    return blueprint;
  }
}
