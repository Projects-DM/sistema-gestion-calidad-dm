/**
 * Sprint 317 — GENERIC FILTER CORE
 *
 * Motor de filtrado genérico, determinista y SIN estado externo.
 * Recibe los registros de entrada, un adaptador (toFields) que expone los
 * atributos filtrables de cada registro, y un criterio. Devuelve un subconjunto
 * de los MISMOOS objetos de entrada, conservando su orden (Array.prototype.filter
 * nunca reordena: el orden devuelto es el orden de la fuente).
 *
 * NO consulta datos, NO persiste, NO muta los registros de entrada.
 */
export function applyFilters(records, toFields, criteria = {}) {
  const quick = criteria.quick;
  const search = String(criteria.search || '').trim().toLowerCase();
  const f = criteria.fields || {};
  return records.filter((record) => {
    const d = toFields(record);
    if (!passesQuick(d, quick)) return false;
    if (search && !d.texto.includes(search)) return false;
    if (f.formulario && d.formulario !== f.formulario) return false;
    if (f.usuario && d.usuario !== f.usuario) return false;
    if (f.estado && d.estado !== f.estado) return false;
    if (f.verificacion && d.verificacion !== f.verificacion) return false;
    if (f.hallazgo && d.hallazgo !== f.hallazgo) return false;
    if (f.desde && d.fechaKey < f.desde) return false;
    if (f.hasta && d.fechaKey > f.hasta) return false;
    return true;
  });
}

export function passesQuick(d, quick) {
  switch (quick) {
    case 'pendientes':
      return d.estado === 'pendiente_revision';
    case 'aprobados':
      return d.estado === 'aprobado';
    case 'rechazados':
      return d.estado === 'rechazado';
    case 'criticos':
      return d.hallazgo === 'critico';
    case 'hoy':
      return d.fechaKey === todayKey();
    default:
      return true;
  }
}

function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateKey(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : localDateKey(date);
}

export function todayKey() {
  return localDateKey(new Date());
}

export function uniqueSorted(values) {
  return [...new Set(values.filter((v) => v != null && v !== ''))].sort();
}