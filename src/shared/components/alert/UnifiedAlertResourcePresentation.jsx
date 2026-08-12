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

// Static icon map resolved once at module scope (Sprint 286 F8 pattern): no
// resolveAlertIcon call during render → the block never creates components
// while rendering. Sprint 295: `disabled` is intentionally ABSENT — the
// certified selector (projectResourceAlertState) never produces that status.
const STATE_ICON_COMPONENTS = Object.freeze({
  overdue: resolveAlertIcon('AlertTriangle'),
  today: resolveAlertIcon('Clock'),
  upcoming: resolveAlertIcon('Calendar'),
  active: resolveAlertIcon('CheckCircle2'),
  completed: resolveAlertIcon('CheckCircle'),
  cancelled: resolveAlertIcon('AlertOctagon'),
  fallback: resolveAlertIcon('Bell'),
});

export default function UnifiedAlertResourcePresentation({ state, className = '' }) {
  if (state?.present !== true) return null;
  const classes = alertVisualClasses(state.color);
  const IconComponent = STATE_ICON_COMPONENTS[state.status] || STATE_ICON_COMPONENTS.fallback;
  const schedule = buildScheduleLines(state.events);
  if (schedule.length === 0) return null;
  return (
    <div className={`mt-2 rounded-lg border px-2.5 py-1.5 ${classes.badge} ${className}`}>
      <div className="flex items-center gap-1.5">
        <IconComponent className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[11px] font-bold leading-tight">Alerta operacional</span>
      </div>
      <div className="mt-0.5 pl-5 space-y-0.5 text-[11px] leading-tight font-semibold">
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
