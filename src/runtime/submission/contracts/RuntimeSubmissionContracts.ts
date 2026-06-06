export type RuntimeSubmissionPayload = {
  formId: string;
  userId: string;
  values: Record<string, unknown>;
};

export type RuntimeSubmissionResult = {
  success: boolean;
  responseId?: string;
};

export type RuntimeSubmissionAdapter = {
  submit: (
    payload: RuntimeSubmissionPayload
  ) => Promise<RuntimeSubmissionResult>;
};

