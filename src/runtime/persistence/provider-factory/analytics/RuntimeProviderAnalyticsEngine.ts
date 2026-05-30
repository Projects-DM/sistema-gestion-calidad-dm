import type { ProviderAnalyticsSnapshot, ProviderAnalyticsSummary } from "./contracts";
import { RuntimeExecutionAuditRegistry } from "../audit/RuntimeExecutionAuditRegistry";
import { RuntimeProviderAnalyticsRegistry } from "./RuntimeProviderAnalyticsRegistry";

function ratio(n: number, d: number): number {
  if (d <= 0) return 0;
  return n / d;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export class RuntimeProviderAnalyticsEngine {
  constructor(
    private readonly auditRegistry: RuntimeExecutionAuditRegistry,
    private readonly analyticsRegistry: RuntimeProviderAnalyticsRegistry
  ) {}

  public refreshAnalytics(): void {
    // Compute snapshots from current audit registry state.
    // Deterministic: iterates provider snapshots derived from audit registry by scanning known providers.
    // Since RuntimeExecutionAuditRegistry doesn't expose provider list, we recompute based on correlation/transaction
    // indices not required; we rely on registry content via getByProvider cannot list keys.
    // Therefore we only compute analytics when asked per provider.
  }

  public getProviderAnalytics(providerId: string): ProviderAnalyticsSnapshot {
    const records = this.auditRegistry.getByProvider({ providerId });

    const totalExecutions = records.length;
    const successfulExecutions = records.filter((r) => r.status === "succeeded").length;
    const failedExecutions = records.filter((r) => r.status === "failed").length;

    const successRate = ratio(successfulExecutions, totalExecutions);
    const failureRate = ratio(failedExecutions, totalExecutions);

    const durations = records
      .map((r) => r.durationMs)
      .filter((d): d is number => typeof d === "number");

    const averageDurationMs = avg(durations);

    const lastExecutionAt = this.getLastExecutionAt(records);

    const snapshot: ProviderAnalyticsSnapshot = {
      providerId,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      failureRate,
      averageDurationMs,
      lastExecutionAt,
    };

    this.analyticsRegistry.setProviderAnalytics(snapshot);
    return snapshot;
  }

  public getAllProviderAnalytics(): ProviderAnalyticsSnapshot[] {
    // Without a provider list method on RuntimeExecutionAuditRegistry,
    // we return whatever has been computed/stored in the registry.
    return this.analyticsRegistry.getAllProviderAnalytics();
  }

  private getLastExecutionAt(records: Array<{ timestamp: string }>): string | undefined {
    if (records.length === 0) return undefined;
    // deterministic: max by timestamp string (ISO sortable)
    return records
      .map((r) => r.timestamp)
      .sort()
      .at(-1);
  }
}

