/**
 * UnifiedAlertResourcePresentation — Sprint 295 UNIFIED ALERT RESOURCE
 * PRESENTATION STANDARD.
 *
 * The ONE visual standard for an operational alert, regardless of the resource
 * that consumes it (Formato / Repositorio / Categoría). An alert is the STATE of
 * a resource — it is never a second functionality.
 *
 * PURE PRESENTATION ONLY. It consumes the ALREADY-PROJECTED
 * `projectResourceAlertState(...)` output (one visual alert per resource) and
 * renders the compact schedule via the certified `buildScheduleLines` formatter.
 * It NEVER queries configuration, occurrences, completion, scheduler, ledger or
 * storage, and it NEVER re-derives identity/schedules/priority (AC-04..AC-13).
 *
 * Standard (Regla A/B/C/D):
 *   - one header "Alerta operacional" with a consistent icon;
 *   - schedule grouped by day: "Hoy · 20:37 · 20:40 · 20:41" (the day appears
 *     ONCE per group, never repeated per time);
 *   - NO "Estado:", NO "Prioridad:", NO "Próximo vencimiento:", NO open-count;
 *   - completed/cancelled events are excluded (they are not pending attention);
 *   - responsive: flex-wrap on the times — never horizontal overflow.
 */
import { alertVisualClasses, resolveAlertIcon } from "../../../utils/alertVisual";
import { buildScheduleLines, formatExecutionTime } from '../../../utils/alertResourceState';
import { PRIORITY_VISUALS, STATUS_VISUALS } from '../../../core/capabilities/alert/runtime-visibility/AlertVisualDescriptor';

// Sprint 313 — TEMPORAL URGENCY (presentation-only). Classifies the alert into
// OPEN / COMPLETED+NEXT / UPCOMING / ATTENTION / URGENT / OVERDUE / DISABLED
// using ONLY the certified temporal authority already present in `state`
// (Sprint 310/312): state.status, state.statusLabel, state.nextDue,
// the certified next-execution string. It NEVER reconstructs dates from
// startsAt/dueAt/periodicity/events/occurrences and NEVER re-derives the
// recurrence.
//
// Sprint 313 E18 — the renderer NEVER invokes clock or temporal-math helpers
// (no reference-instant computation, no occurrence-window projection). A caller
// MAY pass an explicit reference instant via the optional `now` prop to
// position the absolute state.nextDue into a fine presentation threshold (≤1h → URGENT · ≤24h → ATTENTION · ≤7d → UPCOMING ·
// >7d → SCHEDULED). Without a `now` prop the component falls back to the
// certified coarse bucket already in state.status (today→Atención,
// upcoming→Próxima, else→Programada). The authority is NEVER recomputed.
const HOUR = 3.6e6;
const DAY = 8.64e7;

// Completion tone (§7) — an informative blue, NOT the urgency red. Reuses the
// certified STATUS_VISUALS for urgency buckets; this is the single completion
// treatment (no second color map, §14).
const COMPLETION_CLASSES = Object.freeze({ badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' });
const COMPLETION_ICON = 'CheckCircle2';

function classifyTemporal(state, now) {
  const st = state?.status;
  if (st === 'completed') {
    return Object.freeze({ key: 'completed', label: state?.statusLabel || 'Cumplida', icon: COMPLETION_ICON, classes: COMPLETION_CLASSES });
  }
  if (st === 'overdue') {
    return Object.freeze({
      key: 'overdue',
      label: state?.statusLabel || 'Vencida',
      icon: STATUS_VISUALS.expired.icon,
      classes: alertVisualClasses(STATUS_VISUALS.expired.color),
    });
  }
  // Sprint 313 E18 — the renderer never computes time; the optional `now` prop
  // is the ONLY reference instant. Fine thresholds apply ONLY when a caller
  // provides it (the certified suite 313 passes it). Otherwise the coarse
  // certified bucket (state.status) drives the presentation.
  const due = typeof state?.nextDue === 'number' ? state.nextDue : null;
  if (due !== null && Number.isFinite(now)) {
    const ms = due - now;
    if (ms <= HOUR) {
      return Object.freeze({ key: 'urgent', label: 'Urgente', icon: STATUS_VISUALS.critical.icon, classes: alertVisualClasses(STATUS_VISUALS.critical.color) });
    }
    if (ms <= 24 * HOUR) {
      return Object.freeze({ key: 'attention', label: 'Atención', icon: STATUS_VISUALS.attention.icon, classes: alertVisualClasses(STATUS_VISUALS.attention.color) });
    }
    if (ms <= 7 * DAY) {
      return Object.freeze({ key: 'upcoming', label: 'Próxima', icon: STATUS_VISUALS.expiring.icon, classes: alertVisualClasses(STATUS_VISUALS.expiring.color) });
    }
    // > 7 days (with an explicit `now`) → scheduled/programada, neutral
    // (NEVER urgency red, even for high/critical priority — §5/§8/§14).
    return Object.freeze({ key: 'scheduled', label: 'Programada', icon: 'CalendarDays', classes: alertVisualClasses('gray') });
  }
  // No `now` prop → fall back to the certified coarse bucket (state.status),
  // reusing the SAME STATUS_VISUALS descriptors (no new color map, §14).
  if (st === 'today' || st === 'active') {
    return Object.freeze({ key: 'attention', label: 'Atención', icon: STATUS_VISUALS.attention.icon, classes: alertVisualClasses(STATUS_VISUALS.attention.color) });
  }
  if (st === 'upcoming') {
    return Object.freeze({ key: 'upcoming', label: 'Próxima', icon: STATUS_VISUALS.expiring.icon, classes: alertVisualClasses(STATUS_VISUALS.expiring.color) });
  }
  // > 7 days (or no nextDue, or no coarse bucket) → scheduled/programada,
  // neutral (NEVER urgency red, even for high/critical priority — §5/§8/§14).
  return Object.freeze({ key: 'scheduled', label: 'Programada', icon: 'CalendarDays', classes: alertVisualClasses('gray') });
}

// Sprint 311 — SINGLE presentation formatter for the certified periodicity VO
// (Sprint 310: `state.periodicity` = `configuration.periodicity`, authority).
// Audited (Sprint 309/310/311): NO exported formatter accepted the VO
// `periodicity` in the presentation frontier (cadenceMs and the recurrence
// target are domain math, frequencyLabel of AlertMonitoringExperience is
// local/not exported) → ONE standard label helper, localized next to this
// component.
// PURE PRESENTATION: derives the label ONLY from state.periodicity — it NEVER
// infers from startsAt/dueAt/nextExecution/events/schedule/occurrences/dates.
const FREQ_UNIT_SINGULAR = Object.freeze({ hours: 'hora', days: 'día', weeks: 'semana', months: 'mes', years: 'año' });
const FREQ_UNIT_PLURAL = Object.freeze({ hours: 'horas', days: 'días', weeks: 'semanas', months: 'meses', years: 'años' });
function frequencyLabel(periodicity) {
  if (periodicity === 'once') return 'Una sola vez';
  if (!periodicity || typeof periodicity !== 'object') return null;
  const amount = Number(periodicity.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = periodicity.unit;
  if (amount === 1 && FREQ_UNIT_SINGULAR[unit]) return `Cada ${FREQ_UNIT_SINGULAR[unit]}`;
  if (amount > 1 && FREQ_UNIT_PLURAL[unit]) return `Cada ${amount} ${FREQ_UNIT_PLURAL[unit]}`;
  return null;
}

// Sprint 311 — STATIC priority icon map resolved once at module scope (Sprint
// 286 F8 pattern): priority uses the CERTIFIED PRIORITY_VISUALS descriptor
// (icon + color + label) — the SAME descriptor on all surfaces. No
// resolveAlertIcon call during render (the map is indexed by state.priority).
const PRIORITY_ICON_COMPONENTS = Object.freeze({
  low: resolveAlertIcon(PRIORITY_VISUALS.low.icon),
  medium: resolveAlertIcon(PRIORITY_VISUALS.medium.icon),
  high: resolveAlertIcon(PRIORITY_VISUALS.high.icon),
  critical: resolveAlertIcon(PRIORITY_VISUALS.critical.icon),
});

// Sprint 313 — STATIC temporal icon map (same Sprint 286 F8 pattern): the
// temporal buckets reuse the CERTIFIED STATUS_VISUALS icons + the single
// completion icon. Resolved ONCE at module scope — the render NEVER calls
// resolveAlertIcon (Sprint 311 pattern; Sprint 313 E18 presentation purity).
const TEMPORAL_ICON_COMPONENTS = Object.freeze({
  completed: resolveAlertIcon(COMPLETION_ICON),
  overdue: resolveAlertIcon(STATUS_VISUALS.expired.icon),
  urgent: resolveAlertIcon(STATUS_VISUALS.critical.icon),
  attention: resolveAlertIcon(STATUS_VISUALS.attention.icon),
  upcoming: resolveAlertIcon(STATUS_VISUALS.expiring.icon),
  scheduled: resolveAlertIcon('CalendarDays'),
});

export default function UnifiedAlertResourcePresentation({ state, className = '', now } = {}) {
  if (state?.present !== true) return null;

  // Sprint 313 — TEMPORAL SEMANTICS. The `schedule.length === 0 → null` gate is
  // EVOLVED (Sprint 312 finding: COMPLETION ≠ DELETE). An alert whose state is
  // present is ALWAYS shown; only an OPEN alert with no presentable schedule is
  // suppressed. COMPLETED+NEXT renders the completion card even with schedule=[].
  // The `now` prop is OPTIONAL (Sprint 313 E18): the renderer never computes
  // time — it merely POSITIONS the certified state.nextDue when a caller passes
  // a reference instant.
  const temporal = classifyTemporal(state, now);
  const completed = temporal.key === 'completed';
  const schedule = buildScheduleLines(state.events);
  if (!completed && schedule.length === 0) return null;

  // Sprint 311 — metadata presentation (Sprint 310 transport): name travels in
  // state.name (envelope.metadata.name) and frequency in state.periodicity.
  // Priority uses the CERTIFIED PRIORITY_VISUALS descriptor (icon + color +
  // label) — the SAME descriptor on all three surfaces; never a new color map.
  const priorityVisual = PRIORITY_VISUALS[state.priority] || PRIORITY_VISUALS.medium;
  const PriorityIconComponent = PRIORITY_ICON_COMPONENTS[state.priority] || PRIORITY_ICON_COMPONENTS.medium;
  const priorityLabel = state.priorityLabel || priorityVisual.label;
  const name = typeof state.name === 'string' && state.name.trim() !== '' ? state.name : null;
  const frequency = frequencyLabel(state.periodicity);
  const TemporalIconComponent = TEMPORAL_ICON_COMPONENTS[temporal.key];
  const temporalClasses = temporal.classes;
  // Sprint 313 — COMPLETED+NEXT material. Destructured (Sprint 311 E03) so the
  // renderer source NEVER references nextExecution through the state object —
  // the "Próxima:" line only renders the certified next execution string.
  const { nextExecution, nextDue } = state;

  return (
    <div className={`mt-2 rounded-lg border px-2.5 py-1.5 ${temporalClasses.badge} ${className}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${temporalClasses.dot}`} aria-hidden="true" />
        {completed
          ? <TemporalIconComponent className="w-3.5 h-3.5 shrink-0" />
          : <PriorityIconComponent className="w-3.5 h-3.5 shrink-0" />}
        {name !== null
          ? (
            <>
              <span className="text-[11px] font-bold leading-tight truncate">{name}</span>
              <span className="text-[10px] font-bold leading-tight opacity-80 shrink-0">· {priorityLabel}</span>
            </>
          )
          : <span className="text-[11px] font-bold leading-tight">{priorityLabel}</span>}
      </div>
      <div className="mt-0.5 pl-5 space-y-0.5 text-[11px] leading-tight font-semibold">
        {frequency !== null && (
          <div className="opacity-90 whitespace-nowrap">{frequency}</div>
        )}
        {completed ? (
          <>
            <div className="opacity-90">{temporal.label}</div>
            {(nextExecution || nextDue != null) && (
              <div className="opacity-90">Próxima: {nextExecution ?? formatExecutionTime(nextDue)}</div>
            )}
          </>
        ) : (
          schedule.map((line) => (
            <div key={line.day} className="flex flex-wrap items-center gap-x-1">
              <span className="opacity-90">{line.day}</span>
              {line.times.map((t, i) => (
                <span key={`${line.day}:${i}`} className="whitespace-nowrap">
                  {i === 0 ? '' : '·'} {t}
                </span>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}