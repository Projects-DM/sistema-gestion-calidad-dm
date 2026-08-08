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
 */
export function parseAnchor(item) {
  if (!item || typeof item !== 'object') return null;
  const dateLiteral = item.startDate ?? item.start_time ?? null;
  if (!dateLiteral) return null;
  let ms = new Date(dateLiteral).getTime();
  if (Number.isNaN(ms)) return null;
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
 */
export function computeTarget(anchorMs, cadence, nowMs) {
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
 */
export function occurrenceWindowAt(anchorMs, cadence, nowMs) {
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