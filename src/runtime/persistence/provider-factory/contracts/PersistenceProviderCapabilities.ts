export type PersistenceProviderCapabilities = {
  /** Provider can persist/restore durable state while offline. */
  supportsOffline?: boolean;

  /** Provider supports recovery lineage snapshots storage (draft/recovery snapshots). */
  supportsRecovery?: boolean;

  /** Provider supports persistence of draft snapshots. */
  supportsSnapshots?: boolean;

  /** Provider enables replay-safe operations (idempotency/dedup semantics). */
  supportsReplay?: boolean;

  /** Provider supports transactional units of work (all-or-nothing conceptual). */
  supportsTransactions?: boolean;

  /** Provider supports audit/analytics correlation (optional; may be derived from transactional support). */
  supportsAnalytics?: boolean;

  /** Future extensibility point for capability additions without breaking contracts. */
  [capability: string]: boolean | undefined;
};

