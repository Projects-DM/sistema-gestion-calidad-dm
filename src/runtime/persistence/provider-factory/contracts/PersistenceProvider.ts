import type { IRuntimePersistenceLayer } from "../../PersistenceBoundary";
import type { PersistenceProviderCapabilities } from "./PersistenceProviderCapabilities";
import type { TransactionKind } from "../../../transaction/contracts/transactionContracts";

export type PersistenceProviderId = string;

/**
 * PersistenceProvider
 * Contract: describes an active persistence provider instance.
 * No implementation details; purely contract-based.
 */
export type PersistenceProvider = {
  /** Stable provider identity used for registration and diagnostics. */
  id: PersistenceProviderId;

  /** Human-friendly provider label for logs/diagnostics. */
  displayName?: string;

  /** Self-described capabilities for capability-based selection. */
  capabilities: PersistenceProviderCapabilities;

  /**
   * Supported transaction kind(s).
   * - Some providers may only support submit-like operations.
   */
  supportedKinds?: TransactionKind[];

  /**
   * The runtime persistence port implemented by the provider.
   * IMPORTANT: Providers must remain database-agnostic from runtime perspective.
   */
  persistence: IRuntimePersistenceLayer;
};

