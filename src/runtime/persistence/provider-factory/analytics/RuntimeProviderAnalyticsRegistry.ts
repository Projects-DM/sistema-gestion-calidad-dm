import type { ProviderAnalyticsSnapshot } from "./contracts";

/**
 * RuntimeProviderAnalyticsRegistry
 * - in-memory only
 * - deterministic
 * - provider-agnostic
 * - stores analytics snapshots
 */
export class RuntimeProviderAnalyticsRegistry {
  private readonly snapshotsByProviderId = new Map<string, ProviderAnalyticsSnapshot>();

  public setProviderAnalytics(snapshot: ProviderAnalyticsSnapshot): void {
    this.snapshotsByProviderId.set(snapshot.providerId, snapshot);
  }

  public getProviderAnalytics(providerId: string): ProviderAnalyticsSnapshot | null {
    return this.snapshotsByProviderId.get(providerId) ?? null;
  }

  public getAllProviderAnalytics(): ProviderAnalyticsSnapshot[] {
    return [...this.snapshotsByProviderId.values()];
  }

  public clear(): void {
    this.snapshotsByProviderId.clear();
  }
}

