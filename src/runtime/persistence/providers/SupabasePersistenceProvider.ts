import type {
  RuntimePersistenceProvider,
  RuntimePersistencePayload,
  RuntimePersistenceResult,
} from "../contracts/runtimePersistenceContracts";

export const SupabasePersistenceProvider: RuntimePersistenceProvider = {
  async save(
    payload: RuntimePersistencePayload
  ): Promise<RuntimePersistenceResult> {
    console.debug("[SupabasePersistenceProvider]", payload);

    // TODO (SPRINT 50): persist using dynamicService / Supabase calls.
    // This sprint is diagnostics-only.
    return {
      success: false,
    };
  },
};

export default SupabasePersistenceProvider;

