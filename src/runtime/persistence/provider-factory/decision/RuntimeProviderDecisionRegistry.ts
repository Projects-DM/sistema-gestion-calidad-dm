import type { ProviderDecisionSnapshot } from "./contracts";

/**
 * RuntimeProviderDecisionRegistry
 * - in-memory only
 * - deterministic
 * - provider-agnostic
 */
export class RuntimeProviderDecisionRegistry {
  private readonly decisionsByProviderId = new Map<string, ProviderDecisionSnapshot[]>();

  store(snapshot: ProviderDecisionSnapshot): void {
    const providerId = snapshot.providerId;
    const list = this.decisionsByProviderId.get(providerId) ?? [];
    list.push(snapshot);
    this.decisionsByProviderId.set(providerId, list);
  }

  get(providerId: string): ProviderDecisionSnapshot[] {
    return [...(this.decisionsByProviderId.get(providerId) ?? [])];
  }

  list(): ProviderDecisionSnapshot[] {
    const all: ProviderDecisionSnapshot[] = [];
    for (const snapshots of this.decisionsByProviderId.values()) {
      all.push(...snapshots);
    }
    return all;
  }

  /** Latest decision snapshot for any provider (best-effort deterministic in-memory). */
  getLatest(): ProviderDecisionSnapshot | null {
    let latest: ProviderDecisionSnapshot | null = null;
    for (const snapshots of this.decisionsByProviderId.values()) {
      const last = snapshots[snapshots.length - 1];
      if (!last) continue;
      if (!latest) {
        latest = last;
        continue;
      }
      if (Date.parse(last.decisionTimestamp) > Date.parse(latest.decisionTimestamp)) {
        latest = last;
      }
    }
    return latest;
  }
}

