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
const STATUS_ORDER = Object.freeze({ overdue: 0, today: 1, upcoming: 2, active: 3, disabled: 4 });
const PRIORITY_LABELS = Object.freeze({ low: 'Baja', medium: 'Media', high: 'Alta' });
const PERIOD_UNITS_DAYS = Object.freeze({ hours: 1 / 24, days: 1, weeks: 7, months: 30, years: 365 });
const UNIT_LABELS = Object.freeze({ hours: 'hora', days: 'día', weeks: 'semana', months: 'mes', years: 'año' });
const CHANNEL_LABELS = Object.freeze({ email: 'Email', 'in-app': 'Sistema', push: 'Push', bluetooth: 'Bluetooth' });

/**
 * Sprint 235 — OPERATIONAL STATUS PROJECTION (read-only, provisional).
 *
 * Derives a deterministic operational ordering/status from the ALREADY
 * PERSISTED canonical fields (periodicity, expiration, priority, notification,
 * enabled). The UI NEVER evaluates the Alert Engine and NEVER persists:
 * this is a TEMPORARY projection that the UI will later replace with the
 * ENGINE's certified operational states without changing the design/UX.
 */
function operationalState(cfg) {
  if (cfg?.enabled === false) {
    return { key: 'disabled', label: STATUS_VISUAL.disabled.label, color: STATUS_VISUAL.disabled.color };
  }
  const days = cadenceDays(cfg?.periodicity);
  if (days === null) {
    // Once / no cadence → the configured single event is closest.
    return { key: 'upcoming', label: STATUS_VISUAL.upcoming.label, color: STATUS_VISUAL.upcoming.color };
  }
  if (days <= 1) return { key: 'today', label: STATUS_VISUAL.today.label, color: STATUS_VISUAL.today.color };
  if (days <= 7) return { key: 'upcoming', label: STATUS_VISUAL.upcoming.label, color: STATUS_VISUAL.upcoming.color };
  return { key: 'active', label: STATUS_VISUAL.active.label, color: STATUS_VISUAL.active.color };
}

function cadenceDays(periodicity) {
  if (periodicity === 'once') return 0;
  if (!periodicity || typeof periodicity !== 'object') return null;
  const mult = PERIOD_UNITS_DAYS[periodicity.unit];
  const amount = Number(periodicity.amount) || 1;
  return mult ? amount * mult : amount;
}

function frequencyLabel(periodicity) {
  if (periodicity === 'once') return 'Una vez';
  if (!periodicity || typeof periodicity !== 'object') return 'Sin periodicidad';
  const a = Number(periodicity.amount) || 1;
  const u = UNIT_LABELS[periodicity.unit] || periodicity.unit || 'día';
  return `Cada ${a} ${u}${a === 1 ? '' : 's'}`;
}

function relativeLabel(days) {
  if (days === null) return '—';
  const d = Math.round(days);
  if (days <= 0) return 'Hoy';
  if (days < 1) return `En ${Math.round(days * 24)} horas`;
  if (d <= 30) return `En ${d} día${d === 1 ? '' : 's'}`;
  if (d <= 365) return `En ~${Math.round(d / 30)} meses`;
  return `En ~${Math.round(d / 365)} año${d / 365 >= 2 ? 's' : ''}`;
}

function channelLabel(cfg) {
  const ch = cfg?.notification?.channel;
  if (!ch) return null;
  return CHANNEL_LABELS[ch] || ch;
}

/**
 * Sprint 231+235 — Projects the persisted alert collections into navigable
 * OPERATIONAL alert cards. Reuses the certified Resolver; legacy single
 * `alertConfiguration` resolves to a one-element collection (backward
 * compatible); never-configured resources are skipped. The cards carry the
 * operational status projection + the certified navigation. UI never evaluates.
 */
function projectConfigCards(resources) {
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
        const isForm = s === 'forms';
        const state = operationalState(cfg);
        const days = cadenceDays(cfg?.periodicity);
        const priority = cfg?.priority || 'medium';
        const channel = channelLabel(cfg);
        const meta = [frequencyLabel(cfg?.periodicity), channel ? `Canal: ${channel}` : null]
          .filter(Boolean)
          .join(' · ');
        out.push({
          id: `${s}:${resource?.id}:${idx}`,
          order: STATUS_ORDER[state.key],
          days,
          title: cfg?.description || (cfg?.periodicity === 'once' ? 'Una vez' : 'Alerta'),
          tipo: isForm ? 'Formulario' : 'Repositorio',
          origen: resource?.name || resource?.slug || resource?.id || null,
          priority,
          priorityLabel: PRIORITY_LABELS[priority] || 'Media',
          status: state.key,
          statusLabel: state.label,
          color: state.color,
          icon: state.key === 'disabled' ? 'Bell' : 'AlertOctagon',
          frequency: frequencyLabel(cfg?.periodicity),
          expiration: cfg?.expiration || 'none',
          nextExecution: relativeLabel(days === 0 ? 0 : days),
          remainingTime: relativeLabel(days === 0 ? 0 : days),
          channel,
          message: meta,
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
  out.sort((a, b) => a.order - b.order || (a.days === null ? 1 : a.days) - (b.days === null ? 1 : b.days));
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
        <p><span className="font-semibold text-gray-400">Tiempo:</span> {card.remainingTime || '—'}</p>
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

// Sprint 232 — SINGLE Alert Experience. alertConfigurations[] is the ONLY
  // source of operational alert cards: one card per alert, each rendered
  // through the SAME certified navigation mechanism (open-in-form /
  // go-to-document). No "Alertas configuradas" vs "Alertas Activas" coexistence.
  // Pure read projection; the UI never evaluates, never persists.
  const configCards = useMemo(() => projectConfigCards(existing), [existing]);

  // Sprint 235 — the cards are grouped by OPERATIONAL status (not load order):
// Vencidas → Hoy → Próximas → Activas → Deshabilitadas. projectConfigCards
// already sorts each card's `order` + closest next, so groups stay ordered.
  const grouped = useMemo(() => {
    const order = ['overdue', 'today', 'upcoming', 'active', 'disabled'];
    const labels = {
      overdue: 'Vencidas',
      today: 'Hoy',
      upcoming: 'Próximas',
      active: 'Activas',
      disabled: 'Deshabilitadas',
    };
    return order
      .map((key) => ({
        key,
        label: labels[key],
        cards: configCards.filter((c) => c.status === key),
      }))
      .filter((g) => g.cards.length > 0);
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

      {grouped.map((group) => (
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
