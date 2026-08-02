/**
 * RuntimeBindingResolver
 *
 * Sprint 185 — Runtime Binding Finalization.
 *
 * Resolves ONLY existing module information:
 *
 *   Module → Forms existentes → Records existentes → Documents existentes
 *            → Runtime Context
 *
 * Never creates information. Every alert context it returns references a
 * real existing resource of the module.
 *
 * Resolution ONLY. Never executes, never navigates.
 */

import { collectExistingModuleRuntime } from './ExistingModuleRuntimeCollector.js';
import { resolveExistingOperationalSources } from './ExistingOperationalSourceResolver.js';
import { buildRuntimeBindingDescriptor } from './RuntimeBindingDescriptor.js';
import { validateRuntimeBinding } from './RuntimeBindingValidator.js';

function formConditionFor(form) {
  return Object.freeze({
    field: 'form',
    operator: 'exists',
    value: form.slug ?? form.name ?? null,
  });
}

function recordConditionFor(record) {
  return Object.freeze({
    field: record.formSlug ?? 'record',
    operator: 'status',
    value: record.status ?? 'cumple',
  });
}

function documentConditionFor(document) {
  return Object.freeze({
    field: 'document',
    operator: 'exists',
    value: document.name ?? document.type ?? null,
  });
}

/**
 * Builds the Runtime Context (bound alerts) ONLY from existing resources.
 *
 * An alert context is produced ONLY when the resource exists:
 *   - existing form → bound form alert
 *   - existing non-compliant record → bound record alert
 *   - existing document → bound document alert
 *
 * No priority/message/status is invented here — every field derives from
 * the real resource data. (Compliance derives from real record values.)
 *
 * @param {Object} existing Existing module resources snapshot.
 * @returns {Array} Bound alert contexts.
 */
export function buildBoundAlertContexts(existing) {
  const contexts = [];

  for (const form of existing?.forms ?? []) {
    contexts.push(Object.freeze({
      source: 'dynamicForms',
      resource: form.slug ?? form.name ?? 'dynamic-form',
      resourceId: form.id,
      resourceType: 'dynamicForm',
      condition: formConditionFor(form),
    }));
  }

  for (const record of existing?.records ?? []) {
    // The collector already derives the real operational status from the
    // real response values. ONLY non-compliant existing records produce
    // an alert context.
    if (record.status === 'cumple') continue;
    contexts.push(Object.freeze({
      source: 'dynamicRecords',
      resource: record.formSlug ?? 'dynamic-record',
      resourceId: record.id,
      resourceType: 'dynamicRecord',
      condition: recordConditionFor(record),
    }));
  }

  for (const document of existing?.documents ?? []) {
    contexts.push(Object.freeze({
      source: 'documentRepository',
      resource: document.name ?? document.type ?? 'document',
      resourceId: document.id,
      resourceType: 'document',
      condition: documentConditionFor(document),
    }));
  }

  return Object.freeze(contexts);
}

/**
 * Resolves the Runtime Binding for a module.
 *
 * @param {Object} request
 * @param {Object} [request.existing] Raw existing module resources
 *   ({ forms, records, documents }) collected by the UI layer.
 * @returns {Object}
 */
export function resolveRuntimeBinding(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      resolved: false,
      available: false,
      runtimeEnabled: false,
      reasons: ['missing-binding-context'],
    });
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      capabilityKey: 'alerts',
      resolved: false,
      available: false,
      runtimeEnabled: false,
      module: request.moduleId || request.module || null,
      reasons: ['capability-not-assigned'],
    });
  }

  const rawExisting = request.existing || {};
  const existing = collectExistingModuleRuntime({
    module: request.moduleId || request.module || null,
    forms: rawExisting.forms,
    records: rawExisting.records,
    documents: rawExisting.documents,
  });

  const sourceResolution = resolveExistingOperationalSources(existing);
  const descriptor = buildRuntimeBindingDescriptor(existing);
  const validation = validateRuntimeBinding(existing, descriptor);
  const boundAlerts = buildBoundAlertContexts(existing);

  return Object.freeze({
    capabilityKey: 'alerts',
    resolved: true,
    available: true,
    runtimeEnabled: true,
    runtimeBound: descriptor.runtimeBound,
    executionEnabled: false,
    module: request.moduleId || request.module || null,
    existing,
    sources: sourceResolution.sources,
    counts: sourceResolution.counts,
    anySourceExists: sourceResolution.anyExists,
    descriptor,
    validation,
    boundAlerts,
    reasons: [],
  });
}

export default resolveRuntimeBinding;
