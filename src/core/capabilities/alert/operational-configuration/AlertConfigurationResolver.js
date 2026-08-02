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
 * It still returns default values. It does NOT compute due dates, does
 * NOT evaluate dates, does NOT generate alerts.
 *
 * Resolution ONLY. Never executes.
 */

import { buildAlertRuleDescriptor } from './AlertRuleDescriptor.js';
import { normalizeAlertConfiguration } from './MetadataNormalizer.js';

/**
 * Extracts the raw alert metadata from a resource object.
 *
 * Accepts both the official `alertConfiguration` field and the raw
 * `alert_config` column. Returns null when absent (never-configured).
 *
 * @param {Object} resource Form or Repository resource metadata.
 * @returns {Object|null} Raw alert configuration metadata.
 */
export function extractResourceAlertMetadata(resource) {
  if (!resource || typeof resource !== 'object') return null;
  return resource.alertConfiguration ?? resource.alert_config ?? null;
}

/**
 * Resolves the COMPLETE Alert Configuration of a resource.
 *
 * - `source: 'metadata'`  → the resource carried `alertConfiguration`.
 * - `source: 'default'`   → the resource was never configured; DEFAULT used.
 *
 * @param {Object} resource Form or Repository resource metadata.
 * @returns {Object} { source, resourceId, configuration }
 */
export function resolveResourceAlertConfiguration(resource) {
  const raw = extractResourceAlertMetadata(resource);
  const configuration = normalizeAlertConfiguration(raw);
  return Object.freeze({
    source: raw && typeof raw === 'object' ? 'metadata' : 'default',
    resourceId: resource?.id ?? resource?.slug ?? null,
    configuration,
  });
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
