/**
 * CompletionBridge
 *
 * Sprint 257 — THE OPERATIONAL → OCCURRENCE ADAPTER (DEC-256-06, Gates D/E).
 *
 * The ONLY source of occurrence-completion signals is a semantically-FINAL
 * operational signal on the RESOURCE side. The orchestrator (authority of the
 * operational lifecycle, Sprint 132.1) publishes:
 *
 *   - `RESOURCE_COMPLETED`      → single-resource final (completado / approved / cerrado)
 *   - `RECORDS_STATUS_UPDATED`  → bulk 'completado' with recordIds
 *   - `RECORDS_APPROVED` / `RECORDS_CLOSED` → final transitions with recordIds
 *
 * This bridge listens on the EXISTING OperationalEventBus and records signals
 * as occurrence ledger facts. It NEVER creates a second runtime, never re-runs
 * evaluation, never notifies. Wire + record ONLY.
 *
 * (Design decision 256-CERT-26: the only place where operational events become
 * alert occurrences. Idempotent wiring and idempotent recording.)
 */
import { OperationalEventBus } from '../../experiences/OperationalEventBus.js';
import OccurrenceLedger from './OccurrenceLedger.js';

export const RESOURCE_COMPLETED_EVENT = 'RESOURCE_COMPLETED';
export const RECORDS_STATUS_UPDATED_EVENT = 'RECORDS_STATUS_UPDATED';
export const RECORDS_APPROVED_EVENT = 'RECORDS_APPROVED';
export const RECORDS_CLOSED_EVENT = 'RECORDS_CLOSED';

const FINAL_SINGLE_EVENTS = [RESOURCE_COMPLETED_EVENT, RECORDS_APPROVED_EVENT, RECORDS_CLOSED_EVENT];

let wired = false;

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

  wired = true;
  return () => {
    unsubs.forEach((u) => u?.());
    wired = false;
  };
}

export default wireCompletionBridge;