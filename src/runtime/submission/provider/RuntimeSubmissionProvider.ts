import type {
  RuntimeSubmissionAdapter,
} from "../contracts/RuntimeSubmissionContracts";


import RuntimeSubmissionAdapterImpl from "../engine/RuntimeSubmissionAdapter";

let runtimeSubmissionAdapter:
  RuntimeSubmissionAdapter | null = null;

export function getRuntimeSubmissionAdapter() {
  if (!runtimeSubmissionAdapter) {
    runtimeSubmissionAdapter =
      RuntimeSubmissionAdapterImpl;
  }

  return runtimeSubmissionAdapter;
}

export function setRuntimeSubmissionAdapter(
  adapter: RuntimeSubmissionAdapter
) {
  runtimeSubmissionAdapter = adapter;
}

