import type { ProviderScoreSnapshot } from "./ProviderScoreSnapshot";

/**
 * RuntimeProviderScoreRegistry
 * - in-memory only
 * - deterministic
 * - provider-agnostic
 */
export class RuntimeProviderScoreRegistry {
  private readonly scoresByProviderId = new Map<string, ProviderScoreSnapshot>();

  public setProviderScore(snapshot: ProviderScoreSnapshot): void {
    this.scoresByProviderId.set(snapshot.providerId, snapshot);
  }

  public getProviderScore(providerId: string): ProviderScoreSnapshot | null {
    return this.scoresByProviderId.get(providerId) ?? null;
  }

  public getAllProviderScores(): ProviderScoreSnapshot[] {
    return [...this.scoresByProviderId.values()];
  }

  public clear(): void {
    this.scoresByProviderId.clear();
  }
}

