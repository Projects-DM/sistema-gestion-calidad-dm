import type { RecoveryId } from "./RuntimeRecoveryContracts";
import type { RuntimeRecoverySnapshot } from "./RuntimeRecoveryContracts";

/**
 * RuntimeRecoveryStorageBoundary
 * - Port for in-memory / future physical persistence
 * - Sprint 8 requirement: no physical persistence; only contracts & deterministic behavior
 */
export interface IRuntimeRecoveryStorageBoundary {
  saveSnapshot(snapshot: RuntimeRecoverySnapshot): Promise<void>;
  loadSnapshot(recoveryId: RecoveryId): Promise<RuntimeRecoverySnapshot | null>;
  deleteSnapshot?(recoveryId: RecoveryId): Promise<void>;

  // Queue-related persistence hooks (optional, for future evolution)
  // Keeping it minimal per sprint constraints.
}
