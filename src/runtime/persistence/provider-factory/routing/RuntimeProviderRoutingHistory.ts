import type { ProviderRoutingContext } from "./ProviderRoutingContext";

type ProviderHistory = {
  successRate: number;
  avgLatency: number;
  failureCount: number;
  lastUsed: number | null;
};

/**
 * RuntimeProviderRoutingHistory
 * - In-memory only (deterministic)
 * - Sprint 19 provides read-only history shape for routing score computation
 */
export class RuntimeProviderRoutingHistory {
  private readonly history = new Map<string, ProviderHistory>();

  public getProviderHistory(providerId: string): ProviderHistory {
    const existing = this.history.get(providerId);
    if (existing) return { ...existing };

    // default neutral history
    return {
      successRate: 0,
      avgLatency: 0,
      failureCount: 0,
      lastUsed: null,
    };
  }

  /** Optional helper for future wiring; not required by Sprint 19. */
  public trackUsage(providerId: string, _context: ProviderRoutingContext, result: { ok: boolean; latencyMs: number }): void {
    const prev = this.getProviderHistory(providerId);
    const nextSuccessRate = prev.successRate + (result.ok ? 1 : 0);

    this.history.set(providerId, {
      successRate: nextSuccessRate,
      avgLatency: prev.avgLatency === 0 ? result.latencyMs : (prev.avgLatency + result.latencyMs) / 2,
      failureCount: prev.failureCount + (result.ok ? 0 : 1),
      lastUsed: Date.now(),
    });
  }

  public listProviders(providerIds: string[]): string[] {
    return [...providerIds];
  }
}

