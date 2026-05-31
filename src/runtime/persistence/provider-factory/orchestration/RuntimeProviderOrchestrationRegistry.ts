import type { ProviderOrchestrationResult } from "./ProviderOrchestrationResult";

/**
 * RuntimeProviderOrchestrationRegistry
 * - In-memory snapshots
 * - deterministic
 * - provider-agnostic
 */
export class RuntimeProviderOrchestrationRegistry {
  private readonly items: ProviderOrchestrationResult[] = [];

  public store(result: ProviderOrchestrationResult): void {
    this.items.push(result);
  }

  public getLatest(): ProviderOrchestrationResult | null {
    if (!this.items.length) return null;
    return this.items[this.items.length - 1];
  }

  public list(): ProviderOrchestrationResult[] {
    return [...this.items];
  }
}

