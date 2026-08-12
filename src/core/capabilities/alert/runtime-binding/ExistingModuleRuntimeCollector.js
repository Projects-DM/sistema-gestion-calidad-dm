/**
 * ExistingModuleRuntimeCollector
 *
 * Sprint 185 — Runtime Binding Finalization.
 *
 * Collects ONLY the module's existing operational resources:
 *   - existing Dynamic Forms
 *   - existing Dynamic Records
 *   - existing Document Repository documents
 *   - existing Document Repository categories
 *
 * It NEVER consults DEFAULT_ALERT_RULES, demo alerts, fake runtime,
 * examples or samples. Everything it returns is a real resource that
 * already exists in the module.
 *
 * Collection ONLY. Pure function. No Supabase, no services, no rules.
 */

/**
 * Computes the operational status of a real SGC record using the same
 * real logic the existing Dynamic Records engine applies:
 *   - number out of range (options.min / options.max) → 'critico'
 *   - boolean compliance 'No cumple' / false → 'advertencia'
 *   - otherwise → 'cumple'
 *
 * The status is DERIVED from the real response values and real field
 * options. It is never invented.
 *
 * @param {Object} record Real `sgc_form_responses` row (with `sgc_response_values`).
 * @returns {{ status: string, criticalIssues: string[] }}
 */
export function computeExistingRecordStatus(record) {
  const issues = [];
  let status = 'cumple';

  const values = Array.isArray(record?.sgc_response_values) ? record.sgc_response_values : [];

  for (const val of values) {
    const field = val?.sgc_form_fields;
    if (!field) continue;

    if (field.field_type === 'boolean') {
      const nonCompliant = val.value_boolean === false || val.value_json?.value === 'No cumple';
      if (nonCompliant) {
        status = status === 'critico' ? 'critico' : 'advertencia';
        issues.push(`${field.label} (No Cumple)`);
      }
    }

    if (field.field_type === 'number' && val.value_number !== null && val.value_number !== undefined) {
      const min = field.options?.min;
      const max = field.options?.max;
      const outOfRange =
        (min !== undefined && val.value_number < min) ||
        (max !== undefined && val.value_number > max);
      if (outOfRange) {
        status = 'critico';
        issues.push(`${field.label} (${val.value_number} fuera de rango)`);
      }
    }
  }

  return { status, criticalIssues: issues };
}

/**
 * Normalizes a real form row into the existing-form binding shape.
 *
 * @param {Object} form Real `sgc_forms` row.
 * @returns {Object}
 */
function normalizeForm(form) {
  return Object.freeze({
    id: form?.id ?? null,
    slug: form?.slug ?? form?.name ?? null,
    name: form?.name ?? form?.slug ?? null,
  });
}

/**
 * Normalizes a real record row into the existing-record binding shape,
 * computing its real operational status.
 *
 * @param {Object} record Real `sgc_form_responses` row.
 * @returns {Object}
 */
function normalizeRecord(record) {
  const { status, criticalIssues } = computeExistingRecordStatus(record);
  const form = record?.sgc_forms ?? null;
  return Object.freeze({
    id: record?.id ?? null,
    formId: form?.id ?? record?.form_id ?? null,
    formSlug: form?.slug ?? form?.name ?? null,
    formName: form?.name ?? null,
    status,
    criticalIssues: Object.freeze(criticalIssues),
  });
}

/**
 * Normalizes a real document row into the existing-document binding shape.
 *
 * @param {Object} doc Real `sgc_records` row.
 * @returns {Object}
 */
function normalizeDocument(doc) {
  return Object.freeze({
    id: doc?.id ?? null,
    type: doc?.type ?? null,
    name: doc?.name ?? null,
  });
}

/**
 * Normalizes a real repository category row into the existing-category
 * binding shape.
 *
 * @param {Object} category Real `sgc_document_repository_categories` row.
 * @returns {Object}
 */
function normalizeCategory(category) {
  return Object.freeze({
    id: category?.id ?? null,
    categoryKey: category?.category_key ?? null,
    name: category?.name ?? null,
  });
}

/**
 * Collects the module's existing resources ONLY.
 *
 * @param {Object} input
 * @param {string|null} [input.module] Module slug/name.
 * @param {Array} [input.forms] Real existing forms.
 * @param {Array} [input.records] Real existing records.
 * @param {Array} [input.documents] Real existing documents.
 * @param {Array} [input.categories] Real existing repository categories.
 * @returns {Object} Existing resources snapshot (frozen, never demo data).
 */
export function collectExistingModuleRuntime({ module = null, forms = [], records = [], documents = [], categories = [] } = {}) {
  const existingForms = (Array.isArray(forms) ? forms : []).map(normalizeForm);
  const existingRecords = (Array.isArray(records) ? records : []).map(normalizeRecord);
  const existingDocuments = (Array.isArray(documents) ? documents : []).map(normalizeDocument);
  const existingCategories = (Array.isArray(categories) ? categories : []).map(normalizeCategory);

  return Object.freeze({
    module: module || null,
    forms: Object.freeze(existingForms),
    records: Object.freeze(existingRecords),
    documents: Object.freeze(existingDocuments),
    categories: Object.freeze(existingCategories),
    counts: Object.freeze({
      forms: existingForms.length,
      records: existingRecords.length,
      documents: existingDocuments.length,
      categories: existingCategories.length,
    }),
    empty: existingForms.length === 0 && existingRecords.length === 0 && existingDocuments.length === 0 && existingCategories.length === 0,
  });
}

export default collectExistingModuleRuntime;
