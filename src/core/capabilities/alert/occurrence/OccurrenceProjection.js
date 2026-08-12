/**
 * OccurrenceProjection
 *
 * Sprint 257 — OCCURRENCE DERIVATION (read-only, OCC-CERT-01…05, Gate C).
 * Sprint 257-HF1 — PROJECTION BOUNDARY HARDENING (RUNTIME STABILIZATION).
 *
 * Projects the CURRENT AlertOccurrences of the visible, enrolled alert
 * collections using the certified schedule (OccurrenceSchedule, elevated and
 * shared with AlertMonitoringExperience — Gate C: ONE scheduling algorithm).
 *
 * This module lives in the occurrence domain so the Runtime hook and the
 * module monitor consume the SAME projection; both stay in sync without
 * duplicating the schedule.
 *
 * Completed relation: the occurrence carries a `completion` contract field
 * loaded from the OccurrenceLedger (window-aware, OCC-CERT-12). The ledger is
 * NEVER mutated here; never reads configuration storage directly — it goes
 * through the AlertConfigurationResolver (SSOT, Sprint 197).
 *
 * HF1 — PROJECTION BOUNDARY (contract candidacy, not optional-chaining):
 *
 *     Candidate ──› Contract Validation ──› Valid Occurrence ──› Projection
 *
 * Every candidate is validated at the frontier BEFORE any dereference. A
 * candidate whose schedule cannot produce a window (null/NaN anchor), or whose
 * resulting occurrence does NOT satisfy the AlertOccurrence contract, is
 * REJECTED — never defaulted, never fabricated, never partially projected.
 *
 * The contract body (isAlertOccurrence/assertAlertOccurrence from
 * OccurrenceContract.js) is the ONLY validation authority: HF1 does not
 * introduce a parallel/orV2 validator.
 */
import {
  parseAnchor,
  occurrenceWindowAt,
} from './OccurrenceSchedule.js';
import { createAlertOccurrence, occurrenceIdOf, isAlertOccurrence } from './OccurrenceContract.js';
import OccurrenceLedger from './OccurrenceLedger.js';
import {
  resolveResourceAlertCollection,
  extractResourceAlertCollection,
  alertConfigIdOf,
} from '../operational-configuration/AlertConfigurationResolver.js';

/**
 * Per-source resource kinds (certified, module-agnostic).
 */
export const RESOURCE_KIND = Object.freeze({
  forms: 'dynamicForms',
  repositories: 'documentRepository',
  categories: 'documentCategory',
});

/**
 * Contract candidacy boundary (HF1). A candidate is accepted ONLY when it can
 * produce a full, valid occurrence window. `false` → the candidate is rejected
 * and skipped (never fabricated).
 *
 * @param {Object|null|undefined} candidate Raw collection item + resolved cfg.
 * @returns {boolean} Whether a valid schedule window exists.
 */
function isProjectableOccurrenceCandidate(candidate, anchorMs) {
  if (!candidate || typeof candidate !== 'object') return false;
  return anchorMs !== null && !Number.isNaN(anchorMs);
}

/**
 * Projects the current occurrence of each visible ENROLLED alert collection.
 *
 * @param {Object} resources Visible existing snapshot ({ forms, repositories, categories }).
 * @param {string|null} moduleId Optional module identity for `moduleId` binding.
 * @param {number} [nowMs] Moment for tests (ms).
 * @returns {Array<Object>} Derived AlertOccurrence Value Objects — ONLY valid
 *   contract occurrences (never partial, never fabricated).
 */
export function projectCurrentOccurrences(resources, moduleId, nowMs) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const out = [];
  if (!resources || typeof resources !== 'object') return out;

  for (const s of ['forms', 'repositories', 'categories']) {
    const list = Array.isArray(resources[s]) ? resources[s] : [];
    for (const resource of list) {
      const raw = extractResourceAlertCollection(resource);
      if (!Array.isArray(raw) || raw.length === 0) continue;
      // SSOT authority: the Resolver is the only reader of configuration.
      let resolution;
      try {
        resolution = resolveOperational(resource);
      } catch {
        continue;
      }
      (resolution?.collection ?? []).forEach((cfg, idx) => {
        const rawItem = raw[idx];
        const anchorMs = parseAnchor(rawItem || cfg);
        // Sprint 298 — the schedule receives the RICH PERIODICITY
        // ({ amount, unit }) so months/years project with TRUE calendar
        // arithmetic (POLICY CAL-001), while hours/days/weeks keep the
        // certified ms-linear path. Single recurrence engine, ONE algorithm.
        const periodicity = rawItem?.periodicity ?? cfg?.periodicity;
        // HF1 — BOUNDARY: a candidate with no resolvable anchor (startDate/
        // startTime empty by default, Sprint-254 audit) cannot be scheduled.
        // REJECT the candidate HERE, before ANY window dereference.
        if (!isProjectableOccurrenceCandidate(rawItem || cfg, anchorMs)) return;
        const window = occurrenceWindowAt(anchorMs, periodicity, now);
        // Defense-in-depth: the schedule is the SSOT and may still consolidate
        // to null for NaN anchors; a null window is NEVER dereferenced.
        if (!window) return;

        // Sprint 284 — CANONICAL ALERT IDENTITY (F1). The projection NO LONGER
        // builds a local alertId (`source:resourceId:idx`); it delegates to
        // AlertConfigurationResolver.alertConfigIdOf (SSOT). The resourceId is
        // the SAME the Resolver/Enrollment compute (`id ?? slug`), so
        // projection, enrollment and resolver yield ONE identity: `12:alert:0`.
        const resourceId = resolution.resourceId;
        const alertId = alertConfigIdOf(resourceId, idx);
        const occurrenceId = occurrenceIdOf(alertId, window.sequence);
        // Sprint 280 — F9. The projection queries the occurrence-SPECIFIC
        // completion first (OccurrenceLedger resolves
        // `occurrence::alertId::occurrenceId`), falling back to the legacy
        // resource-scoped key only for compatibility. A completion of A:occ:001
        // never satisfies B:occ:001/C:occ:001 though they share a resource.
        const signal = OccurrenceLedger.completionSignalFor({
          resourceKind: RESOURCE_KIND[s],
          resourceId,
          moduleId,
          startsAt: window.startsAt,
          dueAt: window.dueAt,
          alertId,
          occurrenceId,
        });
        // Second boundary gate: only FULL contract VOs are accepted. The
        // assert/validators are the contract's own (no V2 clone).
        const occurrence = createAlertOccurrence({
          occurrenceId,
          alertId,
          resourceKind: RESOURCE_KIND[s],
          resourceId,
          moduleId: moduleId ?? null,
          startsAt: window.startsAt,
          dueAt: window.dueAt,
          timezone: cfg?.timezone ?? 'local',
          sequence: window.sequence,
          status: null,
          completion: signal
            ? {
                status: signal.status ?? 'COMPLETED',
                completedAt: signal.completedAt ?? null,
                signalKey: signal.alertId && signal.occurrenceId
                  ? `occurrence::${signal.alertId}::${signal.occurrenceId}`
                  : signal.resourceKind && signal.resourceId
                    ? `${signal.resourceKind}:${signal.resourceId}`
                    : null,
              }
            : null,
          createdAt: now,
        });
        if (!isAlertOccurrence(occurrence)) return; // contract reject, never partial
        out.push(occurrence);
      });
    }
  }
  return out;
}

function resolveOperational(resource) {
  return resolveResourceAlertCollection(resource);
}

export default projectCurrentOccurrences;