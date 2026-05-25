export type RuntimeEngineType =
  | "BaseChecklist"
  | "BaseMediciones"
  | "BaseWorkflow"
  | "BaseTrazabilidad"
  | "BaseMantenimiento"
  | string;

export type RuntimeFieldType =
  | "boolean"
  | "number"
  | "text"
  | "textarea"
  | "select"
  | "date"
  | "time"
  | "signature"
  | "file_upload"
  | "table"
  | string;

export type RuntimeValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | RuntimeValueObject
  | RuntimeValueArray;

export type RuntimeValueObject = Record<string, unknown>;
export type RuntimeValueArray = Array<RuntimeValue>;

export type FieldOptions = Record<string, unknown> & {
  placeholder?: string;
  min?: number;
  max?: number;
  unit?: string;
  step?: number;
  choices?: string[];
  maxLength?: number;
  // Temperature specific (documented conceptually in architecture docs)
  warning_threshold?: { min?: number; max?: number };
  critical_threshold?: { min?: number; max?: number };
};

export interface FieldContract {
  id: string;
  name: string;
  label: string;
  required: boolean;
  orderIndex: number;
  fieldType: RuntimeFieldType;

  /**
   * Optional visibility rules for Sprint 2.
   * - hidden: if true, the renderer will not mount the field UI.
   * - readonly: if true, the field is rendered but disabled.
   */
  hidden?: boolean;
  readonly?: boolean;

  options: FieldOptions;
}

export interface WorkflowConfigContract {
  requiresApproval: boolean;
  requiresSignature: boolean;
  verifierRole: string;
  allowedRoles: string[];
}

export interface SecurityConfigContract {
  requiresStorage: boolean;
  offlineReady: boolean;
}

export interface AIIntegrationContract {
  compatibleIa: boolean;
  iaTags: string[];
}

export interface FormContract {
  id: string;
  code: string;
  name: string;
  engineType: RuntimeEngineType;
  workflowConfig: WorkflowConfigContract;
  security: SecurityConfigContract;
  aiIntegration: AIIntegrationContract;
  fields: FieldContract[];
}

export interface ValidationErrorMap {
  // fieldId -> message
  [fieldId: string]: string;
}

export interface RuntimeUIState {
  loading: boolean;
  saving: boolean;
  evidenceRequired: boolean;
  activeTab?: string;
  // extensible for future runtime visual states
  [k: string]: unknown;
}

export interface RuntimeContextSnapshot {
  form: FormContract;
  values: Record<string, RuntimeValue>;
  evidences: unknown[]; // placeholder for Sprint 1 (no uploads/offline integration yet)
  validationErrors: ValidationErrorMap;
  uiState: RuntimeUIState;
  disabled: boolean;
}
