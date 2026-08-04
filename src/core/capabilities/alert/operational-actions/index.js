/**
 * Alert Operational Actions — Integration
 *
 * Sprint 208 — Alert Operational Actions Integration (LEVEL 5, operational
 * actions only).
 *
 * Integrates the user interaction with the Alert Capability, reusing the
 * certified pipeline:
 *
 *   Runtime → Evaluation Engine → Consumption Layer → Operational Actions
 *   → Action Adapter → Action Persistence
 *
 * Operational Actions NEVER evaluate, NEVER calculate states, NEVER interpret
 * rules, NEVER consult metadata and NEVER mutate Runtime. They only produce
 * Operational Action Requests (ACKNOWLEDGE, DISMISS, POSTPONE, RESOLVE,
 * REOPEN, ESCALATE) from the certified consumption state + the transported
 * user intent.
 *
 * Components (all frozen after this Sprint):
 *   1. AlertOperationalActionProvider — obtains only certified Consumption objects.
 *   2. AlertOperationalActionAdapter  — Consumption Entry + User Action → Action Request.
 *   3. AlertOperationalActionBoundary — official frontier Consumption ↓ Operational Actions.
 *   4. AlertOperationalActionContract — single contract Entry + Action → Request.
 */

export {
  AlertOperationalActionContract,
  OPERATIONAL_ACTIONS_VERSION,
  OPERATIONAL_ACTION_TYPES,
  ALERT_OPERATIONAL_ACTION_CONSUMED_FIELDS,
  ALERT_OPERATIONAL_ACTION_FORBIDDEN_FIELDS,
  ALERT_OPERATIONAL_ACTIONS,
} from './AlertOperationalActionContract.js';

export {
  OPERATIONAL_ACTIONS_BOUNDARY,
  ALERT_OPERATIONAL_ACTIONS_BOUNDARY,
} from './AlertOperationalActionBoundary.js';

export {
  alertOperationalActionAdapter,
  adaptOperationalAction,
} from './AlertOperationalActionAdapter.js';

export {
  alertOperationalActionProvider,
  provideOperationalActions,
} from './AlertOperationalActionProvider.js';

export const ALERT_OPERATIONAL_ACTIONS_LAYER = Object.freeze({
  key: 'operational-actions',
  name: 'Alert Operational Actions Integration Layer',
  version: '208',
  capabilityKey: 'alerts',
  layer: 'integration',
  consumes: 'consumption-layer',
  produces: 'operational-action-request',
  integrationOnly: true,
  creation: false,
  evaluation: false,
  eventing: false,
  runtimeMutation: false,
  persistence: true,
});

export default ALERT_OPERATIONAL_ACTIONS_LAYER;