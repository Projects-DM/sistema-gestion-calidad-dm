import type { ProviderExecutionAuditStatus } from "./ProviderExecutionAuditStatus";
import type { ProviderExecutionAuditType } from "./ProviderExecutionAuditType";

export type ProviderExecutionAuditRecord = {
  /** Provider identity (provider-agnostic). */
  providerId: string;

  /** Operation semantics (provider-agnostic). */
  operationType: ProviderExecutionAuditType;

  /** Idempotency / traceability identifiers propagated from runtime. */
  correlationId?: string;
  transactionId?: string;
  recoveryId?: string;

  /** Audit time semantics. */
  timestamp: string; // ISO 8601

  /** Execution outcome status. */
  status: ProviderExecutionAuditStatus;

  /** Duration in ms (deterministic numeric, relative to record creation). */
  durationMs?: number;

  /** Extensible metadata for future analytics/AI/monitoring consumers. */
  metadata?: Record<string, unknown>;

  /** Future traceability extension (required by Sprint 13.0). */
  auditId: string;
};

