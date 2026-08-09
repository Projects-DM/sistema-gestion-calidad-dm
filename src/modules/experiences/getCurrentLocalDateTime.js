/**
 * getCurrentLocalDateTime — PRESENTATION-ONLY local-clock helper (Sprint 259).
 *
 * Provides the "Nueva alerta" temporal defaults from the BROWSER's LOCAL clock
 * (never UTC). Format contract:
 *
 *   startDate → 'YYYY-MM-DD'  (renders correctly in <input type="date">)
 *   startTime → 'HH:mm'       (renders correctly in <input type="time">)
 *
 * Explicitly NOT allowed: new Date().toISOString().slice(0,10) — UTC drift at
 * midnight, and any 'HH:mm:ss(.sssZ)' forms.
 *
 * BELONGS to the presentation layer exclusively. It does NOT belong to core,
 * OccurrenceSchedule, AlertConfiguration, the Runtime nor the Resolver.
 * It never persists anything; persistence stays in the existing save pipeline.
 *
 * `now` is injectable for deterministic tests only; production uses `new Date()`.
 */
export function getCurrentLocalDateTime(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError('getCurrentLocalDateTime: expected a valid Date');
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return {
    startDate: `${year}-${month}-${day}`,
    startTime: `${hours}:${minutes}`,
  };
}

export default getCurrentLocalDateTime;