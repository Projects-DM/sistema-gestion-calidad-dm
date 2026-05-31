import type { ProviderSelectionSnapshot } from "./ProviderSelectionSnapshot";

/**
 * RuntimeProviderSelectionRegistry
 * - In-memory only
 * - deterministic
 */
export class RuntimeProviderSelectionRegistry {
  private readonly snapshots: ProviderSelectionSnapshot[] = [];

  public store(snapshot: ProviderSelectionSnapshot): void {
    this.snapshots.push(snapshot);
  }

  public getLatest(): ProviderSelectionSnapshot | null {
    if (!this.snapshots.length) return null;
    return this.snapshots[this.snapshots.length - 1];
  }

  public list(): ProviderSelectionSnapshot[] {
    return [...this.snapshots];
  }
}

