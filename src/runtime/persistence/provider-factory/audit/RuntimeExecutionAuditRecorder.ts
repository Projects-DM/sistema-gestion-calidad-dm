import type { ProviderExecutionAuditRecord } from "./contracts/ProviderExecutionAuditRecord";
import type { ProviderExecutionAuditStatus } from "./contracts/ProviderExecutionAuditStatus";
import type { ProviderExecutionAuditType } from "./contracts/ProviderExecutionAuditType";
import { ProviderExecutionAuditType as _ } from "./contracts/index";
import { RuntimeExecutionAuditRegistry } from "./RuntimeExecutionAuditRegistry";

function nowIso(): string {
  return new Date().toISOString();
}

function durationMs(startedAt: string, finishedAt: string): number {
  const s = Date.parse(startedAt);
  const f = Date.parse(finishedAt);
  if (Number.isNaN(s) || Number.isNaN(f)) return 0;
  return Math.max(0, f - s);
}

function randomAuditId(): string {
  // deterministic subsystem note: uniqueness is best-effort for in-memory observability.
  // Not used for protocol decisions.
  return `audit_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export class RuntimeExecutionAuditRecorder {
  private readonly defaultMetadata: Record<string, unknown>;

  constructor(
    private readonly registry: RuntimeExecutionAuditRegistry,
    params?: { defaultMetadata?: Record<string, unknown> }
  ) {
    this.defaultMetadata = params?.defaultMetadata ?? {};
  }

  public recordExecutionStarted(params: {
    providerId: string;
    operationType: ProviderExecutionAuditType;
    correlationId?: string;
    transactionId?: string;
    recoveryId?: string;
    metadata?: Record<string, unknown>;
  }): { auditId: string; startedAt: string } {
    const startedAt = nowIso();
    const auditId = randomAuditId();

    const record: ProviderExecutionAuditRecord = {
      providerId: params.providerId,
      operationType: params.operationType,
      correlationId: params.correlationId,
      transactionId: params.transactionId,
      recoveryId: params.recoveryId,
      timestamp: startedAt,
      status: "started" satisfies ProviderExecutionAuditStatus,
      metadata: {
        ...this.defaultMetadata,
        ...(params.metadata ?? {}),
      },
      auditId,
    };

    this.registry.store(record);
    return { auditId, startedAt };
  }

  public recordExecutionSucceeded(params: {
    auditId: string;
    startedAt: string;
    providerId: string;
    operationType: ProviderExecutionAuditType;
    correlationId?: string;
    transactionId?: string;
    recoveryId?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const finishedAt = nowIso();

    const record: ProviderExecutionAuditRecord = {
      providerId: params.providerId,
      operationType: params.operationType,
      correlationId: params.correlationId,
      transactionId: params.transactionId,
      recoveryId: params.recoveryId,
      timestamp: finishedAt,
      status: "succeeded" satisfies ProviderExecutionAuditStatus,
      durationMs: durationMs(params.startedAt, finishedAt),
      metadata: {
        ...this.defaultMetadata,
        ...(params.metadata ?? {}),
      },
      auditId: params.auditId,
    };

    this.registry.store(record);
  }

  public recordExecutionFailed(params: {
    auditId: string;
    startedAt: string;
    providerId: string;
    operationType: ProviderExecutionAuditType;
    correlationId?: string;
    transactionId?: string;
    recoveryId?: string;
    error?: { code?: string; message?: string; details?: unknown; retryable?: boolean };
    metadata?: Record<string, unknown>;
  }): void {
    const finishedAt = nowIso();

    const record: ProviderExecutionAuditRecord = {
      providerId: params.providerId,
      operationType: params.operationType,
      correlationId: params.correlationId,
      transactionId: params.transactionId,
      recoveryId: params.recoveryId,
      timestamp: finishedAt,
      status: "failed" satisfies ProviderExecutionAuditStatus,
      durationMs: durationMs(params.startedAt, finishedAt),
      metadata: {
        ...this.defaultMetadata,
        error: params.error,
        ...(params.metadata ?? {}),
      },
      auditId: params.auditId,
    };

    this.registry.store(record);
  }
}

