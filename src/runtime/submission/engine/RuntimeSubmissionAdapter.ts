import type {
  RuntimeSubmissionAdapter,
  RuntimeSubmissionPayload,
  RuntimeSubmissionResult,
} from "../contracts/RuntimeSubmissionContracts";

import { getRuntimePersistenceProvider } from "../../persistence/provider/RuntimePersistenceProvider";

export const RuntimeSubmissionAdapterImpl: RuntimeSubmissionAdapter = {
  async submit(
    payload: RuntimeSubmissionPayload
  ): Promise<RuntimeSubmissionResult> {
    const provider = getRuntimePersistenceProvider();

    return await provider.save({
      formId: payload.formId,
      userId: payload.userId,
      values: payload.values,
    });
  },
};

export default RuntimeSubmissionAdapterImpl;


