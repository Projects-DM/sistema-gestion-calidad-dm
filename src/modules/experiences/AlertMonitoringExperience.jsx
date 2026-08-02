import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle } from 'lucide-react';
import { useAlertRuntime } from '../../hooks/useAlertRuntime';
import { alertVisualClasses, resolveAlertIcon } from '../../utils/alertVisual';

/**
 * AlertMonitoringExperience
 *
 * Sprint 187 — Operational Navigation Consolidation.
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
 * Documents NEVER open directly. "Ir al documento" navigates to the
 * existing Document Repository (tab) carrying the selectedDocumentId in
 * location.state so the document is selected automatically.
 */

const ACTION_ROUTE = Object.freeze({
  'open-form': (moduleSlug, action) => `/modulo/${moduleSlug}/${action.resourceId}`,
  'open-record': (moduleSlug) => ({ path: `/modulo/${moduleSlug}`, state: { tab: 'records' } }),
  'go-to-document': (moduleSlug, action) => ({
    path: `/modulo/${moduleSlug}`,
    state: { tab: action.tab || 'repository', selectedDocumentId: action.documentId },
  }),
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
          {card.priorityLabel}
        </span>
      </div>

      <div>
        <div className="text-sm font-bold text-gray-900">{card.title}</div>
        <div className="text-xs text-gray-500 mt-1">
          {card.tipo} · {card.origen}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <span className={`inline-flex px-2 py-0.5 rounded-full font-bold border ${classes.badge}`}>{card.estado}</span>
      </div>

      {card.message && (
        <p className="text-xs text-gray-600 leading-relaxed">{card.message}</p>
      )}

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
  const { workspace } = useAlertRuntime({
    module: moduleSlug,
    moduleSlug,
  });

  const viewModel = workspace?.workspace ?? null;

  const priorityGroups = useMemo(() => {
    if (!viewModel) return [];
    return (viewModel.groups?.byPriority ?? []).filter((g) => g.count > 0);
  }, [viewModel]);

  if (!viewModel) {
    return (
      <div className="py-10 text-center text-gray-500 flex flex-col items-center gap-2">
        <AlertTriangle className="w-10 h-10 text-gray-300" />
        <span>No existen alertas activas</span>
      </div>
    );
  }

  if (viewModel.empty) {
    return (
      <div className="py-10 text-center text-gray-500 flex flex-col items-center gap-2">
        <Bell className="w-10 h-10 text-gray-300" />
        <span className="font-medium text-gray-900">{viewModel.emptyMessage}</span>
        <span className="text-sm">Sin alertas activas para {moduleName || moduleSlug}.</span>
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
          <h2 className="text-lg font-bold text-gray-900">Alertas Activas</h2>
          <p className="text-sm text-gray-500">
            {viewModel.summary.total} alertas · {viewModel.summary.forms} formularios · {viewModel.summary.records} registros · {viewModel.summary.documents} documentos
          </p>
        </div>
      </div>

      {priorityGroups.map((group) => (
        <div key={group.priority}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-gray-900">{group.label}</h3>
            <span className="text-xs text-gray-400">({group.count})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.cards.map((card) => (
              <CardButton key={card.id || `${card.source}-${card.title}`} card={card} moduleSlug={moduleSlug} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
