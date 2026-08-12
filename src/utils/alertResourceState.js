/**
 * alertResourceState — Sprint 290 "Alerta es estado del recurso"
 *
 * PURE PRESENTATION SELECTOR. Groups the ALREADY-PROJECTED occurrences
 * (useAlertRuntime.occurrences → OccurrenceProjection) into ONE visual alert
 * state per REAL RESOURCE, with the internal occurrence windows exposed as
 * events. The resource UI consumes → presents; it never rebuilds identity,
 * schedules, windows or completion.
 *
 *   - Identity (alertId / occurrenceId / signalKey) is CONSUMED from the
 *     projected occurrence — never rebuilt (Sprint 284 F1 contract).
 *   - Classification uses the CERTIFIED domain classifier
 *     (OccurrenceLifecycle.classifyOccurrence: window + completion
 *     precedence, OCC-CERT-08) — same state the monitor consumes.
 *   - Presentation metadata (priority / enabled) is ENRICHED from the REAL
 *     resource via the Resolver SSOT envelope (DEC-263) — never re-derived.
 *   - Sprint 295 — DISABLED VISUAL SUPPRESSION. An alert whose configuration
 *     is explicitly `enabled === false` is NOT presented: the selector drops
 *     its occurrences from presentation and returns null (present: false).
 *     The configuration, persistence, domain, runtime and the occurrence
 *     itself all REMAIN INTACT — only the visual representation is hidden.
 *   - An ALERT IS NOT A RESOURCE. This produces a summary of a resource's
 *     alert state; it never creates resources, records or identities.
 *
 * This is presentation-only. No engines, no ledger, no persistence, no store.
 */

import { classifyOccurrence } from '../core/capabilities/alert/occurrence/OccurrenceLifecycle.js';
import { resolveResourceAlertEnvelope } from '../core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js';

const STATUS_PRESENTATION = Object.freeze({
  overdue: Object.freeze({ label: 'Vencida', color: 'red', icon: 'AlertTriangle' }),
  today: Object.freeze({ label: 'Hoy', color: 'orange', icon: 'Clock' }),
  upcoming: Object.freeze({ label: 'Próxima', color: 'yellow', icon: 'Calendar' }),
  active: Object.freeze({ label: 'Activa', color: 'green', icon: 'CheckCircle2' }),
  completed: Object.freeze({ label: 'Cumplida', color: 'emerald', icon: 'CheckCircle' }),
  cancelled: Object.freeze({ label: 'Cancelada', color: 'gray', icon: 'AlertOctagon' }),
});

const PRIORITY_LABELS = Object.freeze({ low: 'Baja', medium: 'Media', high: 'Alta' });
const MONTHS = Object.freeze(['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']);

const STATUS_ORDER = Object.freeze({
  overdue: 0,
  today: 1,
  upcoming: 2,
  active: 3,
  completed: 4,
  cancelled: 5,
});

/**
 * Sprint 292 — Compact schedule builder (PRESENTATION ONLY). Groups the already-
 * projected events into day buckets ("Hoy" / "Mañana" / "12 ago") with the HH:MM
 * of each next execution, one line per day. N occurrences → 1 visual state →
 * N relevant times. Non-open (completed/cancelled) events are skipped: the card
 * answers "cuándo debo prestarle atención", nothing more.
 *
 * @param {Array}  events Open event list from the projector (status/dueMs).
 * @param {number} [nowMs] Optional reference instant (ms).
 * @returns {Array} [{ day: string, times: string[] }]
 */
export function buildScheduleLines(events, nowMs) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const pad = (n) => String(n).padStart(2, '0');
  const trunc = (t) => {
    const x = new Date(t);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const today = trunc(now);
  const tomorrow = trunc(now + 8.64e7);
  const dayLabel = (ms) => {
    const d = new Date(ms);
    const t = trunc(ms);
    if (t === today) return 'Hoy';
    if (t === tomorrow) return 'Mañana';
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  };

  const lines = [];
  const idxByDay = new Map();
  for (const ev of events || []) {
    if (!ev) continue;
    if (ev.status === 'completed' || ev.status === 'cancelled') continue;
    const dueMs = ev.dueMs ?? ev.dueAt ?? null;
    if (dueMs === null || Number.isNaN(Number(dueMs))) continue;
    const day = dayLabel(Number(dueMs));
    const time = `${pad(new Date(Number(dueMs)).getHours())}:${pad(new Date(Number(dueMs)).getMinutes())}`;
    const existing = idxByDay.get(day);
    if (existing !== undefined) {
      if (!lines[existing].times.includes(time)) lines[existing].times.push(time);
    } else {
      idxByDay.set(day, lines.length);
      lines.push(Object.freeze({ day, times: [time] }));
    }
  }
  return lines;
}

/**
 * Pure label-only formatter for a target instant (presentation, reference to
 * the projected window the projection already computed — never re-computed).
 *
 * @param {number|null} targetMs
 * @returns {string|null}
 */
export function formatExecutionTime(targetMs) {
  if (targetMs === null || targetMs === undefined || Number.isNaN(targetMs)) return null;
  const d = new Date(targetMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const hm = `${hh}:${mm}`;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now.getTime() + 8.64e7);
  if (sameDay) return `Hoy ${hm}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Mañana ${hm}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${hm}`;
}

/**
 * Classifies a projected occurrence for PRESENTATION ONLY using the certified
 * domain classifier (mirror of the certified monitor's
 * classifyConsumedOccurrence — never a lifecycle re-derivation). Sprint 295:
 * the `disabled` bucket is intentionally ABSENT here — occurrences of an
 * explicitly disabled alert are filtered OUT by the selector before
 * classification, so presentation never renders a disabled state.
 *
 * @param {Object} occurrence Projected AlertOccurrence VO.
 * @param {number} nowMs
 * @returns {{ key, label, color, icon, persistent }}
 */
function classifyForPresentation(occurrence, nowMs) {
  const domain = classifyOccurrence(occurrence, nowMs);
  if (domain.key === 'completed' || domain.key === 'cancelled') {
    const p = STATUS_PRESENTATION[domain.key];
    return { key: domain.key, ...p, persistent: true };
  }
  const p = STATUS_PRESENTATION[domain.key] || STATUS_PRESENTATION.active;
  return { key: domain.key, ...p, persistent: false };
}

/**
 * Projects a SINGLE visual alert state for one real resource out of the
 * already-projected occurrences. One alert per resource; the internal
 * occurrence windows are exposed as a sorted event list.
 *
 * @param {object} params
 * @param {Array}  params.occurrences    Projected AlertOccurrence VOs.
 * @param {string} params.resourceKind   'dynamicForms' | 'documentRepository'.
 * @param {number|string} params.resourceId
 * @param {object} [params.resource]     Real resource snapshot (for ENRICHMENT).
 * @param {number} [params.now]          Optional classification moment (ms).
 * @returns {object|null}                Frozen alert state or null (no alert).
 */
export function projectResourceAlertState({ occurrences, resourceKind, resourceId, resource, now }) {
  if (!Array.isArray(occurrences) || occurrences.length === 0) return null;
  if (resourceId === null || resourceId === undefined) return null;

  const targetKey = String(resourceId ?? '');
  const matches = (occurrences || []).filter(
    (o) => o && String(o?.resourceKind ?? '') === resourceKind && String(o?.resourceId ?? '') === targetKey,
  );
  if (matches.length === 0) return null;

  const nowMs = Number.isFinite(now) ? now : Date.now();

  // Enrichment ONLY (Sprint 285 pattern): priority + enabled travel in the
  // resource's Resolver envelope; NEVER re-derived, NEVER new SSOT.
  let cfgByAlertId = null;
  if (resource) {
    try {
      const envelope = resolveResourceAlertEnvelope(resource);
      cfgByAlertId = new Map((envelope?.items ?? []).map((it) => [String(it?.alertId ?? ''), it?.configuration ?? null]));
    } catch {
      cfgByAlertId = null; // enrichment failure must not drop the projected state
    }
  }

  const events = matches
    .map((o) => {
      const cfg = cfgByAlertId ? (cfgByAlertId.get(String(o?.alertId ?? '')) ?? null) : null;
      // Sprint 295 — DISABLED VISUAL SUPPRESSION. An occurrence whose OWN alert
      // is explicitly disabled is NOT presented (no state, no schedule, no
      // priority, no status label, no events). The occurrence is NEVER deleted
      // and the configuration/persistence/domain/runtime REMAIN INTACT — only
      // its visual representation is dropped. When every occurrence of the
      // resource is suppressed, the selector returns null (present: false).
      if (cfg?.enabled === false) return null;
      const state = classifyForPresentation(o, nowMs);
      const dueMs = o?.dueAt ?? o?.startsAt ?? null;
      const priority = cfg?.priority || 'medium';
      return Object.freeze({
        occurrenceId: o?.occurrenceId ?? null,
        alertId: o?.alertId ?? null,
        sequence: o?.sequence ?? null,
        startsAt: o?.startsAt ?? null,
        dueAt: o?.dueAt ?? null,
        status: state.key,
        statusLabel: state.label,
        color: state.color,
        icon: state.icon,
        persistent: state.persistent === true,
        priority,
        priorityLabel: PRIORITY_LABELS[priority] || 'Media',
        dueMs,
        sortKey: dueMs === null ? Number.MAX_SAFE_INTEGER : dueMs,
      });
    })
    .filter((ev) => ev !== null)
    .sort((a, b) => {
      const byOrder = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (byOrder !== 0) return byOrder;
      return a.sortKey - b.sortKey;
    });

  // Sprint 295 — nothing presentable (e.g. every alert disabled) → no state.
  if (events.length === 0) return null;

  const open = events.filter((e) => e.status !== 'completed' && e.status !== 'cancelled');
  const head = open.length > 0 ? open[0] : events[0];

  return Object.freeze({
    present: true,
    resourceKind,
    resourceId: targetKey,
    status: head.status,
    statusLabel: head.statusLabel,
    color: head.color,
    icon: head.icon,
    priority: head.priority,
    priorityLabel: head.priorityLabel,
    nextDue: head.dueMs,
    nextExecution: formatExecutionTime(head.dueMs),
    total: events.length,
    openCount: open.length,
    hasOpen: open.length > 0,
    events,
  });
}

export default projectResourceAlertState;