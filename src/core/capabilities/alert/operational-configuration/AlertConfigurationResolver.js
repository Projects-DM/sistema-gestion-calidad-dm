/**
 * AlertConfigurationResolver
 *
 * Sprint 180 (iteración 2) — Resolves the operational Alert
 * configuration for a module.
 *
 * Sprint 197 — Becomes the OFFICIAL owner of RESOURCE configuration
 * reading. It reads the resource metadata (`alertConfiguration` /
 * `alert_config`), normalizes it and returns a COMPLETE configuration
 * (defaults when the resource was never configured).
 *
 * Sprint 198.R — The returned configuration is a formal IMMUTABLE
 * VALUE OBJECT (AlertConfiguration). The Resolver is the ONLY authorized
 * reader of metadata storage keys; every configuration decision of the
 * Runtime (including whether a resource produces an alert) goes through it.
 *
 * It still returns default values. It does NOT compute due dates, does
 * NOT evaluate dates, does NOT generate alerts.
 *
 * Resolution ONLY. Never executes.
 */

import { buildAlertRuleDescriptor } from './AlertRuleDescriptor.js';
import { normalizeAlertConfiguration } from './MetadataNormalizer.js';
import { createAlertConfiguration } from './AlertConfiguration.js';

/**
 * Extracts the raw alert metadata from a resource object.
 *
 * Accepts both the official `alertConfiguration` field and the raw
 * `alert_config` column. Returns null when absent (never-configured).
 *
 * This is the ONLY place in the codebase allowed to read storage keys.
 *
 * @param {Object} resource Form or Repository resource metadata.
 * @returns {Object|null} Raw alert configuration metadata.
 */
export function extractResourceAlertMetadata(resource) {
  if (!resource || typeof resource !== 'object') return null;
  const raw = resource.alertConfiguration ?? resource.alert_config ?? null;
  // Sprint 229 — collection envelope backward compatible: expose the primary item.
  if (raw && typeof raw === 'object' && Array.isArray(raw.alertConfigurations) && raw.alertConfigurations.length > 0) {
    return raw.alertConfigurations[0];
  }
  return raw;
}

/**
 * Sprint 229 — extracts the RAW alert collection from a resource.
 *
 * Accepts both storage shapes, with full backward compatibility:
 *   - `alertConfigurations` (collection array under the envelope) → the array
 *   - `alertConfiguration` / `alert_config` single → a one-element array
 *   - absent → null (never-configured)
 *
 * @param {Object} resource Form or Repository resource metadata.
 * @returns {Array<Object>|null} Raw alert configurations.
 */
export function extractResourceAlertCollection(resource) {
  if (!resource || typeof resource !== 'object') return null;
  const raw = resource.alertConfiguration ?? resource.alert_config ?? null;
  if (raw && typeof raw === 'object' && Array.isArray(raw.alertConfigurations)) {
    return raw.alertConfigurations;
  }
  return raw && typeof raw === 'object' ? [raw] : null;
}

/**
 * Sprint 229 — resolves the COMPLETE alert COLLECTION of a resource as a list
 * of IMMUTABLE AlertConfiguration Value Objects. Reuses the certified
 * per-item normalizer + Value Object; no new model. When a resource only
 * carried a single configuration, a collection with one element is produced
 * (backward compatible, no mandatory migration).
 *
 * @param {Object} resource Form or Repository resource metadata.
 * @returns {Object} { source, resourceId, collection }
 */
export function resolveResourceAlertCollection(resource) {
  const raw = extractResourceAlertCollection(resource);
  const list = raw && raw.length
    ? raw
    : [null];
  const collection = Object.freeze(list.map((cfg) => createAlertConfiguration(normalizeAlertConfiguration(cfg))));
  return Object.freeze({
    source: raw && raw.length ? 'metadata' : 'default',
    resourceId: resource?.id ?? resource?.slug ?? null,
    collection,
  });
}

/**
 * Resolves the COMPLETE Alert Configuration of a resource as an IMMUTABLE
 * AlertConfiguration Value Object.
 *
 * - `source: 'metadata'`  → the resource carried `alertConfiguration`.
 * - `source: 'default'`   → the resource was never configured; DEFAULT used.
 *
 * @param {Object} resource Form or Repository resource metadata.
 * @returns {Object} { source, resourceId, configuration }
 */
export function resolveResourceAlertConfiguration(resource) {
  const raw = extractResourceAlertMetadata(resource);
  const configuration = createAlertConfiguration(normalizeAlertConfiguration(raw));
  return Object.freeze({
    source: raw && typeof raw === 'object' ? 'metadata' : 'default',
    resourceId: resource?.id ?? resource?.slug ?? null,
    configuration,
  });
}

/**
 * THE sanctioned configuration decision of the Runtime: whether a resource
 * produces an alert. The Runtime never evaluates `enabled` itself — it asks
 * the Resolver (sole owner of configuration).
 *
 * @param {Object} configuration AlertConfiguration Value Object.
 * @returns {boolean}
 */
export function shouldProduceAlert(configuration) {
  return configuration?.enabled !== false;
}

export function resolveOperationalConfiguration(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      resolved: false,
      configured: false,
      alerts: [],
      reasons: ['missing-configuration-context'],
    });
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      capabilityKey: 'alerts',
      resolved: false,
      configured: false,
      alerts: [],
      module: request.moduleId || request.module || null,
      reasons: ['capability-not-assigned'],
    });
  }

  const rules = Array.isArray(request.rules) ? request.rules : [];
  const descriptors = rules.map((r) => buildAlertRuleDescriptor(r));
  const validDescriptors = descriptors.filter((d) => d.valid === true);

  return Object.freeze({
    capabilityKey: 'alerts',
    resolved: true,
    configured: validDescriptors.length > 0,
    module: request.moduleId || request.module || null,
    alerts: validDescriptors.map((d) => ({
      source: d.source,
      priority: d.priority,
      priorityLabel: d.priorityLabel,
      message: d.message,
      active: d.active,
      formId: d.formId,
      documentId: d.documentId,
    })),
    reasons: descriptors.some((d) => d.valid === false)
      ? ['invalid-rules-present']
      : [],
  });
}

export default resolveOperationalConfiguration;
