/**
 * AlertConfigurationMetadata
 *
 * Sprint 197 — THE SSOT CONTRACT of the Alert Configuration model.
 *
 * This is the ONLY permitted configuration model of the Alert Capability.
 * It is metadata-only (no code logic): every parameter below is read from
 * the RESOURCE metadata (form / repository), normalized by the Metadata
 * Normalizer and delivered by the AlertConfigurationResolver.
 *
 * Nothing here computes dates, risk or alerts. Contract ONLY. Never executes.
 */

import { ALERT_PRIORITY_LEVELS } from './AlertPriorityPolicy.js';

export const ALERT_CONFIGURATION_VERSION = 1;

export const PERIODICITY_UNITS = Object.freeze([
  'hours',
  'days',
  'weeks',
  'months',
  'years',
  'once',
]);

export const EXPIRATION_POLICIES = Object.freeze([
  'none',
  'recurring',
  'fixed',
]);

export const RISK_MODELS = Object.freeze([
  'relative',
  'absolute',
  'percentage',
]);

export const REPEAT_POLICIES = Object.freeze([
  'repeat',
  'once',
]);

export const NOTIFICATION_CHANNELS = Object.freeze([
  'email',
  'in-app',
  'none',
]);

/**
 * The official Alert Configuration metadata model.
 *
 * Resource metadata is the ONLY owner. Never module, never capability,
 * never code, never the Dashboard.
 */
export const AlertConfigurationMetadata = Object.freeze({
  contractKey: 'alert.configuration-metadata',
  version: ALERT_CONFIGURATION_VERSION,
  capabilityKey: 'alerts',
  configurationType: 'resource-metadata',
  resourceKinds: Object.freeze([
    'dynamicForms',
    'dynamicRecords',
    'documentRepository',
  ]),
  model: Object.freeze({
    enabled: Object.freeze({
      type: 'boolean',
      description: 'Whether this resource generates alerts. false → the alert never appears.',
    }),
    periodicity: Object.freeze({
      type: 'object|null|once',
      description: '{ amount, unit } with unit in hours|days|weeks|months|years, "once" for a single event, or null (no recurrence).',
    }),
    expiration: Object.freeze({
      type: 'string',
      enum: EXPIRATION_POLICIES,
      description: 'none | recurring | fixed expiration policy.',
    }),
    risk: Object.freeze({
      type: 'object',
      description: '{ model, thresholds } — scale-independent severity model (relative is the platform model).',
    }),
    priority: Object.freeze({
      type: 'string',
      enum: ALERT_PRIORITY_LEVELS,
      description: 'low | medium | high | critical — escalates the severity of the alert.',
    }),
    notification: Object.freeze({
      type: 'object|null',
      description: '{ channel, recipients } — notification intent (never executed by this contract).',
    }),
    gracePeriod: Object.freeze({
      type: 'object|null',
      description: '{ amount, unit } — tolerance after the due date before escalating to critical.',
    }),
    automaticClose: Object.freeze({
      type: 'boolean',
      description: 'Auto-close the alert when the resource is fulfilled.',
    }),
    repeatPolicy: Object.freeze({
      type: 'string',
      enum: REPEAT_POLICIES,
      description: 'repeat | once — re-emission policy of the alert.',
    }),
  }),
  never: Object.freeze([
    'computes due dates',
    'evaluates dates',
    'generates alerts',
    'decides policies',
    'notifies',
  ]),
});

export default AlertConfigurationMetadata;
