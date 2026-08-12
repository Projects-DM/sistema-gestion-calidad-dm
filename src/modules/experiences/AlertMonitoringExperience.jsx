import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAlertRuntime } from '../../hooks/useAlertRuntime';
import { alertVisualClasses, resolveAlertIcon } from '../../utils/alertVisual';
import { resolveActionRoute } from '../../core/navigation/ExistingModuleRouteResolver.js';
// Sprint 285 — F3. CONSUMPTION BOUNDARY. The Resolver SSOT is used ONLY for
// ENRICHMENT (presentation metadata: name/description → title, priority,
// channel, frequency, enabled). Identity, schedule and completion come from
// the projected occurrences (useAlertRuntime.occurrences) — never rebuilt here.
import { resolveResourceAlertEnvelope } from '../../core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js';
// Sprint 285 — F3. Schedule imports REMOVED (Gate C): parseAnchor/cadenceMs/
// computeTarget/occurrenceWindowAt were the presentation's own re-derivation.
// The projected occurrence already carries the certified [startsAt, dueAt)
// window. UNIT_MS is kept ONLY for the periodicity unit label mapping.
import { UNIT_MS } from '../../core/capabilities/alert/occurrence/OccurrenceSchedule.js';
// Sprint 285 — F3. OccurrenceLedger import REMOVED: completion is consumed from
// the projected `occurrence.completion.signalKey` (F9) — never re-queried by
// the presentation layer.
// Sprint 265 — THE domain classifier becomes the UI classification. The card
// classifies the PROJECTED occurrence with the certified
// OccurrenceLifecycle.classifyOccurrence (window + completion precedence) and
// maps the derived key to a human label/color ONLY (mandate §13/§14).
import { classifyOccurrence } from '../../core/capabilities/alert/occurrence/OccurrenceLifecycle.js';

/**
 * AlertMonitoringExperience
 *
 * Sprint 187 — Operational Navigation Consolidation.
 * Sprint 188 — Route Resolution & Existing Navigation Binding Certification.
 * Sprint 189 — Context Navigation Decoupling.
 * Sprint 285 — F3. REAL RESOURCE CONSUMPTION (Observation/Prioritization layer).
 *
 * This experience is the OPERATIONAL ALERT MONITORING view. It consumes
 * EXCLUSIVELY the OCCURRENCES ALREADY PROJECTED over the real operational
 * resources (useAlertRuntime.occurrences → OccurrenceProjection) plus the raw
 * resource snapshot (`existing`) for visual enrichment. It is NOT a resource
 * management layer and NEVER a second record system:
 *
 *   - It CAN order, classify, show status/expiration/priority/completion and
 *     open the REAL resource.
 *   - It CANNOT create/duplicate records, manage forms/repositories, define
 *     identity, persist completion or build its own routes.
 *
 * The Action Descriptor (open-form / open-record / go-to-document) is
 * the ONLY navigation intent the UI consumes. This component NEVER
 * creates navigation logic, NEVER calculates routes, NEVER consults
 * Runtime directly, NEVER opens Alert Monitoring again, NEVER
 * administers CRUD. Navigation targets the REAL resource using the
 * resourceId already carried by the projected occurrence.
 *
 * Since Sprint 188 the UI does NOT build routes (`/modulo/${slug}` is
 * forbidden). Every action asks the ExistingModuleRouteResolver for the
 * `canonicalRoute` derived from the routes ACTUALLY registered in the
 * certified Router (src/App.jsx). This eliminates any dependency on
 * assumed routes and the "No routes matched location /modulo/calidad"
 * error.
 *
 * Documents NEVER open directly. "Ir al documento" navigates to the
 * existing Document Repository (tab) carrying a **navigationContext**
 * in location.state: the Repository locates the document, scrolls to it
 * and highlights it TEMPORARILY — it is NEVER left selected.
 */

const STATUS_VISUAL = Object.freeze({
  overdue: Object.freeze({ label: 'Vencida', color: 'red' }),
  today: Object.freeze({ label: 'Hoy', color: 'orange' }),
  upcoming: Object.freeze({ label: 'Próxima', color: 'yellow' }),
  active: Object.freeze({ label: 'Activa', color: 'green' }),
  completed: Object.freeze({ label: 'Cumplida', color: 'emerald' }),
  disabled: Object.freeze({ label: 'Deshabilitada', color: 'gray' }),
});
// Sprint 240 — certified iconography per operational status.
// Sprint 257 — `completed` bucket (OCC-CERT-24): occurrences confirmed by a
// semantically-final operational signal on the RESOURCE (not by configuration).
const STATUS_ICON = Object.freeze({
  overdue: 'AlertTriangle',
  today: 'Clock',
  upcoming: 'Calendar',
  active: 'CheckCircle2',
  completed: 'CheckCircle',
  disabled: 'Bell',
});
// Sprint 240 — operational hierarchy: Vencidas → Hoy → Próximas → Activas → Deshabilitadas.
// Sprint 257 — Cumplidas is appended ONLY at consumption time (groups builder),
// keeping this certified literal intact: completed is persisted, temporal states
// derive from remainingMs, and a completed occurrence never registers as Vencida.
const STATUS_HIERARCHY = Object.freeze(['overdue', 'today', 'upcoming', 'active', 'disabled']);
const STATUS_GROUP_LABELS = Object.freeze({
  overdue: 'Vencidas',
  today: 'Hoy',
  upcoming: 'Próximas',
  active: 'Activas',
  disabled: 'Deshabilitadas',
  completed: 'Cumplidas',
});
const PRIORITY_LABELS = Object.freeze({ low: 'Baja', medium: 'Media', high: 'Alta' });
const CHANNEL_LABELS = Object.freeze({ email: 'Email', 'in-app': 'Sistema', push: 'Push', bluetooth: 'Bluetooth', whatsapp: 'WhatsApp' });
const MONTHS = Object.freeze(['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']);

// Sprint 286 — F8. STATIC ICON COMPONENTS. The icon component is resolved ONCE
// at module scope (referencing lucide via the certified resolveAlertIcon helper)
// and indexed by status key at render. resolveAlertIcon is never invoked during
// render, closing the pre-existing react-hooks/static-components warning from
// Sprint 284 (AC-22). Pure presentation; identity/runtime/completion untouched.
const CARD_ICON_COMPONENTS = Object.freeze({
  overdue: resolveAlertIcon('AlertTriangle'),
  today: resolveAlertIcon('Clock'),
  upcoming: resolveAlertIcon('Calendar'),
  active: resolveAlertIcon('CheckCircle2'),
  completed: resolveAlertIcon('CheckCircle'),
  disabled: resolveAlertIcon('Bell'),
  cancelled: resolveAlertIcon('AlertOctagon'),
  fallback: resolveAlertIcon('AlertOctagon'),
});

/**
 * Sprint 237 — OPERATIONAL TEMPORAL VIEWMODEL (read-only, never persisted,
 * never consumed by the Alert Engine). Builds, from the PERSISTED metadata of
 * each alert, the real temporal state: anchor (startDate + startTime), target,
 * remaining milliseconds, next execution, relative remaining/overdue text and a
 * chronological sort date. All logic is presentation-only; no cronómetros,
 * no schedulers, no engines. The projection merely computes; the UI consumes.
 *
 * Sprint 257 — scheduling algorithm moved UP to the occurrence domain
 * (OccurrenceSchedule.js). Gate C mandates ONE source.
 *
 * Sprint 285 — F3. the temporal ViewModel is now a PURE presentation of the
 * PROJECTED occurrences: the window (startsAt/dueAt) and remaining/overdue
 * text derive ONLY from the occurrence the projection already computed. The
 * schedule helpers (parseAnchor/cadenceMs/computeTarget/occurrenceWindowAt)
 * are no longer imported here — the projection owns them. humanDuration /
 * formattedExecution / frequencyLabel / channelLabel remain label-only.
 */

function humanDuration(milliseconds) {
  let v = Math.abs(milliseconds) / 1000;
  if (v < 60) return 'menos de un minuto';
  let minutes = v / 60;
  if (minutes < 60) return `${Math.round(minutes)} minuto${Math.round(minutes) === 1 ? '' : 's'}`;
  let hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours)} hora${Math.round(hours) === 1 ? '' : 's'}`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)} día${Math.round(days) === 1 ? '' : 's'}`;
  const months = days / 30;
  if (months < 12) return `${Math.round(months)} mes${Math.round(months) === 1 ? '' : 'es'}`;
  return `${Math.round(days / 365)} año${Math.round(days / 365) === 1 ? '' : 's'}`;
}

function formattedExecution(targetMs) {
  if (targetMs === null || Number.isNaN(targetMs)) return null;
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

function frequencyLabel(periodicity) {
  if (periodicity === 'once') return 'Una sola vez';
  if (!periodicity || typeof periodicity !== 'object') return 'Sin frecuencia';
  const a = Number(periodicity.amount) || 1;
  const u = UNIT_MS_LABEL(periodicity.unit);
  return `Cada ${a} ${u}${a === 1 ? '' : 's'}`;
}
function UNIT_MS_LABEL(unit) {
  return UNIT_MS[unit] ? { hours: 'hora', days: 'día', weeks: 'semana', months: 'mes', years: 'año' }[unit] : unit || 'día';
}

function channelLabel(cfg) {
  const ch = cfg?.notification?.channel;
  if (!ch) return null;
  return CHANNEL_LABELS[ch] || ch;
}

/**
 * Sprint 285 — F3. CLASSIFICATION. The card classifies the PROJECTED
 * occurrence with the certified domain classifier (OccurrenceLifecycle.
 * classifyOccurrence: window [startsAt, dueAt) + completion precedence).
 * The completion already travels in the projection (`occurrence.completion`,
 * OCC-CERT-12, F9); the presentation NEVER re-derives it and NEVER queries the
 * ledger. `enabled === false` keeps the DISABLED presentation bucket, but only
 * when the occurrence is NOT fulfilled (OCC-CERT-08).
 */
function classifyConsumedOccurrence(occurrence, enabled, nowMs) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const domain = classifyOccurrence(occurrence, now);
  if (domain.key === 'completed') {
    return { key: 'completed', label: STATUS_VISUAL.completed.label, color: STATUS_VISUAL.completed.color };
  }
  if (domain.key === 'cancelled') {
    return { key: 'cancelled', label: 'Cancelada', color: 'gray' };
  }
  if (enabled === false) {
    return { key: 'disabled', label: STATUS_VISUAL.disabled.label, color: STATUS_VISUAL.disabled.color };
  }
  const visual = STATUS_VISUAL[domain.key] || STATUS_VISUAL.active;
  return { key: domain.key, label: visual.label, color: visual.color };
}

/**
 * Sprint 285 — F3. REAL RESOURCE CONSUMPTION.
 *
 * The card is a PURE CONSUMER of the occurrences ALREADY projected by
 * OccurrenceProjection (useAlertRuntime.occurrences). It consumes the identity
 * the projection produced (alertId / occurrenceId / signalKey — Sprint 284 F1,
 * Sprint 280 F9) and the certified window (startsAt / dueAt) WITHOUT
 * reconstructing resources, alertIds, schedules or completions. Metadata
 * (título, prioridad, canal, frecuencia, habilitado) is ENRICHED from the REAL
 * resource located in `existing` via the Resolver SSOT envelope (DEC-263);
 * metadata ≠ identity, and it never becomes a new SSOT.
 */
function projectConsumedCards(occurrences, existing, nowMs) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const out = [];
  if (!Array.isArray(occurrences)) return out;
  for (const occurrence of occurrences) {
    if (!occurrence || typeof occurrence !== 'object') continue;
    const isForm = occurrence.resourceKind === 'dynamicForms';
    const sourceKey = isForm ? 'forms' : 'repositories';
    // Enrichment ONLY: locate the REAL resource by the projected resourceId.
    const resource = (Array.isArray(existing?.[sourceKey]) ? existing[sourceKey] : [])
      .find((r) => String(r?.id ?? r?.slug ?? '') === String(occurrence.resourceId ?? '')) || null;
    // Enrichment via the Resolver envelope: match the canonical alertId.
    let cfg = null;
    let meta = null;
    if (resource) {
      try {
        const envelope = resolveResourceAlertEnvelope(resource);
        const item = (envelope?.items ?? []).find((it) => it?.alertId === occurrence.alertId) ?? null;
        cfg = item?.configuration ?? null;
        meta = item?.metadata ?? null;
      } catch {
        // enrichment failure must not drop the projected occurrence
      }
    }
    const enabled = cfg?.enabled !== false;
    const state = classifyConsumedOccurrence(occurrence, enabled, now);

    const dueMs = occurrence.dueAt ?? occurrence.startsAt ?? null;
    const remainingMs = dueMs === null ? null : dueMs - now;
    const priority = cfg?.priority || 'medium';
    const channel = channelLabel(cfg);
    out.push({
      id: occurrence.occurrenceId ?? `${occurrence.alertId}:${sourceKey}`,
      alertId: occurrence.alertId,
      occurrenceId: occurrence.occurrenceId,
      signalKey: occurrence.completion?.signalKey ?? null,
      remainingMs,
      sortDate: remainingMs ?? Number.MAX_SAFE_INTEGER,
      title: meta?.description || meta?.name || (cfg?.periodicity === 'once' ? 'Una sola vez' : 'Alerta'),
      tipo: isForm ? 'Formulario' : 'Repositorio',
      origen: resource?.name || resource?.slug || occurrence.resourceId || null,
      priority,
      priorityLabel: PRIORITY_LABELS[priority] || 'Media',
      status: state.key,
      statusLabel: state.label,
      color: state.color,
      icon: STATUS_ICON[state.key] || 'AlertOctagon',
      frequency: frequencyLabel(cfg?.periodicity),
      expiration: cfg?.expiration || 'none',
      nextExecution: formattedExecution(occurrence.startsAt ?? dueMs),
      remainingText: remainingMs === null
        ? null
        : (remainingMs >= 0 ? `Vence en ${humanDuration(remainingMs)}` : `Venció hace ${humanDuration(remainingMs)}`),
      channel,
      navigable: true,
      navigationLabel: isForm ? 'Ir al formulario' : 'Ir al repositorio',
      action: isForm
        ? {
            action: 'open-form',
            resourceId: resource?.slug ?? resource?.formSlug ?? resource?.identifier ?? occurrence.resourceId,
            alertId: occurrence.alertId,
            occurrenceId: occurrence.occurrenceId,
          }
        : { action: 'go-to-document', tab: 'repository', documentId: resource?.id ?? occurrence.resourceId },
    });
  }
  out.sort((a, b) => a.sortDate - b.sortDate);
  return out;
}

const ACTION_ROUTE = Object.freeze({
  'open-form': (moduleSlug, action) => {
    // Sprint 280 — F3. The canonical route unchanged; the optional alert
    // identity travels as location.state so DynamicForm can build the
    // CompletionIntent (origin='alert'). Normal navigation keeps state empty.
    const resolved = resolveActionRoute('open-form', {
      moduleSlug,
      resourceId: action.resourceId,
      alertId: action.alertId,
      occurrenceId: action.occurrenceId,
    });
    return {
      path: resolved.canonicalRoute,
      state: resolved.alertContext ? { alertContext: resolved.alertContext } : undefined,
    };
  },
  'open-record': (moduleSlug) => {
    const resolved = resolveActionRoute('open-record', { moduleSlug });
    return { path: resolved.canonicalRoute, state: { tab: 'records' } };
  },
  'go-to-document': (moduleSlug, action) => {
    const resolved = resolveActionRoute('go-to-document', { moduleSlug });
    return {
      path: resolved.canonicalRoute,
      state: {
        tab: action.tab || 'repository',
        navigationContext: {
          resourceType: 'document',
          resourceId: action.documentId,
        },
      },
    };
  },
});

function CardButton({ card, moduleSlug }) {
  const navigate = useNavigate();
  const action = card.action;
  const route = ACTION_ROUTE[action?.action];

  const onClick = () => {
    if (!route) return;
    const target = route(moduleSlug, action);
    if (typeof target === 'string') navigate(target);
    else navigate(target.path, { state: target.state });
  };

  // Sprint 286 — F8. Icon indexed from the MODULE-SCOPE map (no resolveAlertIcon
  // call during render → react-hooks/static-components closed).
  const IconComponent = CARD_ICON_COMPONENTS[card.status] || CARD_ICON_COMPONENTS.fallback;
  const classes = alertVisualClasses(card.color);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${classes.badge}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${classes.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${classes.dot}`} />
          {card.statusLabel}
        </span>
      </div>

      <div>
        <div className="text-sm font-bold text-gray-900">{card.title}</div>
        <div className="text-xs text-gray-500 mt-1">
          Prioridad {card.priorityLabel} · {card.tipo}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 text-[11px] text-gray-600">
        <p><span className="font-semibold text-gray-400">Frecuencia:</span> {card.frequency}</p>
        <p><span className="font-semibold text-gray-400">Próxima ejecución:</span> {card.nextExecution || '—'}</p>
        <p><span className="font-semibold text-gray-400">Tiempo restante:</span> {card.remainingText || '—'}</p>
        {card.channel && <p><span className="font-semibold text-gray-400">Canal:</span> {card.channel}</p>}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <span className={`inline-flex px-2 py-0.5 rounded-full font-bold border ${classes.badge}`}>{card.statusLabel}</span>
        {card.origen && <span className="truncate">{card.origen}</span>}
      </div>

      {card.navigable && route && (
        <button
          type="button"
          onClick={onClick}
          className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl transition-colors"
        >
          {card.navigationLabel || 'Abrir'}
        </button>
      )}
    </div>
  );
}

export default function AlertMonitoringExperience({ moduleSlug, moduleName }) {
  // Sprint 285 — F3. The Runtime bridge delivers BOTH surfaces: `occurrences`
  // (AlertOccurrence VOs ALREADY projected over the real resources by
  // OccurrenceProjection — identity, window and completion are SSOT there) and
  // `existing` (raw resource snapshot used ONLY for visual enrichment). No
  // parallel projection, no ledger queries, no local identity here.
  const { existing, occurrences } = useAlertRuntime({
    module: moduleSlug,
    moduleSlug,
  });

  // Sprint 285 — F3. REAL RESOURCE CONSUMPTION. projectConsumedCards maps each
  // projected occurrence → card, consuming alertId/occurrenceId/signalKey/
  // startsAt/dueAt from the projection and enriching title/priority/channel/
  // frequency/enabled from the real resource (Resolver envelope). The UI only
  // consumes; it no longer reconstructs resources, alerts or schedules.
  const configCards = useMemo(
    () => projectConsumedCards(occurrences, existing, undefined),
    [occurrences, existing],
  );

  // Sprint 240 — OPERATIONAL STATUS CLASSIFICATION. Cards are grouped by the
  // certified status hierarchy (Vencidas → Hoy → Próximas → Activas →
  // Deshabilitadas) and within each group ordered by remainingMilliseconds ASC
  // (most urgent first). States come from the projected occurrence classified
  // by OccurrenceLifecycle (classifyConsumedOccurrence); the UI only arranges
  // what it consumes.
  //
  // Sprint 257 — the certified 6-bucket view (OCC-CERT-24) appends CUMPLIDAS
  // as the LAST bucket, appended at consumption time (the frozen 5-bucket
  // literal stays intact for backward certification).
  const groups = useMemo(() => {
    const byStatus = {};
    for (const card of configCards) {
      const list = byStatus[card.status] || (byStatus[card.status] = []);
      list.push(card);
    }
    return [...STATUS_HIERARCHY, 'completed']
      .map((key) => ({
        key,
        label: STATUS_GROUP_LABELS[key],
        cards: (byStatus[key] || [])
          .slice()
          .sort((a, b) => (a.remainingMs ?? Number.MAX_SAFE_INTEGER) - (b.remainingMs ?? Number.MAX_SAFE_INTEGER)),
      }))
      .filter((group) => group.cards.length > 0);
  }, [configCards]);

  if (configCards.length === 0) {
    return (
      <div className="py-10 text-center text-gray-500 flex flex-col items-center gap-2">
        <Bell className="w-10 h-10 text-gray-300" />
        <span className="font-medium text-gray-900">Sin alertas configuradas</span>
        <span className="text-sm">No existen alertas configuradas para {moduleName || moduleSlug}.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Alertas</h2>
          <p className="text-sm text-gray-500">
            {configCards.length} {configCards.length === 1 ? 'alerta configurada' : 'alertas configuradas'}
          </p>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.key}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-gray-900">{group.label}</h3>
            <span className="text-xs text-gray-400">({group.cards.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.cards.map((card) => (
              <CardButton key={card.id} card={card} moduleSlug={moduleSlug} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
