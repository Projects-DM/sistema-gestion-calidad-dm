/**
 * LayoutContracts (Sprint 26.1)
 * Contracts only — Layout engine foundation (no runtime orchestration).
 */

/**
 * LayoutDefinition represents a full form layout.
 */
export type LayoutDefinition = {
  id: string;
  name: string;
  sections: SectionDefinition[];
};

/**
 * SectionDefinition represents a visual section of the form.
 */
export type SectionDefinition = {
  id: string;
  title: string;
  description?: string;
  columns: ColumnDefinition[];
};

/**
 * ColumnDefinition represents a visual column.
 */
export type ColumnDefinition = {
  id: string;
  width: number;
  fields: FieldReference[];
};

/**
 * FieldReference references an existing field by id.
 */
export type FieldReference = {
  fieldId: string;
};

