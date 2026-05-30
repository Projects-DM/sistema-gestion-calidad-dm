import { SupabaseRuntimeAdapter } from "../../adapters/SupabaseRuntimeAdapter";
import type {
  PersistenceProvider,
  PersistenceProviderId,
} from "../contracts/PersistenceProvider";
import type { PersistenceProviderCapabilities } from "../contracts/PersistenceProviderCapabilities";
import type { TransactionKind } from "../../../transaction/contracts/transactionContracts";


/**
 * SupabasePersistenceProvider
 * Provider contract wrapper around the existing Supabase runtime adapter.
 *
 * IMPORTANT:
 * - No modifications to SupabaseRuntimeAdapter
 * - Provider-factory wiring only
 */
export class SupabasePersistenceProvider implements PersistenceProvider {
  public readonly id: PersistenceProviderId = "supabase";
  public readonly displayName = "Supabase Persistence Provider";

  public readonly capabilities: PersistenceProviderCapabilities = {
    supportsOffline: false,
    supportsRecovery: true,
    supportsSnapshots: true,
    supportsReplay: false,
    supportsTransactions: true,
    supportsAnalytics: false,
  };

  public readonly supportedKinds: TransactionKind[] = ["submit", "verify", "workflow", "evidence_registration"];

  public readonly persistence = new SupabaseRuntimeAdapter();
}

