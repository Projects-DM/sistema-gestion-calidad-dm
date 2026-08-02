/**
 * RuntimeIntegrityBoundary
 *
 * Sprint 186 — Operational Resource Integrity Audit (MASTER SSOT LEVEL 4).
 *
 * The integrity boundary of the Alert Runtime: the set of resource
 * states that are FORBIDDEN from entering the Runtime.
 *
 * Blocked states:
 *
 *   - Historical  → resource belongs to a historical/deprecated module
 *   - Archived    → resource archived
 *   - Detached    → resource detached from an operational module
 *   - Hidden      → resource not visible in the Operational Workspace
 *   - Unknown     → resource state cannot be determined
 *   - Orphan      → resource does not belong to the module
 *
 * A resource is eligible ONLY when its integrity state is `valid`.
 *
 * Boundary ONLY. Pure functions. Never queries, never executes.
 */

import {
  RESOURCE_INTEGRITY_STATES,
  FORBIDDEN_INTEGRITY_STATES,
} from './RuntimeSourceIntegrityPolicy.js';

const BLOCKED_STATE_KEYS = Object.freeze({
  [RESOURCE_INTEGRITY_STATES.ORPHAN]: 'Orphan',
  [RESOURCE_INTEGRITY_STATES.ARCHIVED]: 'Archived',
  [RESOURCE_INTEGRITY_STATES.HIDDEN]: 'Hidden',
  [RESOURCE_INTEGRITY_STATES.DETACHED]: 'Detached',
  [RESOURCE_INTEGRITY_STATES.INACTIVE]: 'Inactive',
  [RESOURCE_INTEGRITY_STATES.DELETED]: 'Deleted',
  [RESOURCE_INTEGRITY_STATES.UNKNOWN]: 'Unknown',
});

/**
 * Whether a resource integrity state is blocked from the Runtime.
 *
 * @param {string} state Integrity state.
 * @returns {boolean}
 */
export function isIntegrityStateBlocked(state) {
  return state !== RESOURCE_INTEGRITY_STATES.VALID;
}

/**
 * Human-readable blocked key for a state.
 *
 * @param {string} state Integrity state.
 * @returns {string|null}
 */
export function blockedStateKey(state) {
  return BLOCKED_STATE_KEYS[state] ?? null;
}

/**
 * Scans an Operational Resource Inventory and returns the boundary
 * decision for every resource.
 *
 * @param {Object} inventory Operational resource inventory.
 * @returns {Object} Boundary decision.
 */
export function evaluateIntegrityBoundary(inventory = {}) {
  const sources = ['forms', 'records', 'documents'];
  const blocked = [];
  const allowed = [];
  let scanned = 0;

  for (const source of sources) {
    const entries = Array.isArray(inventory[source]) ? inventory[source] : [];
    for (const entry of entries) {
      scanned += 1;
      const record = Object.freeze({
        source: entry.source ?? source,
        resourceId: entry.resourceId ?? null,
        state: entry.state ?? RESOURCE_INTEGRITY_STATES.UNKNOWN,
        reasons: entry.reasons ?? [],
      });
      if (isIntegrityStateBlocked(record.state)) {
        blocked.push(record);
      } else {
        allowed.push(record);
      }
    }
  }

  return Object.freeze({
    scanned,
    blocked: Object.freeze(blocked),
    allowed: Object.freeze(allowed),
    blockedCount: blocked.length,
    allowedCount: allowed.length,
    enforced: true,
  });
}

export const RUNTIME_INTEGRITY_BOUNDARY = Object.freeze({
  key: 'runtime-integrity-boundary',
  name: 'Alert Runtime Integrity Boundary',
  purpose: 'Blocks historical, archived, detached, hidden, unknown and orphan resources from the Alert Runtime.',
  eligibleState: RESOURCE_INTEGRITY_STATES.VALID,
  forbiddenStates: FORBIDDEN_INTEGRITY_STATES,
  blockedStates: Object.freeze([
    'Historical',
    'Archived',
    'Detached',
    'Hidden',
    'Unknown',
    'Orphan',
  ]),
  protectedPath: Object.freeze([
    'Module',
    'Workspace Resource Resolver',
    'Operational Resource Set',
    'Runtime Binding',
    'Existing Runtime',
  ]),
  forbiddenPath: Object.freeze([
    'Database → Historical Records → Alert Workspace',
    'Orphan Documents → Alert Workspace',
    'Hidden Resources → Alert Workspace',
  ]),
});

export default RUNTIME_INTEGRITY_BOUNDARY;
