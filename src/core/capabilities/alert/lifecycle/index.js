/**
 * Alert Lifecycle — Persistence Integration
 *
 * Sprint 207 — Alert Lifecycle Persistence Integration (LEVEL 5, lifecycle
 * only).
 *
 * Integrates the Alert Capability into the operational history persistence,
 * reusing the certified pipeline:
 *
 *   Runtime → Evaluation Engine → Consumption Layer → Lifecycle Integration
 *   → Lifecycle Adapter → Lifecycle Persistence
 *
 * The Lifecycle NEVER evaluates, NEVER calculates states, NEVER interprets
 * rules and NEVER consults metadata. It only PERSISTS the operational state
 * already produced by the certified Runtime + Evaluation Engine +
 * Consumption Layer.
 *
 * Components (all frozen after this Sprint):
 *   1. AlertLifecycleProvider — obtains only certified Consumption objects.
 *   2. AlertLifecycleAdapter  — Consumption Entry → Lifecycle Record.
 *   3. AlertLifecycleBoundary — official frontier Consumption ↓ Lifecycle.
 *   4. AlertLifecycleContract — single contract Consumption Entry → Record.
 */

export {
  AlertLifecycleContract,
  ALERT_LIFECYCLE_VERSION,
  ALERT_LIFECYCLE_CONSUMED_FIELDS,
  ALERT_LIFECYCLE_FORBIDDEN_FIELDS,
  ALERT_LIFECYCLE,
} from './AlertLifecycleContract.js';

export {
  LIFECYCLE_ALERT_BOUNDARY,
  ALERT_LIFECYCLE_BOUNDARY,
} from './AlertLifecycleBoundary.js';

export {
  alertLifecycleAdapter,
  adaptLifecycleRecord,
} from './AlertLifecycleAdapter.js';

export {
  alertLifecycleProvider,
  provideLifecycleRecords,
} from './AlertLifecycleProvider.js';

export const ALERT_LIFECYCLE_LAYER = Object.freeze({
  key: 'lifecycle',
  name: 'Alert Lifecycle Persistence Integration Layer',
  version: '207',
  capabilityKey: 'alerts',
  layer: 'integration',
  consumes: 'consumption-layer',
  produces: 'lifecycle-record',
  integrationOnly: true,
  creation: false,
  evaluation: false,
  eventing: false,
  persistence: true,
});

export default ALERT_LIFECYCLE_LAYER;