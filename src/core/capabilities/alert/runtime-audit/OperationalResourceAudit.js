/**
 * OperationalResourceAudit
 *
 * Sprint 186 — Operational Resource Integrity Audit (MASTER SSOT LEVEL 4).
 *
 * Builds the Operational Resource Inventory of a module:
 *
 *   { forms: [], records: [], documents: [], categories: [] }
 *
 * Every inventory entry is classified against the integrity policy and
 * flagged as visible (eligible for the Runtime) or rejected (orphan,
 * archived, hidden, detached, inactive, deleted, historical).
 *
 * The audit NEVER consults the Runtime, NEVER queries external tables
 * and NEVER generates Alert Context. Audit ONLY.
 */

import {
  classifyResource,
  RESOURCE_INTEGRITY_STATES,
} from './RuntimeSourceIntegrityPolicy.js';
import { buildResourcePolicyContext } from './ResourceVisibilityValidator.js';

function inventoryEntry(source, resource, classification) {
  return Object.freeze({
    source,
    resourceId: resource?.id ?? null,
    visible: classification.visible,
    state: classification.state,
    reasons: classification.reasons,
  });
}

/**
 * Audits the raw existing resources of a module and builds the
 * Operational Resource Inventory.
 *
 * Forms are audited FIRST. The visible form ids (the Operational Form
 * Set) become the ONLY valid parent references for Dynamic Records —
 * a record whose parent form is not visible is an orphan.
 *
 * @param {Object} input
 * @param {Array} [input.forms] Raw existing forms.
 * @param {Array} [input.records] Raw existing records.
 * @param {Array} [input.documents] Raw existing documents.
 * @param {Object} [input.module] Module context (id, slug, state, visible, is_active).
 * @param {Array} [input.repositories] Module repositories (document visibility).
 * @param {Array} [input.categories] Module repository categories (document visibility).
 * @returns {Object} Audit result with inventory + report.
 */
export function auditOperationalResources({
  forms = [],
  records = [],
  documents = [],
  module = null,
  repositories = [],
  categories = [],
} = {}) {
  const formList = Array.isArray(forms) ? forms : [];
  const recordList = Array.isArray(records) ? records : [];
  const documentList = Array.isArray(documents) ? documents : [];
  const categoryList = Array.isArray(categories) ? categories : [];

  // 1. Forms are audited FIRST → they define the Operational Form Set.
  const context = buildResourcePolicyContext({
    module,
    activeForms: formList,
    repositories,
    categories,
  });

  const formInventory = Object.freeze(
    formList.map((resource) =>
      inventoryEntry('dynamicForms', resource, classifyResource('dynamicForms', resource, context)),
    ),
  );

  // 2. The visible form ids are the ONLY valid parents for records.
  const visibleFormIds = Object.freeze(
    new Set(formInventory.filter((e) => e.visible).map((e) => String(e.resourceId))),
  );
  const recordContext = Object.freeze({
    ...context,
    activeFormIds: visibleFormIds,
  });

  const recordInventory = Object.freeze(
    recordList.map((resource) =>
      inventoryEntry('dynamicRecords', resource, classifyResource('dynamicRecords', resource, recordContext)),
    ),
  );

  const documentInventory = Object.freeze(
    documentList.map((resource) =>
      inventoryEntry('documentRepository', resource, classifyResource('documentRepository', resource, context)),
    ),
  );

  const categoryInventory = Object.freeze(
    categoryList.map((resource) =>
      inventoryEntry('documentCategory', resource, classifyResource('documentCategory', resource, context)),
    ),
  );

  const inventory = Object.freeze({
    forms: formInventory,
    records: recordInventory,
    documents: documentInventory,
    categories: categoryInventory,
  });

  // Inventory entries that are visible (eligibility decision).
  const operationalInventory = Object.freeze({
    forms: Object.freeze(formInventory.filter((e) => e.visible)),
    records: Object.freeze(recordInventory.filter((e) => e.visible)),
    documents: Object.freeze(documentInventory.filter((e) => e.visible)),
    categories: Object.freeze(categoryInventory.filter((e) => e.visible)),
  });

  // The RAW visible resources — the Operational Resource Set the Runtime
  // may consume. Derived from the SAME eligibility decisions as the
  // inventory, so it is always consistent.
  const visibleFormIdsRaw = new Set(formInventory.filter((e) => e.visible).map((e) => String(e.resourceId)));
  const operationalRaw = Object.freeze({
    forms: Object.freeze(formList.filter((f) => visibleFormIdsRaw.has(String(f.id)))),
    records: Object.freeze(recordList.filter((r) => recordInventory.find((e) => e.visible && String(e.resourceId) === String(r.id)))),
    documents: Object.freeze(documentList.filter((d) => documentInventory.find((e) => e.visible && String(e.resourceId) === String(d.id)))),
    categories: Object.freeze(categoryList.filter((c) => categoryInventory.find((e) => e.visible && String(e.resourceId) === String(c.id)))),
  });

  return Object.freeze({
    module: module?.id ?? null,
    moduleSlug: module?.slug ?? null,
    context,
    inventory,
    operational: operationalInventory,
    operationalRaw,
    scanned: Object.freeze({
      forms: formInventory.length,
      records: recordInventory.length,
      documents: documentInventory.length,
      categories: categoryInventory.length,
    }),
  });
}

export const OPERATIONAL_RESOURCE_AUDIT = Object.freeze({
  key: 'operational-resource-audit',
  name: 'Alert Operational Resource Audit',
  inventory: Object.freeze({
    forms: Object.freeze({ type: 'array', description: 'Existing Dynamic Forms inventory' }),
    records: Object.freeze({ type: 'array', description: 'Existing Dynamic Records inventory' }),
    documents: Object.freeze({ type: 'array', description: 'Existing Document Repository inventory' }),
    categories: Object.freeze({ type: 'array', description: 'Existing Document Repository Categories inventory' }),
  }),
  never: Object.freeze([
    'queries the Runtime',
    'generates Alert Context',
    'consults external tables',
    'reads historical data',
  ]),
});

export default OPERATIONAL_RESOURCE_AUDIT;
