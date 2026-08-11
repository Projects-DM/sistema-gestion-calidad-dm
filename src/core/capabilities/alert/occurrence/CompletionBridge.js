/**
 * CompletionBridge
 *
 * Sprint 257 — THE OPERATIONAL → OCCURRENCE ADAPTER (DEC-256-06, Gates D/E).
 * Sprint 280 — F6. MULTI-ENTRY DECISION POINT (Sprint 268/279).
 *
 * The ONLY source of occurrence-completion facts is a semantically-FINAL
 * operational signal on the RESOURCE side.
 *
 * Sprint 280 — the bridge becomes the DECISION POINT between:
 *
 *   origin='alert'   → EXPLICIT identity (alertId + occurrenceId) carried in
 *                      the intent → record THE EXACT occurrence (specific key).
 *                      Invalid explicit identity → REJECT, never guess.
 *
 *   origin='resource' → the intent carries no alert identity. The bridge
 *                      obtains the resource's projected occurrences via the
 *                      injected OccurrenceProvider (the Runtime hook supplies
 *                      the certified OccurrenceProjection — reuse, no probe),
 *                      runs DeterministicCompletionResolver (F7) → AT MOST ONE
 *                      eligible occurrence → record it specifics-specific.
 *                      No eligible candidate / no occurrences → NO COMPLETION.
 *
 *   legacy events    → Sprint 257 compatibility path (resource-scoped
 *                      recording). Kept intact so certified consumers (records
 *                      orchestration) keep resolving. New form actions use the
 *                      new identity-aware path; no mass migration.
 *
 * The bridge NEVER fetches storage, NEVER re-evaluates dates, NEVER notifies.
 * Wire + record ONLY. The selection POLICY lives exclusively in
 * DeterministicCompletionResolver (F7) — never duplicated downstream.
 */
import { OperationalEventBus } from '../../experiences/OperationalEventBus.js';
import OccurrenceLedger from './OccurrenceLedger.js';
import { resolveSingleOccurrence } from './DeterministicCompletionResolver.js';
import { hasExplicitOccurrenceIdentity } from './CompletionSignal.js';

export const RESOURCE_COMPLETED_EVENT = 'RESOURCE_COMPLETED';
export const RECORDS_STATUS_UPDATED_EVENT = 'RECORDS_STATUS_UPDATED';
export const RECORDS_APPROVED_EVENT = 'RECORDS_APPROVED';
export const RECORDS_CLOSED_EVENT = 'RECORDS_CLOSED';
export const COMPLETION_INTENT_EVENT = 'COMPLETION_INTENT';

const FINAL_SINGLE_EVENTS = [RESOURCE_COMPLETED_EVENT, RECORDS_APPROVED_EVENT, RECORDS_CLOSED_EVENT];

let wired = false;

/** The Runtime hook registers the certified occurrence projection (reuse). */
let occurrenceProvider = null;

/**
 * Dependency injection (F6): the Runtime supplies the projected occurrences
 * (OccurrenceProjection.projectCurrentOccurrences) so the bridge neither
 * fetches nor re-evaluates. Idempotent; last registration wins.
 */
export function registerCompletionOccurrenceProvider(provider) {
  occurrenceProvider = typeof provider === 'function' ? provider : null;
  return occurrenceProvider !== null;
}

function provideOccurrences() {
  try {
    const result = occurrenceProvider ? occurrenceProvider() : null;
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

function inferSingleSignal(payload) {
  const resourceId = payload?.resourceId ?? payload?.recordId ?? payload?.id ?? null;
  if (!resourceId) return null;
  return {
    resourceKind: payload?.resourceKind ?? 'dynamicRecords',
    resourceId,
    moduleId: payload?.moduleId ?? payload?.experienceKey ?? null,
    completedAt: Number.isFinite(payload?.completedAt) ? payload.completedAt : Date.now(),
  };
}

function recordBulk(payload) {
  if (!Array.isArray(payload?.recordIds)) return;
  const base = {
    resourceKind: payload?.resourceKind ?? 'dynamicRecords',
    moduleId: payload?.moduleId ?? payload?.experienceKey ?? null,
    completedAt: Number.isFinite(payload?.completedAt) ? payload.completedAt : Date.now(),
  };
  for (const recordId of payload.recordIds) {
    OccurrenceLedger.recordCompletion({ ...base, resourceId: recordId });
  }
}

/**
 * F6 — Completes a CompletionIntent (new identity-aware path).
 *
 * @param {Object} intent { origin, resourceKind, resourceId, moduleId,
 *                         alertId?, occurrenceId?, completedAt }
 * @returns {Object|null} recorded signal, or null when nothing was recorded.
 */
export function handleCompletionIntent(intent) {
  if (!intent || typeof intent !== 'object') return null;
  if (!intent.resourceKind || !intent.resourceId) return null;

  if (intent.origin === 'alert') {
    // Explicit identity is REQUIRED and is NEVER guessed (Sprint 279 §4).
    if (!hasExplicitOccurrenceIdentity(intent)) return null;
    const signal = {
      resourceKind: intent.resourceKind,
      resourceId: intent.resourceId,
      moduleId: intent.moduleId ?? null,
      origin: 'alert',
      alertId: intent.alertId,
      occurrenceId: intent.occurrenceId,
      completedAt: Number.isFinite(intent.completedAt) ? intent.completedAt : Date.now(),
    };
    OccurrenceLedger.recordCompletion(signal);
    return signal;
  }

  if (intent.origin === 'resource') {
    // Direct resource entry → deterministic selection of AT MOST ONE occurrence.
    const occurrences = provideOccurrences().filter(
      (occ) =>
        occ &&
        String(occ.resourceKind ?? '') === String(intent.resourceKind ?? '') &&
        String(occ.resourceId ?? '') === String(intent.resourceId ?? '') &&
        (!intent.moduleId || String(occ.moduleId ?? '') === String(intent.moduleId ?? '')),
    );
    if (occurrences.length === 0) return null; // no alerts → NO COMPLETION
    const resolved = resolveSingleOccurrence({ occurrences, nowMs: intent.completedAt });
    if (!resolved) return null; // no eligible candidate → NO COMPLETION
    const signal = {
      resourceKind: intent.resourceKind,
      resourceId: intent.resourceId,
      moduleId: intent.moduleId ?? resolved.moduleId ?? null,
      origin: 'resource',
      alertId: resolved.alertId,
      occurrenceId: resolved.occurrenceId,
      completedAt: Number.isFinite(intent.completedAt) ? intent.completedAt : Date.now(),
    };
    OccurrenceLedger.recordCompletion(signal);
    return signal;
  }

  return null;
}

/**
 * Idempotent subscription. Returns an unsubscribe closure (falsy when already
 * wired). Consumed by the AlertRuntime module once at startup.
 */
export function wireCompletionBridge() {
  if (wired) return () => {};

  const unsubs = FINAL_SINGLE_EVENTS.map((eventType) =>
    OperationalEventBus.subscribe(eventType, (payload) => {
      recordBulk(payload);
      const single = inferSingleSignal(payload);
      if (single) OccurrenceLedger.recordCompletion(single);
    }),
  );

  unsubs.push(
    OperationalEventBus.subscribe(RECORDS_STATUS_UPDATED_EVENT, (payload) => {
      if (payload?.newStatus !== 'completado') return;
      recordBulk(payload);
    }),
  );

  unsubs.push(
    OperationalEventBus.subscribe(COMPLETION_INTENT_EVENT, (intent) => {
      handleCompletionIntent(intent);
    }),
  );

  wired = true;
  return () => {
    unsubs.forEach((u) => u?.());
    wired = false;
  };
}

export default wireCompletionBridge;