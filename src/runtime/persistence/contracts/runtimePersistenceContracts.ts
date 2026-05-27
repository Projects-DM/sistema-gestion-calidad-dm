import type {
  CorrelationId,
  TransactionDraftSnapshot,
  TransactionErrorContract,
  TransactionErrorCode,
  TransactionId,
} from "../../transaction/contracts/transactionContracts";

export type RuntimePersistenceError = TransactionErrorContract;

export type RuntimePersistenceResult = {
  success: boolean;
  retryable: boolean;
  transactionId: TransactionId;
  responseId?: string;

  error?: RuntimePersistenceError;
};

export type PersistenceRetryDecision = {
  retryable: boolean;
  classification?: "retryable" | "non_retryable";
  errorCode?: TransactionErrorCode | string;
};

export type DraftRecord = TransactionDraftSnapshot & {
  correlationId?: CorrelationId;
  transactionId?: TransactionId;
};

export type AdapterFailure = {
  error: unknown;
  errorContract?: TransactionErrorContract;
};
