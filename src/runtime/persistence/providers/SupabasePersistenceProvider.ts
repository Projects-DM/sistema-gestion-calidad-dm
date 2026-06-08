import { dynamicService } from "../../../services/dynamicService";

import type {
  RuntimePersistenceProvider,
  RuntimePersistencePayload,
  RuntimePersistenceResult,
} from "../contracts/runtimePersistenceContracts";

export const SupabasePersistenceProvider: RuntimePersistenceProvider = {
  async save(
    payload: RuntimePersistencePayload
  ): Promise<RuntimePersistenceResult> {
    const response =
      await dynamicService.submitFormResponse(
        payload.formId,
        payload.userId,
        payload.values,
        [],
        {}
      );

    return {
      success: Boolean(response),
      responseId: (response as any)?.id,
    };
  },
};

export default SupabasePersistenceProvider;


