import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAlertRuntime } from '../../hooks/useAlertRuntime';
import { alertVisualClasses, resolveAlertIcon } from '../../utils/alertVisual';
import { resolveActionRoute } from '../../core/navigation/ExistingModuleRouteResolver.js';
import {
  resolveResourceAlertCollection,
  extractResourceAlertCollection,
} from '../../core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js';
// Sprint 257 — THE schedule single source of truth (Gate C). parseAnchor /
// cadenceMs / computeTarget / occurrenceWindowAt live in the occurrence domain;
// this presentation layer imports them ONLY (the previous local copies are gone).
import {
  parseAnchor,
  cadenceMs,
  computeTarget,
  occurrenceWindowAt,
  UNIT_MS,
} from '../../core/capabilities/alert/occurrence/OccurrenceSchedule.js';
import OccurrenceLedger from '../../core/capabilities/alert/occurrence/OccurrenceLedger.js';
// Sprint 265 — THE domain classifier becomes the UI classification.
// AlertMonitoringExperience no longer re-derives temporal state from
// `remainingMs` (Sprint 264 DIVERGENCE): for FORM alerts it classifies with
// the certified OccurrenceLifecycle.classifyOccurrence (window + completion),
// and maps the derived key to a human label/color ONLY (mandate §13). No
// alternative classifier is reintroduced (mandate §14).
import { classifyOccurrence } from '../../core/capabilities/alert/occurrence/OccurrenceLifecycle.js';

/**
 * AlertMonitoringExperience
 *
 * Sprint 187 — Operational Navigation Consolidation.
 * Sprint 188 — Route Resolution & Existing Navigation Binding Certification.
 * Sprint 189 — Context Navigation Decoupling.
 *
 * Consumes EXCLUSIVELY the Workspace ViewModel produced by
 * AlertCapability.workspace():
 *   - cards (Tipo, Origen, Prioridad, Estado, Mensaje, Acción)
 *   - groups.byPriority / groups.bySource
 *   - summary
 *   - actions (Action Descriptors)
 *
 * The Action Descriptor (open-form / open-record / go-to-document) is
 * the ONLY navigation intent the UI consumes. This component NEVER
 * creates navigation logic, NEVER calculates routes, NEVER consults
 * Runtime directly, NEVER opens Alert Monitoring again, NEVER
 * administers CRUD.
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

/**
 * Sprint 237 — OPERATIONAL TEMPORAL VIEWMODEL (read-only, never persisted,
 * never consumed by the Alert Engine). Builds, from the PERSISTED metadata of
 * each alert, the real temporal state: anchor (startDate + startTime), target,
 * remaining milliseconds, next execution, relative remaining/overdue text and a
 * chronological sort date. All logic is presentation-only; no cronómetros,
 * no schedulers, no engines. The projection merely computes; the UI consumes.
 *
 * Sprint 257 — scheduling algorithm moved UP to the occurrence domain
 * (OccurrenceSchedule.js). Gate C mandates ONE source: this viewmodel now
 * IMPORTS parseAnchor/cadenceMs/computeTarget/occurrenceWindowAt instead of
 * duplicating them (the local copies of UNIT_MS/parseAnchor/cadenceMs/
 * computeTarget were removed).
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

function derivedState(enabled, remainingMs) {
  if (enabled === false) {
    return { key: 'disabled', label: STATUS_VISUAL.disabled.label, color: STATUS_VISUAL.disabled.color };
  }
  if (remainingMs === null || Number.isNaN(remainingMs)) {
    return { key: 'active', label: STATUS_VISUAL.active.label, color: STATUS_VISUAL.active.color };
  }
  if (remainingMs < 0) return { key: 'overdue', label: STATUS_VISUAL.overdue.label, color: STATUS_VISUAL.overdue.color };
  if (remainingMs <= 8.64e7) return { key: 'today', label: STATUS_VISUAL.today.label, color: STATUS_VISUAL.today.color };
  if (remainingMs <= 2.592e8) return { key: 'upcoming', label: STATUS_VISUAL.upcoming.label, color: STATUS_VISUAL.upcoming.color };
  return { key: 'active', label: STATUS_VISUAL.active.label, color: STATUS_VISUAL.active.color };
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
 * Sprint 265 — SINGLE temporal semantics (mandate §13/§14, AC-01..05).
 *
 * Builds the card state for a FORM occurrence using the CERTIFIED domain
 * classifier (OccurrenceLifecycle.classifyOccurrence: window [startsAt, dueAt)
 * + completion precedence). The ledger supplies the window-aware completion
 * signal (OCC-CERT-12); classifies NEVER fall back to overdue/today for a
 * fulfilled occurrence (OCC-CERT-08) and NEVER decide by `remainingMs`
 * (Sprint 264 DIVERGENCE closed).
 *
 * `enabled === false` keeps the DISABLED presentation bucket (existing
 * lifecycle), but only when the occurrence is NOT fulfilled.
 */
function deriveFormState(enabled, occurrence, nowMs) {
  const completion = occurrence?.completion || null;
  if (completion) {
    const domain = classifyOccurrence(
      { startsAt: occurrence?.startsAt, dueAt: occurrence?.dueAt, completion },
      Number.isFinite(nowMs) ? nowMs : Date.now(),
    );
    if (domain.key === 'completed') {
      return { key: 'completed', label: STATUS_VISUAL.completed.label, color: STATUS_VISUAL.completed.color };
    }
    if (domain.key === 'cancelled') {
      return { key: 'cancelled', label: 'Cancelada', color: 'gray' };
    }
  }
  if (enabled === false) {
    return { key: 'disabled', label: STATUS_VISUAL.disabled.label, color: STATUS_VISUAL.disabled.color };
  }
  const domain = classifyOccurrence(occurrence, Number.isFinite(nowMs) ? nowMs : Date.now());
  const visual = STATUS_VISUAL[domain.key] || STATUS_VISUAL.active;
  return { key: domain.key, label: visual.label, color: visual.color };
}

/**
 * Sprint 231+235+237 — Projects the persisted alert collection into navigable
 * OPERATIONAL cards carrying the temporal ViewModel. Reuses the certified
 * Resolver and the persisted metadata (startDate/startTime/periodicity/
 * expiration/priority/notification/enabled). Legacy single → one-element
 * collection; never-configured → skipped. UI never evaluates, never persists.
 *
 * Sprint 257 — OCCURRENCE substrates: each card resolves its CURRENT occurrence
 * window through the certified domain schedule + ledger; the tunnel state is
 * derived from actual RESOURCE final signals (Cumplidas, OCC-CERT-24).
 */
function projectConfigCards(resources, nowMs, moduleSlug) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const out = [];
  for (const s of ['forms', 'repositories']) {
    const list = Array.isArray(resources?.[s]) ? resources[s] : [];
    for (const resource of list) {
      const raw = extractResourceAlertCollection(resource);
      if (!Array.isArray(raw) || raw.length === 0) continue;
      let resolution;
      try {
        resolution = resolveResourceAlertCollection(resource);
      } catch {
        continue;
      }
      (resolution?.collection ?? []).forEach((cfg, idx) => {
        const rawItem = raw[idx];
        const anchorMs = parseAnchor(rawItem || cfg);
        const cadence = cadenceMs(rawItem?.periodicity ?? cfg?.periodicity);
        const targetMs = computeTarget(anchorMs, cadence, now);
        const remainingMs = targetMs === null ? null : targetMs - now;
        const enabled = cfg?.enabled !== false;
        const window = occurrenceWindowAt(anchorMs, cadence, now);

        // Occurrence classification: when the RESOURCE reached a semantically-final
        // state inside the occurrence window, the card is "Cumplida" — and NEVER
        // falls back to overdue/today (OCC-CERT-08/09).
        const isForm = s === 'forms';
        const resourceKind = isForm ? 'dynamicForms' : 'documentRepository';
        const resourceId = resource?.id ?? resource?.slug ?? resource?.identifier ?? null;
        // The occurrenceId on the card is presentational only (identity contract
        // in the occurrence domain); it never becomes a new configuration.
        const alertId = `${s}:${resource?.id ?? resource?.slug ?? idx}:${idx}`;
        // Ledger match key comes from the occurrence domain identity, but the
        // presentation layer only reads the generic resource fields (Gate E);
        // it never builds/imports the occurrence object model here.
        const occurrence = {
          resourceKind,
          resourceId,
          moduleId: resource?.module_slug ?? resource?.moduleSlug ?? moduleSlug ?? null,
          startsAt: window?.startsAt ?? null,
          dueAt: window?.dueAt ?? null,
        };
        // Sprint 265 — DOMAIN SSOT classification (AC-01..AC-05, AC-15).
        // FORMS are classified by the certified OccurrenceLifecycle
        // (window-based, completion-first). Repositories stay on the legacy
        // presentation classifier (Sprint 257) — OUT OF SCOPE for Sprint 265.
        //
        // Sprint 280 — F9. The ledger query carries the occurrence identity so
        // an explicit completion of THIS occurrence (A:occ:001) is reflected
        // HERE only — never leaking to B:occ:001/C:occ:001 of the same form.
        const completionSignal = OccurrenceLedger.completionSignalFor({
          ...occurrence,
          alertId,
          occurrenceId: `${alertId}:occ:${window?.sequence ?? 1}`,
        });

        // Sprint 265 — DOMAIN SSOT classification (AC-01..AC-05, AC-15).
        // FORMS are classified by the certified OccurrenceLifecycle
        // (window-based, completion-first). Repositories stay on the legacy
        // presentation classifier (Sprint 257) — OUT OF SCOPE for Sprint 265.
        let state;
        if (isForm) {
          state = deriveFormState(
            enabled,
            {
              startsAt: occurrence.startsAt,
              dueAt: occurrence.dueAt,
              completion: completionSignal
                ? { status: completionSignal.status ?? 'COMPLETED', completedAt: completionSignal.completedAt ?? null }
                : null,
            },
            now,
          );
        } else {
          state = derivedState(enabled, remainingMs);
          if (completionSignal) {
            state = { key: 'completed', label: STATUS_VISUAL.completed.label, color: STATUS_VISUAL.completed.color };
          }
        }

        const priority = cfg?.priority || 'medium';
        const channel = channelLabel(cfg);
        const nextExecution = formattedExecution(targetMs);
        const remainingTextValue = remainingMs === null
          ? null
          : (remainingMs >= 0 ? `Vence en ${humanDuration(remainingMs)}` : `Venció hace ${humanDuration(remainingMs)}`);
        out.push({
          id: `${s}:${resource?.id}:${idx}`,
          occurrenceId: `${alertId}:occ:${window?.sequence ?? 1}`,
          remainingMs,
          sortDate: remainingMs ?? Number.MAX_SAFE_INTEGER,
          title: cfg?.description || (rawItem?.name) || (cfg?.periodicity === 'once' ? 'Una sola vez' : 'Alerta'),
          tipo: isForm ? 'Formulario' : 'Repositorio',
          origen: resource?.name || resource?.slug || resource?.id || null,
          priority,
          priorityLabel: PRIORITY_LABELS[priority] || 'Media',
          status: state.key,
          statusLabel: state.label,
          color: state.color,
          icon: STATUS_ICON[state.key] || 'AlertOctagon',
          frequency: frequencyLabel(rawItem?.periodicity ?? cfg?.periodicity),
          expiration: cfg?.expiration || 'none',
          nextExecution,
          remainingText: remainingTextValue,
          channel,
          navigable: true,
          navigationLabel: isForm ? 'Ir al formulario' : 'Ir al repositorio',
          action: isForm
            ? {
                action: 'open-form',
                resourceId: resource?.slug ?? resource?.formSlug ?? resource?.identifier ?? resource?.id,
                // Sprint 280 — F1. The card ALREADY owns the alert identity
                // (alertId built above, occurrenceId from the projected window).
                // The descriptor conserves it so DynamicForm never re-decides
                // which alert is being fulfilled. No new query.
                alertId,
                occurrenceId: `${alertId}:occ:${window?.sequence ?? 1}`,
              }
            : { action: 'go-to-document', tab: 'repository', documentId: resource?.id },
        });
      });
    }
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

  const IconComponent = resolveAlertIcon(card.icon);
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
  // Runtime Bridge collection: `existing` carries the resource snapshot whose
  // persisted alert collections feed the SINGLE alert experience. The bridge is
  // still the runtime reuse point (Sprint 232); no parallel navigation/engine.
  const { existing } = useAlertRuntime({
    module: moduleSlug,
    moduleSlug,
  });

  // Sprint 237 — TEMPORAL READ MODEL. alertConfigurations[] is the ONLY source.
  // projectConfigCards computes the temporal ViewModel (targetDate/remaining/
  // nextExecution/state/sortDate). The UI only consumes.
  const configCards = useMemo(() => projectConfigCards(existing, undefined, moduleSlug), [existing, moduleSlug]);

  // Sprint 240 — OPERATIONAL STATUS CLASSIFICATION. Cards are grouped by the
  // certified status hierarchy (Vencidas → Hoy → Próximas → Activas →
  // Deshabilitadas) and within each group ordered by remainingMilliseconds ASC
  // (most urgent first). States derive EXCLUSIVELY from remainingMs + enabled
  // (projectConfigCards/derivedState); the UI only arranges what it consumes.
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
