import type { RuntimeValue } from "../../types/runtimeContracts";

export type TransactionKind = "submit" | "verify" | "workflow" | "evidence_registration";

export type RetryableClassification = "retryable" | "non_retryable";

export type TransactionErrorCode =
  | "CONNECTION_TIMEOUT"
  | "NETWORK_UNAVAILABLE"
  | "DB_UNAVAILABLE"
  | "CONTRACT_VIOLATION"
  | "IDEMPOTENCY_CONFLICT"
  | "CORRELATION_IMPOSSIBLE"
  | "UNKNOWN";

export interface TransactionErrorContract {
  code: TransactionErrorCode | string;
  message: string;
  retryable: boolean;
  retryableClassification?: RetryableClassification;
  details?: Record<string, unknown>;
}

export type TransactionId = string;
export type CorrelationId = string;
export type ClientRequestId = string;
export type DraftSnapshotId = string;

/**
 * Idempotency / correlation strategy is documented in:
 * - docs/database/runtime_api_contracts.md
 * - docs/04-infrastructure/persistence_architecture.md (conceptual)
 *
 * Implementation details (hash/uuid generation) are delegated to the id strategy
 * module in this Sprint.
 */
export interface TransactionMetadata {
  transactionId: TransactionId;
  correlationId: CorrelationId;

  // Idempotency keys (offline-first ready, no persistence yet)
  clientRequestId?: ClientRequestId;
  draftSnapshotId?: DraftSnapshotId;

  // Correlation invariants for audit-ready persistence later
  responseId?: string;
  actorId?: string;
}

export interface TransactionValueEavItem {
  fieldId: string;
  fieldType: string;
  value:
    | { kind: "text"; valueText: string }
    | { kind: "number"; valueNumeric: number }
    | { kind: "boolean"; valueBoolean: boolean }
    | { kind: "json"; valueJson: unknown }
    | { kind: "null"; valueNull: null };
}

export interface TransactionEvidenceItem {
  fieldId?: string;
  storagePath: string; // correlation key for SAGA compensation later
  publicUrl?: string;
  fileType?: string;
  fileSizeBytes?: number;
  metadata?: Record<string, unknown>;
}

export interface TransactionPayloadBase {
  kind: TransactionKind;
  formId: string;

  userId: string;

  metadata: TransactionMetadata;
  capturedAt: string;

  // Enterprise: values must be a deterministic EAV mapping (payload builder responsibility)
  values?: TransactionValueEavItem[];

  evidences?: TransactionEvidenceItem[];

  // For future: workflow-verification payloads
  [k: string]: unknown;
}

export interface SubmitTransactionPayload extends TransactionPayloadBase {
  kind: "submit";
  values: TransactionValueEavItem[];
  evidences?: TransactionEvidenceItem[];
}

export interface TransactionDraftSnapshot {
  draftSnapshotId: DraftSnapshotId;
  transactionId?: TransactionId;
  clientRequestId?: ClientRequestId;
  capturedAt: string;

  // Runtime-side: this draft snapshot is used to rebuild payload on retries
  values: Record<string, RuntimeValue>;
  evidences: TransactionEvidenceItem[]; // no real upload yet, but we store correlation items
  workflowContext?: Record<string, unknown>;
  formId: string;
  userId: string;

  // integrity hash placeholder (Sprint 5: store-only; validation later)
  integrity?: {
    algorithm: "sha256";
    digest: string;
  };
}

export interface TransactionResult {
  success: boolean;
  retryable: boolean;
  transactionId: TransactionId;

  // Future: responseId will be returned by persistence layer
  responseId?: string;

  error?: TransactionErrorContract;
}

export type SaveLifecycleStage =
  | "draft_snapshot_created"
  | "payload_built"
  | "persistence_started"
  | "persistence_succeeded"
  | "persistence_failed"
  | "compensation_enqueued"
  | "completed";

export interface SaveLifecycleEvent {
  stage: SaveLifecycleStage;
  at: string;
  transactionId: TransactionId;
  correlationId: CorrelationId;
  details?: Record<string, unknown>;
}
