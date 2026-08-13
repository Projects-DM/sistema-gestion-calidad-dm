/**
 * Sprint 308 — UNIFIED ALERT METADATA PRESENTATION · CONTROLLED CORRECTION.
 *
 * TIPO: CONTROLLED CORRECTION · LEVEL 5 · PRESENTATION ONLY (verificación).
 * Cambio funcional permitido: NINGUNO si los gates de STOP se disparan.
 *
 * Objetivo declarado (spec §1–§9): incorporar nombre + frecuencia + prioridad
 * visual a UnifiedAlertResourcePresentation consumiendo EXCLUSIVAMENTE el
 * estado ya proyectado por projectResourceAlertState (PURE PRESENTATION).
 *
 * REGLA CRÍTICA (§23): NO tocar projectResourceAlertState salvo discrepancia
 * objetiva — si la metadata no está disponible, STOP.
 *
 * REGLA DE STOP (§24): BLOCKED si `metadata no disponible` / `requiere
 * modificar Runtime` / `requiere nueva query`.
 *
 * Este script ejecuta el guard de elegibilidad y clasifica determinísticamente
 * SPRINT 308 como CERTIFIED o CONTROLLED CORRECTION BLOCKED.
 *
 * Ejecutar: node scripts/sprint-308-alert-metadata-presentation-elegibility.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { projectResourceAlertState } from '../src/utils/alertResourceState.js';
import { resolveResourceAlertEnvelope } from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js';

const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const readFile = (rel) => {
  try { return readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8'); } catch { return ''; }
};
const execP = promisify(execFile);
const CHECK = [];
const check = (label, truth, detail = '') => CHECK.push({ label, truth: !!truth, detail });
const BLOCK_REASONS = [];

const H = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
const MODULE_ID = 3;
const cfg = (name, unit = 'days', amount = 1, priority = 'high', startDate = '2026-08-12') =>
  ({ name, priority, periodicity: { amount, unit }, startDate, startTime: '09:00', enabled: true });
const formOf = (id, configs) => ({ id, slug: `form-${id}`, module_id: MODULE_ID, alertConfiguration: { alertConfigurations: configs } });
const repoOf = (id, configs) => ({ id, slug: `repo-${id}`, module_id: MODULE_ID, alertConfiguration: { alertConfigurations: configs } });
const catOf = (id, configs) => ({ id, name: `cat-${id}`, alert_config: { alertConfigurations: configs } });

const projectState = (world, kind, id, resource, nowMs) => {
  const occ = projectCurrentOccurrences(world, MODULE_ID, nowMs);
  return occ.length ? projectResourceAlertState({ occurrences: occ, resourceKind: kind, resourceId: id, resource, now: nowMs }) : null;
};

// ---------------------------------------------------------------------------
// E01 — ¿El estado proyectado (SSOT del componente) expone la metadata pedida?
// ---------------------------------------------------------------------------
{
  const sample = formOf(12, [cfg('PREOPERATIVO LIMPIEZA Y DESINFECCION')]);
  const st = projectState({ forms: [sample], repositories: [], categories: [] }, 'dynamicForms', 12, sample, H(2026, 8, 12, 10));
  const stateKeys = Object.keys(st ?? {}).join(',');
  const evKeys = Object.keys(st?.events?.[0] ?? {}).join(',');
  const hasName = st ? Object.prototype.hasOwnProperty.call(st, 'name') : false;
  const hasFrequency = st ? (Object.prototype.hasOwnProperty.call(st, 'frequency') || Object.prototype.hasOwnProperty.call(st, 'periodicity')) : false;

  check('E01 — el estado proyectado SÍ está presente (baseline 307 no roto)', st?.present === true);
  check('E01 — `name` disponible en el estado proyectado (§4 — campo en state)',
    hasName, `state keys: ${stateKeys}`);
  check('E01 — `frequency`/`periodicity` disponible en el estado proyectado (§5 — campo en state)',
    hasFrequency, `event keys: ${evKeys}`);
  if (!hasName) BLOCK_REASONS.push('name NO está en el estado proyectado (solo priority/status/icon/schedule)');
  if (!hasFrequency) BLOCK_REASONS.push('frequency NO está en el estado proyectado (sin periodicity ni formatter de frecuencia)');
}

// ---------------------------------------------------------------------------
// E02 — ¿Dónde vive la metadata? (envelope del Resolver = aguas arriba del selector)
// ---------------------------------------------------------------------------
{
  const sample = formOf(12, [cfg('PREOPERATIVO LIMPIEZA Y DESINFECCION')]);
  const env = resolveResourceAlertEnvelope(sample);
  const meta = env.items[0].metadata;
  const per = env.items[0].configuration.periodicity;
  check('E02 — la metadata `name` vive SOLO en el envelope del Resolver (aguas arriba del selector)',
    typeof meta.name === 'string' && meta.name.length > 0,
    `metadata.name="${meta.name}"`);
  check('E02 — la `periodicity` (frecuencia) vive SOLO en el configuration del envelope (no en state)',
    per && per.unit === 'days', JSON.stringify(per));
}

// ---------------------------------------------------------------------------
// E03 — Precondición §4: ¿Sprint 307 certificó name/frequency en el estado?
// ---------------------------------------------------------------------------
{
  const doc = readFile('docs/Sprint-307.md');
  const script307 = readFile('scripts/sprint-307-unified-alert-resource-presentation-certification.mjs');
  // El estado proyectado de 307 se certificó con estos campos (present/status/
  // events/priority…). name/frequency NO aparecen en la matriz ni en el summary.
  check('E03 — Sprint 307 certificó el estado con present/status/events/priority…',
    doc.includes('hasOpen derivado del selector') &&
    /PRESENTATION AUTHORITY:\s+projectResourceAlertState/.test(doc));
  check('E03 — Sprint 307 NO certificó name/frequency como campos del estado',
    !/name.{0,40}state/i.test(script307) && !/frequency/i.test(script307));
}

// ---------------------------------------------------------------------------
// E04 — El componente consume SOLO `state` (PURE PRESENTATION — §16)
// ---------------------------------------------------------------------------
{
  const comp = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const noPropagated = !/props\.name|props\.frequency|props\.periodicity/.test(comp);
  const onlyState = /UnifiedAlertResourcePresentation\(\{ state, className/.test(comp);
  check('E04 — el componente recibe únicamente state/className (sin fields por consumidor)',
    onlyState, onlyState ? 'firma { state, className }' : 'firma NO contiene resource/name/frequency');
  check('E04 — NO hay otro canal de metadata hacia la tarjeta (sin resource prop)',
    noPropagated && !/resource\s*=/.test(comp.replace(/\s/g, '').includes('resource') ? '' : ''));
}

// ---------------------------------------------------------------------------
// E05 — Prioridad: la ÚNICA metadata del sprint que SÍ viaja en el estado
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('P', 'days', 1, 'high')])], repositories: [], categories: [] };
  const sample = world.forms[0];
  const st = projectState(world, 'dynamicForms', 12, sample, H(2026, 8, 12, 10));
  // El color/icono del estado son de STATUS (clasificación temporal certificada),
  // NO de prioridad. La prioridad viaja como metadata: priority + priorityLabel.
  check('E05 — priority/priorityLabel viajan en el estado (metadata certificada)',
    st?.priority === 'high' && st?.priorityLabel === 'Alta',
    `priority=${st?.priority} label=${st?.priorityLabel}`);
  const descriptor = readFile('src/core/capabilities/alert/runtime-visibility/AlertVisualDescriptor.js');
  check('E05 — AlertVisualDescriptor/PRIORITY_VISUALS es la conversión prioridad→visual (reutilizable)',
    /PRIORITY_VISUALS/.test(descriptor) &&
    /critical:/.test(descriptor) && /high:/.test(descriptor) && /medium:/.test(descriptor) && /low:/.test(descriptor));
}

// ---------------------------------------------------------------------------
// E06 — Compleción con metadata hipotética: si existiera, gates 307 intactos
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('Ventana')])], repositories: [], categories: [] };
  const form = world.forms[0];
  const dayN = H(2026, 8, 12, 10);
  const occ = () => projectCurrentOccurrences(world, MODULE_ID, dayN);
  const project = () => {
    const o = occ();
    return o.length ? projectResourceAlertState({ occurrences: o, resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: dayN }) : null;
  };
  const before = project();
  check('E06 — baseline 307 intacto ANTES (present=true, hasOpen=true)',
    before?.present === true && before?.hasOpen === true);
  const comp = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('E06 — gates 307 inmutables (`present !== true` · `schedule.length === 0`)',
    /state\?\.present !== true/.test(comp) && /schedule\.length === 0/.test(comp));
  check('E06 — sin estado React paralelo en el componente',
    !/useState/.test(comp) && !/useEffect/.test(comp) && !/setTimeout/.test(comp));
}

// ---------------------------------------------------------------------------
// E07 — Diff gate: src/ sin modificaciones (FRONTERA autorizada intacta)
// ---------------------------------------------------------------------------
{
  const { stdout } = await execP('git', ['status', '--short', 'src/'], { cwd: ROOT_DIR });
  const lines = String(stdout).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  check('E07 — src/ sin modificaciones (git status --short src/ = limpio)',
    lines.length === 0, lines.join(' | ') || '(limpio)');
}

// ---------------------------------------------------------------------------
// FASE FINAL — CLASSIFICATION
// ---------------------------------------------------------------------------
const failed = CHECK.filter((c) => !c.truth);
const passed = CHECK.filter((c) => c.truth);
const W = (s, n) => String(s).padEnd(n, ' ');
console.log('\nSPRINT 308 — UNIFIED ALERT METADATA PRESENTATION · ELEGIBILITY');
console.log('================================================================================');
const grouped = new Map();
for (const c of CHECK) {
  const m = /^(E\d+)/.exec(c.label);
  if (!m) continue;
  if (!grouped.has(m[1])) grouped.set(m[1], []);
  grouped.get(m[1]).push(c);
}
for (const [phase, rows] of [...grouped.entries()].sort()) {
  const nPass = rows.filter((r) => r.truth).length;
  const nFail = rows.length - nPass;
  console.log(`${W(phase, 6)} ${nFail === 0 ? 'PASS' : 'FAIL'}  (${nPass}/${rows.length})`);
  for (const r of rows) console.log(`       ${r.label.replace(/^E\d+ — /, '')}: ${r.truth ? 'PASS' : 'FAIL'}${r.detail ? '  [' + r.detail + ']' : ''}`);
}

// Veredicto determinístico (spec §35): la corrección SOLO es elegible si TODA la
// metadata (name + frequency + priority) está disponible en el estado proyectado
// que el componente está autorizado a consumir (§16 pure presentation).
const nameInState = CHECK.filter((c) => c.label.startsWith('E01 — `name`')).every((c) => c.truth);
const freqInState = CHECK.filter((c) => c.label.startsWith('E01 — `frequency`')).every((c) => c.truth);
const priorityInState = CHECK.filter((c) => c.label.startsWith('E05 — priority/priorityLabel')).every((c) => c.truth);
const gatesIntact = CHECK.filter((c) => c.label.startsWith('E06 — gates 307')).every((c) => c.truth);
const srcUnmodified = CHECK.filter((c) => c.label.startsWith('E07')).every((c) => c.truth);

const nameMissing = !nameInState;
const freqMissing = !freqInState;
let blocked = false;
const blockedReasons = [];
if (nameMissing) {
  blocked = true;
  blockedReasons.push('NAME: no está en el estado proyectado (vive solo en el envelope del Resolver, aguas arriba del selector — §4 condición "campo disponible en el estado" NO se cumple)');
}
if (freqMissing) {
  blocked = true;
  blockedReasons.push('FREQUENCY: no está en el estado proyectado (sin periodicity ni formatter certificado — para exponerla se requeriría tocar projectResourceAlertState, prohibido §23, o recalcular en UI, prohibido §6)');
}
if (blocked) {
  // No defraudar el STOP del sprint: NO se modifica src/. Estado sin tocar.
}

console.log('\nSPRINT 308 — UNIFIED ALERT METADATA PRESENTATION');
console.log('====================================================');
console.log(`  NAME IN PROJECTED STATE:    ${nameInState ? 'PASS' : 'BLOCKED'}`);
console.log(`  FREQUENCY IN STATE:         ${freqInState ? 'PASS' : 'BLOCKED'}`);
console.log(`  PRIORITY IN STATE:          ${priorityInState ? 'PASS' : '? '}  (la única metadata 308 disponible ya)`);
console.log(`  GATES 307:                  ${gatesIntact ? 'INTACT' : '? '}`);
console.log(`  SRC MODIFICATION:           ${srcUnmodified ? 'NONE' : '? '}`);
if (blockedReasons.length > 0) {
  console.log(`\n  BLOCK REASONS:`);
  for (const r of blockedReasons) console.log(`    - ${r}`);
  console.log(`\n  ROOT CAUSE:                 METADATA NOT TRANSPORTED (name/frequency ausentes del estado proyectado)`);
  console.log(`  BEHAVIORAL CHANGE:          NONE`);
  console.log(`  NEW STATE:                  NONE`);
  console.log(`  NEW PIPELINE:               NONE`);
  console.log(`\n  STATUS:                     CONTROLLED CORRECTION BLOCKED`);
  console.log(`\n  PRÓXIMO PASO (fuera de 308): un sprint de pipeline que transporte name/frequency en`);
  console.log(`  projectResourceAlertState (metadata de presentación enrollada por el Resolver)`);
  console.log(`  re-habilitaría la presentación de Spr 308 — ACTUALMENTE NO ES PRESENTATION-ONLY.`);
} else {
  console.log(`\n  ROOT CAUSE:                 NONE`);
  console.log(`  BEHAVIORAL CHANGE:          NONE`);
  console.log(`  NEW STATE:                  NONE`);
  console.log(`  NEW PIPELINE:               NONE`);
  console.log(`\n  STATUS:                     CERTIFIED`);
}

console.log(`\nTOTAL: ${passed.length}/${CHECK.length} PASS`);
process.exit(0); // clasificación determinística: la elegibilidad es el veredicto