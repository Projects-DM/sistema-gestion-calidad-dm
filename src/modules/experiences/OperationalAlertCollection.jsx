import { useMemo } from 'react';
import { Bell } from 'lucide-react';
import {
  extractResourceAlertCollection,
  resolveResourceAlertCollection,
} from '../../core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js';

/**
 * OperationalAlertCollection — Sprint 230 Operational Read Model projection.
 *
 * PURE PRESENTATION read-model over the PERSISTED alert collection. It consumes
 * the collection EXACTLY as persisted by the Configuration panel (Sprint 229)
 * through the certified Resolver (`resolveResourceAlertCollection`):
 *   - `alertConfigurations[]` → one card per alert
 *   - legacy `alertConfiguration` → one-element (backward compatible)
 *
 * It NEVER edits, NEVER persists, NEVER evaluates. It only PRODUCES and renders
 * independent alert cards. No new engine/service/provider/repository/contract.
 */

const PRIORITY_LABELS = Object.freeze({ low: 'Baja', medium: 'Media', high: 'Alta' });
const UNIT_LABELS = Object.freeze({ hours: 'hora', days: 'día', weeks: 'semana', months: 'mes', years: 'año' });
const CHANNEL_LABELS = Object.freeze({ email: 'Email', 'in-app': 'Sistema', none: 'Sin canal' });

function describeAlert(cfg) {
  if (!cfg || typeof cfg !== 'object') {
    return { schedule: 'Sin programación', priority: 'media', priorityLabel: 'Media', channelLabel: 'Sin canal', enabled: false };
  }
  let schedule = 'Sin programación';
  const p = cfg.periodicity;
  if (p === 'once') schedule = 'Una vez';
  else if (p && typeof p === 'object') {
    const a = Number(p.amount) || 1;
    const u = UNIT_LABELS[p.unit] ? p.unit : 'days';
    schedule = `Cada ${a} ${UNIT_LABELS[u] || u}${a === 1 ? '' : 's'}`;
  } else if (cfg.expiration === 'recurring') schedule = 'Al vencimiento';
  else if (cfg.expiration === 'fixed') schedule = 'Fecha específica';

  const ch = cfg.notification?.channel;
  return {
    schedule,
    priority: cfg.priority || 'medium',
    priorityLabel: PRIORITY_LABELS[cfg.priority] || 'Media',
    channelLabel: CHANNEL_LABELS[ch] || ch || 'Sin canal',
    enabled: cfg.enabled !== false,
  };
}

/**
 * Projects the persisted alert collections of a set of operational resources
 * into independent alert cards (read-model only).
 *
 * @param {Object} [resources] { forms: [], repositories: [] }
 * @returns {Array<Object>} cards
 */
export function projectOperationalAlertCards(resources) {
  const out = [];
  const sources = ['forms', 'repositories'];

  for (const s of sources) {
    const list = Array.isArray(resources?.[s]) ? resources[s] : [];
    for (const resource of list) {
      const raw = extractResourceAlertCollection(resource);
      // Only RESOURCES THAT WERE ACTUALLY CONFIGURED (persisted envelope) are
      // projected. A never-configured resource would otherwise resolve to a
      // `default` element and produce a spurious card.
      if (!Array.isArray(raw) || raw.length === 0) continue;

      let resolution;
      try {
        resolution = resolveResourceAlertCollection(resource);
      } catch (e) {
        continue;
      }
      const collection = resolution?.collection ?? [];
      collection.forEach((cfg, idx) => {
        const d = describeAlert(cfg);
        out.push({
          key: `${s}:${resource?.id}:${idx}`,
          source: s,
          ownerId: resource?.id ?? null,
          ownerName: resource?.name || resource?.slug || null,
          schedule: d.schedule,
          priority: d.priority,
          priorityLabel: d.priorityLabel,
          channelLabel: d.channelLabel,
          enabled: d.enabled,
        });
      });
    }
  }
  return out;
}

/**
 * OperationalAlertCollectionCards — renders one independent card per persisted
 * alert. The card represents the ALERT (schedule, priority, channel, state),
 * not the form/repository.
 *
 * Props:
 *   - cards: array from projectOperationalAlertCards
 */
export function OperationalAlertCollectionCards({ cards = [] }) {
  const list = useMemo(() => (Array.isArray(cards) ? cards : []), [cards]);

  if (list.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-gray-900">Alertas configuradas</h3>
        <span className="text-xs text-gray-400">({list.length})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((card) => (
          <div key={card.key} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-gray-900 truncate">{card.schedule}</span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${card.enabled ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>
                {card.enabled ? 'Activa' : 'Deshabilitada'}
              </span>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              <p>Prioridad: {card.priorityLabel}</p>
              <p>Canal: {card.channelLabel}</p>
              {card.ownerName && <p className="text-[11px] text-gray-400">Origen: {card.ownerName}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OperationalAlertCollectionCards;