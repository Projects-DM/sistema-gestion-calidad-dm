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
  disabled: Object.freeze({ label: 'Deshabilitada', color: 'gray' }),
});
const PRIORITY_LABELS = Object.freeze({ low: 'Baja', medium: 'Media', high: 'Alta' });
const CHANNEL_LABELS = Object.freeze({ email: 'Email', 'in-app': 'Sistema', push: 'Push', bluetooth: 'Bluetooth', whatsapp: 'WhatsApp' });
const MONTHS = Object.freeze(['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']);
const UNIT_MS = Object.freeze({ hours: 3.6e6, days: 8.64e7, weeks: 6.048e8, months: 2.592e9, years: 3.1536e10 });

/**
 * Sprint 237 — OPERATIONAL TEMPORAL VIEWMODEL (read-only, never persisted,
 * never consumed by the Alert Engine). Builds, from the PERSISTED metadata of
 * each alert, the real temporal state: anchor (startDate + startTime), target,
 * remaining milliseconds, next execution, relative remaining/overdue text and a
 * chronological sort date. All logic is presentation-only; no cronómetros,
 * no schedulers, no engines. The projection merely computes; the UI consumes.
 */
function parseAnchor(item) {
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

function cadenceMs(periodicity) {
  if (periodicity === 'once') return 0;
  if (!periodicity || typeof periodicity !== 'object') return null;
  const unit = UNIT_MS[periodicity.unit];
  const amount = Number(periodicity.amount) || 1;
  return unit ? amount * unit : null;
}

function computeTarget(anchorMs, cadence, nowMs) {
  if (anchorMs === null || Number.isNaN(anchorMs)) return null;
  if (cadence === null || cadence === 0) return anchorMs; // once / fixed single
  if (nowMs <= anchorMs) return anchorMs;
  const occurrences = Math.ceil((nowMs - anchorMs) / cadence);
  return anchorMs + occurrences * cadence;
}

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
 * Sprint 231+235+237 — Projects the persisted alert collection into navigable
 * OPERATIONAL cards carrying the temporal ViewModel. Reuses the certified
 * Resolver and the persisted metadata (startDate/startTime/periodicity/
 * expiration/priority/notification/enabled). Legacy single → one-element
 * collection; never-configured → skipped. UI never evaluates, never persists.
 */
function projectConfigCards(resources, nowMs) {
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
        const state = derivedState(enabled, remainingMs);
        const isForm = s === 'forms';
        const priority = cfg?.priority || 'medium';
        const channel = channelLabel(cfg);
        const nextExecution = formattedExecution(targetMs);
        const remainingTextValue = remainingMs === null
          ? null
          : (remainingMs >= 0 ? `Vence en ${humanDuration(remainingMs)}` : `Venció hace ${humanDuration(remainingMs)}`);
        out.push({
          id: `${s}:${resource?.id}:${idx}`,
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
          icon: state.key === 'disabled' ? 'Bell' : 'AlertOctagon',
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
    const resolved = resolveActionRoute('open-form', { moduleSlug, resourceId: action.resourceId });
    return resolved.canonicalRoute;
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
        <p><span className="font-semibold text-gray-400">Tiempo:</span> {card.remainingText || '—'}</p>
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
  // nextExecution/state/sortDate) and sorts chronologically by remaining
  // (most urgent first); the UI just renders the single ordered grid.
  const configCards = useMemo(() => projectConfigCards(existing), [existing]);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {configCards.map((card) => (
          <CardButton key={card.id} card={card} moduleSlug={moduleSlug} />
        ))}
      </div>
    </div>
  );
}
