/**
 * OccurrenceSchedule
 *
 * Sprint 257 — THE domain scheduling contract (DEC-256-10: scheduling is
 * REUSED, never duplicated).
 *
 * This module is the elevation of the scheduled projection that previously
 * lived only inside AlertMonitoringExperience (Sprint 237, presentation-only).
 * `parseAnchor` and `computeTarget` keep their certified semantics; the
 * presentation layer imports them from HERE so there is a single algorithm.
 *
 * Calendar-agnostic, timezone-explicit via `timezoneHint`. The window uses an
 * explicit **[start, start + cadence)** boundary (exclusive end) to avoid the
 * `23:59:59`-style boundary artefacts (dec-design, section 8.2).
 *
 * Sprint 298 — CALENDAR-AWARE RECURRENCE (controlled architectural extension,
 * LEVEL 5). The certified `cadenceMs`/`occurrenceWindowAt`/`computeTarget`
 * keep their EXACT ms-linear semantics when called with a numeric cadence (the
 * legacy contract, still used by hour/day/week and by every prior suite). The
 * SAME functions now also accept a RICH PERIODICITY
 * (`{ amount, unit }` with `unit: 'months' | 'years'`) and switch to true
 * CALENDAR arithmetic — the ONLY supported extension point for months/years.
 *
 *   - MONTHS: occurrence starts are add-N-calendar-months from the anchor,
 *     preserving the anchored day-of-month (POLICY CAL-001: when the target
 *     month has no such day — e.g. 31 Jan → Feb, 30 Apr → Feb never — the
 *     occurrence degrades to the LAST valid day of the target month). Never a
 *     fixed 30-day approximation.
 *   - YEARS: occurrence starts are add-N-calendar-years, preserving the
 *     anchored month+day (POLICY CAL-001 also covers 29 Feb → non-leap year =
 *     last valid day 28 Feb). NEVER a fixed 365-day approximation (leap years).
 *
 * This keeps ONE recurrence engine in ONE module: no AnnualAlertService /
 * MonthlyAlertService / second scheduler are ever introduced, and the next
 * occurrence remains DERIVED (never persisted).
 */

export const UNIT_MS = Object.freeze({
  hours: 3.6e6,
  days: 8.64e7,
  weeks: 6.048e8,
  months: 2.592e9,
  years: 3.1536e10,
});

/**
 * Parses the persisted start metadata (startDate + startTime) into an anchor
 * ms. Pure; never mutates, never reads storage keys beyond the raw envelope.
 *
 * Sprint 298 — CAL386: a PURE date literal (`YYYY-MM-DD`) is an intended LOCAL
 * calendar date (the date input the user selects). The previous `new Date()`
 * parsing treated date-only strings as UTC midnight, which silently shifted the
 * anchor one day back in UTC-negative zones (e.g. 15/08 → 14/08 08:00 local),
 * breaking calendar recurrence (leap days / month-ends). It is now assembled in
 * LOCAL time; other date literals (RFC, with time) keep the previous behavior.
 */
export function parseAnchor(item) {
  if (!item || typeof item !== 'object') return null;
  const dateLiteral = item.startDate ?? item.start_time ?? null;
  if (!dateLiteral) return null;
  let ms = localDateOnlyMs(String(dateLiteral));
  if (ms === null) {
    const legacy = new Date(dateLiteral).getTime();
    ms = Number.isNaN(legacy) ? null : legacy;
  }
  if (ms === null) return null;
  const time = item.startTime ?? item.start_time ?? null;
  if (time) {
    const m = String(time).match(/(\d{1,2}):(\d{2})/);
    if (m) {
      const d = new Date(ms);
      d.setHours(Number(m[1]) || 0, Number(m[2]) || 0, 0, 0);
      ms = d.getTime();
    }
  }
  return ms;
}

/**
 * Assembles `YYYY-MM-DD` in LOCAL time (midnight local). Returns null for any
 * other shape so callers can fall back to the legacy parse.
 */
function localDateOnlyMs(literal) {
  const m = literal.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Cadence (period) in ms from a `{ amount, unit }` periodicity model, or 0
 * for a single 'once' event. Same semantics as the certified cadence.
 */
export function cadenceMs(periodicity) {
  if (periodicity === 'once') return 0;
  if (!periodicity || typeof periodicity !== 'object') return null;
  const unit = UNIT_MS[periodicity.unit];
  const amount = Number(periodicity.amount) || 1;
  return unit ? amount * unit : null;
}

/**
 * Next target of a recurring schedule: anchor + ceil((now-anchor)/cadence)*cadence.
 * Single (once) events return the anchor itself.
 *
 * Sprint 298 — the second argument is EITHER a numeric cadence (legacy,
 * ms-linear semantics, unchanged) OR a rich periodicity `{ amount, unit }`
 * (calendar-aware when `unit` is months/years).
 */
export function computeTarget(anchorMs, periodicityOrCadence, nowMs) {
  const calendar = calendarPeriod(periodicityOrCadence);
  if (calendar) return calendarComputeTarget(anchorMs, calendar, nowMs);
  const cadence = typeof periodicityOrCadence === 'number' ? periodicityOrCadence : cadenceMs(periodicityOrCadence);
  if (anchorMs === null || Number.isNaN(anchorMs)) return null;
  if (cadence === null || cadence === 0) return anchorMs;
  if (nowMs <= anchorMs) return anchorMs;
  const occurrences = Math.ceil((nowMs - anchorMs) / cadence);
  return anchorMs + occurrences * cadence;
}

/**
 * The CURRENT occurrence window [startsAt, dueAt) at `now`.
 *
 *   sequence N (>=1) ; startsAt = anchor + (N-1)*cadence ; dueAt = startsAt + cadence
 *
 * Boundario: dueAt EXCLUSIVE (a daily 07/08 window ends at 08/08 00:00, never
 * at 23:59:59). The decision remains explicit for future implementation.
 *
 * Sprint 298 — the SECOND argument is EITHER a numeric cadence (legacy ms
 * semantics, unchanged) OR a rich periodicity `{ amount, unit }` (calendar-
 * aware when `unit` is months/years — the only calendar-capable path).
 */
export function occurrenceWindowAt(anchorMs, periodicityOrCadence, nowMs) {
  const calendar = calendarPeriod(periodicityOrCadence);
  if (calendar) return calendarSequenceWindow(anchorMs, calendar, nowMs);
  const cadence = typeof periodicityOrCadence === 'number' ? periodicityOrCadence : cadenceMs(periodicityOrCadence);
  if (anchorMs === null || Number.isNaN(anchorMs)) return null;
  if (cadence === null || cadence === 0) {
    return { sequence: 1, startsAt: anchorMs, dueAt: anchorMs };
  }
  if (nowMs <= anchorMs) {
    return { sequence: 1, startsAt: anchorMs, dueAt: anchorMs + cadence };
  }
  const sequence = Math.floor((nowMs - anchorMs) / cadence) + 1;
  const startsAt = anchorMs + (sequence - 1) * cadence;
  return { sequence, startsAt, dueAt: startsAt + cadence };
}

// ===========================================================================
// Sprint 298 — CALENDAR-AWARE RECURRENCE (months / years).
// The ONLY periodicity units that REQUIRE calendar math are months and years.
// Everything else keeps the certified ms-linear path above.
// ===========================================================================

const CALENDAR_CAPABLE_UNITS = Object.freeze(['months', 'years']);

function calendarPeriod(periodicity) {
  if (
    periodicity &&
    typeof periodicity === 'object' &&
    !Array.isArray(periodicity) &&
    CALENDAR_CAPABLE_UNITS.includes(periodicity.unit)
  ) {
    const amount = Number(periodicity.amount) || 1;
    return amount > 0 ? { amount, unit: periodicity.unit } : null;
  }
  return null;
}

function partsOf(ms) {
  const d = new Date(ms);
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), hours: d.getHours(), minutes: d.getMinutes() };
}

function lastValidDay(year, month) {
  // month 0..11 ; day 0 = last day of `month`.
  return new Date(year, month + 1, 0).getDate();
}

/**
 * POLICY CAL-001 — day-of-month saturation (last valid day). Adds `months`
 * calendar months to the anchor instant, PRESERVING the anchored day;
 * when the target month has no such day, the result lands on the month's LAST
 * valid day (31 Jan → 28/29 Feb; never a silent overflow into the next month).
 * The anchor's time-of-day (hours/minutes) is preserved. Pure; exported for
 * direct policy certification.
 */
export function calendarAddMonths(anchorMs, months) {
  if (anchorMs === null || Number.isNaN(anchorMs)) return null;
  const p = partsOf(anchorMs);
  const base = new Date(p.year, p.month + months, 1, p.hours, p.minutes, 0, 0);
  base.setDate(Math.min(p.day, lastValidDay(base.getFullYear(), base.getMonth())));
  return base.getTime();
}

/**
 * POLICY CAL-001 — day-of-month saturation applied to years. Adds `years`
 * calendar years preserving the anchored month+day (29 Feb → last valid day of
 * the non-leap February = 28 Feb). Never a 365-day approximation.
 */
export function calendarAddYears(anchorMs, years) {
  if (anchorMs === null || Number.isNaN(anchorMs)) return null;
  const p = partsOf(anchorMs);
  const base = new Date(p.year + years, p.month, 1, p.hours, p.minutes, 0, 0);
  base.setDate(Math.min(p.day, lastValidDay(base.getFullYear(), base.getMonth())));
  return base.getTime();
}

function calendarStart(anchorMs, { amount, unit }, offset) {
  return unit === 'years'
    ? calendarAddYears(anchorMs, offset * amount)
    : calendarAddMonths(anchorMs, offset * amount);
}

/**
 * The CURRENT calendar window at `now`: [startsAt(N), startsAt(N+1)) where N is
 * the occurrence whose anchor-derived start is the latest not-after `now`.
 * Exactly ONE window per configuration — the anchor remains the authority and
 * the next start is always DERIVED (never persisted). ACTION at any instant
 * inside [startsAt(N), startsAt(N+1)) completes occurrence N (Sprint 12/11/13).
 */
function calendarSequenceWindow(anchorMs, period, nowMs) {
  if (anchorMs === null || Number.isNaN(anchorMs)) return null;
  if (nowMs < anchorMs) {
    return { sequence: 1, startsAt: anchorMs, dueAt: calendarStart(anchorMs, period, 1) };
  }
  let N = calendarElapsedPeriods(anchorMs, period, nowMs) + 1;
  // Clamping may push a start later than the naive calendar date: walk back
  // while the window start is still in the future, then walk forward while the
  // NEXT start has already passed. Both loops are bounded (starts are
  // strictly monotonic; clamping shifts by at most a few days).
  while (N > 1 && calendarStart(anchorMs, period, N - 1) > nowMs) N -= 1;
  while (calendarStart(anchorMs, period, N) <= nowMs) N += 1;
  return { sequence: N, startsAt: calendarStart(anchorMs, period, N - 1), dueAt: calendarStart(anchorMs, period, N) };
}

function calendarElapsedPeriods(anchorMs, period, nowMs) {
  const a = partsOf(anchorMs);
  const n = partsOf(nowMs);
  if (period.unit === 'years') return Math.floor((n.year - a.year) / period.amount);
  const totalMonths = (n.year - a.year) * 12 + (n.month - a.month);
  return Math.floor(totalMonths / period.amount);
}

/**
 * Next DERIVED occurrence of a calendar schedule: the start of the occurrence
 * following the one containing `now`. Recurrence is never stored.
 */
function calendarComputeTarget(anchorMs, period, nowMs) {
  if (anchorMs === null || Number.isNaN(anchorMs)) return null;
  if (nowMs < anchorMs) return anchorMs;
  const { sequence } = calendarSequenceWindow(anchorMs, period, nowMs);
  return calendarStart(anchorMs, period, sequence);
}