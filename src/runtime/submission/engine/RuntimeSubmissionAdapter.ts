import type {
  RuntimeSubmissionAdapter,
  RuntimeSubmissionPayload,
  RuntimeSubmissionResult,
} from "../contracts/RuntimeSubmissionContracts";

export const RuntimeSubmissionAdapterImpl: RuntimeSubmissionAdapter = {
  async submit(
    payload: RuntimeSubmissionPayload
  ): Promise<RuntimeSubmissionResult> {
    console.debug("[RuntimeSubmissionAdapter]", payload);

    return {
      success: false,
    };
  },
};

export default RuntimeSubmissionAdapterImpl;

