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
import { buildScheduleLines } from '../../../utils/alertResourceState';
import { PRIORITY_VISUALS } from '../../../core/capabilities/alert/runtime-visibility/AlertVisualDescriptor';

// Sprint 311 — SINGLE presentation formatter for the certified periodicity VO
// (Sprint 310: `state.periodicity` = `configuration.periodicity`, authority).
// Audited (Sprint 309/310/311): NO exported formatter accepted the VO
// `periodicity` in the presentation frontier (cadenceMs/computeTarget are
// domain math, frequencyLabel of AlertMonitoringExperience is local/not
// exported) → ONE standard label helper, localized next to this component.
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

export default function UnifiedAlertResourcePresentation({ state, className = '' }) {
  if (state?.present !== true) return null;
  const classes = alertVisualClasses(state.color);
  const schedule = buildScheduleLines(state.events);
  if (schedule.length === 0) return null;

  // Sprint 311 — metadata presentation (Sprint 310 transport): name travels in
  // state.name (envelope.metadata.name) and frequency in state.periodicity.
  // Priority uses the CERTIFIED PRIORITY_VISUALS descriptor (icon + color +
  // label) — the SAME descriptor on all three surfaces; never a new color map.
  const priorityVisual = PRIORITY_VISUALS[state.priority] || PRIORITY_VISUALS.medium;
  const PriorityIconComponent = PRIORITY_ICON_COMPONENTS[state.priority] || PRIORITY_ICON_COMPONENTS.medium;
  const priorityColor = alertVisualClasses(priorityVisual.color);
  const name = typeof state.name === 'string' && state.name.trim() !== '' ? state.name : null;
  const frequency = frequencyLabel(state.periodicity);
  const priorityLabel = state.priorityLabel || priorityVisual.label;

  return (
    <div className={`mt-2 rounded-lg border px-2.5 py-1.5 ${classes.badge} ${className}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityColor.dot}`} aria-hidden="true" />
        <PriorityIconComponent className="w-3.5 h-3.5 shrink-0" />
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
        {schedule.map((line) => (
          <div key={line.day} className="flex flex-wrap items-center gap-x-1">
            <span className="opacity-90">{line.day}</span>
            {line.times.map((t, i) => (
              <span key={`${line.day}:${i}`} className="whitespace-nowrap">
                {i === 0 ? '' : '·'} {t}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
