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
/**
 * SINGLE-CONFIGURATION contract (DEC-261-05). Extracts the PRIMARY alert
 * metadata from a resource object.
 *
 * This accessor is explicitly single-configuration: for a collection envelope
 * it returns the FIRST element only. It MUST be used exclusively by consumers
 * that define a SINGLE-configuration precondition (e.g. the legacy single
 * `resolveResourceAlertConfiguration` contract). Runtime / Enrollment paths
 * that must transport or evaluate ALL configurations MUST use
 * `extractResourceAlertCollection` / `resolveResourceAlertConfigurations`
 * instead — never this accessor.
 *
 * Accepts both the official `alertConfiguration` field and the raw
 * `alert_config` column. Returns null when absent (never-configured).
 *
 * This is the ONLY place in the codebase allowed to read storage keys.
 *
 * @param {Object} resource Form or Repository resource metadata.
 * @returns {Object|null} Raw single alert configuration metadata.
 */
export function extractResourceAlertMetadata(resource) {
  if (!resource || typeof resource !== 'object') return null;
  const raw = resource.alertConfiguration ?? resource.alert_config ?? null;
  // Single-configuration contract: expose ONLY the primary collection element.
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
 * SINGLE-CONFIGURATION contract (DEC-261-01/05): this API intentionally
 * returns exactly ONE configuration (the primary element when a collection
 * envelope exists). It serves legacy single-configuration consumers ONLY.
 * Operations that require ALL configurations of a resource must use
 * `resolveResourceAlertConfigurations`.
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
 * Sprint 261 — MULTI-ALERT RESOURCE RESOLUTION (DEC-261-01/04/06).
 *
 * Resolves EVERY configuration of a resource as an immutable
 * AlertConfiguration Value Object, each preserving its own identity.
 *
 * Identity rule (DEC-261-06 / §9): an alert is identified by
 * `resource identity + configuration identity`, never by resourceId alone.
 * When a resource carries MULTIPLE configurations (A/B/C), each VO is
 * returned with its own `index` and `alertId`:
 *
 *   configA  →  { index: 0, alertId: "<resourceId>:alert:0" }
 *   configB  →  { index: 1, alertId: "<resourceId>:alert:1" }
 *
 * The single-element case (solo alerta) is backward compatible with
 * `resolveResourceAlertConfiguration` (AC-01/AC-13): one element, no dummy.
 * Never-configured resources resolve to an EMPTY collection (AC-14):
 * the Runtime never fabricates an artificial alert.
 *
 * @param {Object} resource Form or Repository resource metadata.
 * @returns {Object} {
 *   source: 'metadata' | 'default',
 *   resourceId,
 *   configurations: [{ index, alertId, configuration }]
 * }
 */
export function resolveResourceAlertConfigurations(resource) {
  const collectionRes = resolveResourceAlertCollection(resource);
  const resourceId = collectionRes.resourceId;

  const configurations = Object.freeze(
    (collectionRes.collection || []).map((configuration, index) =>
      Object.freeze({
        index,
        alertId: alertConfigIdOf(resourceId, index),
        configuration,
      }),
    ),
  );

  return Object.freeze({
    source: collectionRes.source,
    resourceId,
    configurations,
  });
}

/**
 * Sprint 261 — deterministic configuration identity (O-02/§9).
 *
 * `resourceId` alone is NOT a sufficient alert identity when the resource
 * holds multiple configurations. The configuration identity is:
 *
 *   `<resourceId>:alert:<index>`
 *
 * and its occurrence identity is derived below with the certified
 * occurrenceIdOf(alertId, sequence) in the occurrence domain.
 *
 * @param {string|null} resourceId Resource id (or null for orphan).
 * @param {number} index Configuration index (0-based within the collection).
 * @returns {string} Configuration identity string.
 */
export function alertConfigIdOf(resourceId, index) {
  return `${String(resourceId ?? 'resource')}:alert:${String(index)}`;
}

/**
 * Sprint 263 — RESOLUTION METADATA ENVELOPE (DEC-263-01..13, Strategy A).
 *
 * The canonical AlertConfiguration Value Object keeps its EXACT 9-field
 * contract (`CONFIGURATION_KEYS`) — it is the runtime/occurrence identity
 * surface (isAlertConfiguration, resolveResourceAlertConfigurations,
 * OccurrenceProjection) and MUST NOT be polluted with presentation fields.
 * The PRESENTATION metadata (`name`, `description`, `startDate`, `startTime`,
 * `timezone`) is transported as a per-index SIBLING envelope so the editor
 * reload round-trip survives (Sprint 262 ROOT CAUSE, DEC-263-10).
 *
 * Identity rule (DEC-263-11): every item keeps its OWN alertId derived from
 * `alertConfigIdOf(resourceId, index)` — never global previousMetadata and
 * never `alertConfigurations[0]`.
 *
 * This accessor is read-only and additive. It NEVER changes
 * `resolveResourceAlertConfiguration` / `resolveResourceAlertCollection` and
 * never touches the occurrence domain.
 *
 * @param {Object} resource Form or Repository resource metadata.
 * @returns {Object} { source, resourceId, items: [{ index, alertId, configuration, metadata }] }
 */
export function resolveResourceAlertEnvelope(resource) {
  const resolution = resolveResourceAlertCollection(resource);
  const raw = extractResourceAlertCollection(resource);
  const rawItems = Array.isArray(raw) && raw.length > 0 ? raw : null;

  const items = Object.freeze(
    (resolution.collection || []).map((configuration, index) => {
      const rawItem = rawItems ? rawItems[index] : null;
      return Object.freeze({
        index,
        alertId: alertConfigIdOf(resolution.resourceId, index),
        configuration,
        metadata: Object.freeze(
          pickPresentationMetadata(rawItem && typeof rawItem === 'object' ? rawItem : {}),
        ),
      });
    }),
  );

  return Object.freeze({
    source: resolution.source,
    resourceId: resolution.resourceId,
    items,
  });
}

const PRESENTATION_KEYS = Object.freeze([
  'name',
  'description',
  'startDate',
  'startTime',
  'timezone',
]);

function pickPresentationMetadata(rawItem) {
  const out = {};
  for (const key of PRESENTATION_KEYS) {
    out[key] = typeof rawItem[key] === 'string' ? rawItem[key] : '';
  }
  return out;
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
