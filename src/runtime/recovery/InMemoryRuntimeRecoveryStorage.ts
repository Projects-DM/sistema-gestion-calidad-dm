import type { IRuntimeRecoveryStorageBoundary } from "./RuntimeRecoveryStorageBoundary";
import type { RecoveryId, RuntimeRecoverySnapshot } from "./RuntimeRecoveryContracts";

/**
 * InMemoryRuntimeRecoveryStorage
 * - sprint 8: memory-safe abstraction only
 * - no physical persistence
 */
export class InMemoryRuntimeRecoveryStorage implements IRuntimeRecoveryStorageBoundary {
  private store = new Map<RecoveryId, RuntimeRecoverySnapshot>();

  async saveSnapshot(snapshot: RuntimeRecoverySnapshot): Promise<void> {
    this.store.set(snapshot.recoveryId, snapshot);
  }

  async loadSnapshot(recoveryId: RecoveryId): Promise<RuntimeRecoverySnapshot | null> {
    return this.store.get(recoveryId) ?? null;
  }

  async deleteSnapshot(recoveryId: RecoveryId): Promise<void> {
    this.store.delete(recoveryId);
  }
}
