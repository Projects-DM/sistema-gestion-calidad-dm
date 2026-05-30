import type { ProviderExecutionAuditRecord } from "./contracts/ProviderExecutionAuditRecord";

/**
 * RuntimeExecutionAuditRegistry
 * - deterministic
 * - in-memory only
 * - no database
 * - runtime-first (pure TS)
 */
export class RuntimeExecutionAuditRegistry {
  private readonly recordsByProviderId = new Map<string, ProviderExecutionAuditRecord[]>();
  private readonly recordsByCorrelationId = new Map<string, ProviderExecutionAuditRecord[]>();
  private readonly recordsByTransactionId = new Map<string, ProviderExecutionAuditRecord[]>();

  /** Store record and update all deterministic indices. */
  public store(record: ProviderExecutionAuditRecord): void {
    const providerId = record.providerId;

    const byProvider = this.recordsByProviderId.get(providerId) ?? [];
    byProvider.push(record);
    this.recordsByProviderId.set(providerId, byProvider);

    if (record.correlationId) {
      const list = this.recordsByCorrelationId.get(record.correlationId) ?? [];
      list.push(record);
      this.recordsByCorrelationId.set(record.correlationId, list);
    }

    if (record.transactionId) {
      const list = this.recordsByTransactionId.get(record.transactionId) ?? [];
      list.push(record);
      this.recordsByTransactionId.set(record.transactionId, list);
    }
  }

  public getByProvider(params: { providerId: string }): ProviderExecutionAuditRecord[] {
    return [...(this.recordsByProviderId.get(params.providerId) ?? [])];
  }

  public getByCorrelationId(params: { correlationId: string }): ProviderExecutionAuditRecord[] {
    return [...(this.recordsByCorrelationId.get(params.correlationId) ?? [])];
  }

  public getByTransactionId(params: { transactionId: string }): ProviderExecutionAuditRecord[] {
    return [...(this.recordsByTransactionId.get(params.transactionId) ?? [])];
  }
}

