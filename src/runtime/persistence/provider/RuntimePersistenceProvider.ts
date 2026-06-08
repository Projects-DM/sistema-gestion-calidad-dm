import type {
  RuntimePersistenceProvider,
} from "../contracts/runtimePersistenceContracts";

import SupabasePersistenceProvider from "../providers/SupabasePersistenceProvider";


let provider: RuntimePersistenceProvider | null = null;

export function getRuntimePersistenceProvider() {
  if (!provider) {
    provider = SupabasePersistenceProvider;
  }

  return provider;
}

export function setRuntimePersistenceProvider(
  next: RuntimePersistenceProvider
) {
  provider = next;
}

