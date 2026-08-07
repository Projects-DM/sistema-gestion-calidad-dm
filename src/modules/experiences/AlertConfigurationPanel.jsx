import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, X, Loader2, Plus, Bell, Copy, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { AlertConfigurationApplicationService } from '../../core/capabilities/alert/operational-configuration/AlertConfigurationApplicationService.js';
import AlertConfigurationForm from './AlertConfigurationForm.jsx';

/**
 * AlertConfigurationPanel — COLLECTION ADMINISTRATOR (Sprint 201/222/227/229/243).
 *
 * Sprint 229 — ALERT COLLECTION PERSISTENCE. The panel now loads and persists
 * the WHOLE alert collection through the Application Service:
 *   - load: `loadCollection(resource)` → `formStates[]` → rebuild `alerts[]`/`configs[]`.
 *   - save: `saveCollection({ resource, formStates })` → whole collection persisted
 *     as canonical `alertConfigurations` (backward compatible with single-config).
 * The panel creates/selects/edits/duplicates/deletes alert intents; the reused
 * AlertConfigurationForm edits only the SELECTED alert. It never evaluates.
 *
 * Sprint 243 — COLLAPSIBLE COLLECTION NAVIGATOR (presentation-only). The alert
 * collection is no longer a permanent list at the top of the workspace; it
 * becomes a collapsible SELECTOR/Navigator:
 *   - Initial state: collapsed, showing ONLY a summary of the selected alert.
 *   - Expanded: lists every alert (summary preview only — never the full form),
 *     with create/duplicate/delete actions and explicit selection.
 *   - Selecting an alert updates the form and AUTO-COLLAPSES the navigator.
 *   - Selection is EXPLICIT: activeKey changes only via user selection (or the
 *     initial load when no selection exists) — it is never auto-reset to the
 *     first alert on every render.
 * Reuses the existing `alerts[]`/`configs[]`/`activeKey` model and
 * `saveCollection()`/`loadCollection()`. No new components, engines or services.
 *
 * Sprint 247 — ACTIVE WORKSPACE SYNCHRONIZATION (presentation-only). The
 * collapsed workspace header now represents ONLY the collection identity
 * ("Alertas configuradas (N) — Seleccionar alerta"), fully decoupled from the
 * active alert. The active alert is shown in an independent, non-expandable
 * "Alerta activa" preview block below the selector. The form is remounted per
 * alert (`key={activeKey}`) so all its internal state (frequency / repetition /
 * scheme) rebuilds deterministically on selection change. Persistence,
 * activeKey, saveCollection and alertConfigurations[] are untouched.
 *
 * CONTAINER ONLY. Loads, validates and persists. Never interacts with the
 * Runtime, the Engine or the Consumption Layer.
 *
 * Props:
 *   - resource       RAW resource metadata (form / repository row)
 *   - persistence    PersistencePort adapter (loadConfiguration/saveConfiguration)
 *   - resourceKind   optional, display label only
 *   - onSaved / onClose / showClose
 */

const empty = { source: 'default', resourceId: null, collection: null, formStates: [] };

function scheduleLabel(f) {
  if (!f) return 'Sin programación';
  if (f.periodicityMode === 'recurring') {
    const a = Number(f.periodicityAmount) || 1;
    const units = { hours: 'hora', days: 'día', weeks: 'semana', months: 'mes', years: 'año' };
    const u = f.periodicityUnit || 'days';
    return `Cada ${a} ${units[u] || u}${a === 1 ? '' : 's'}`;
  }
  if (f.expiration === 'recurring') return 'Al vencimiento';
  if (f.expiration === 'fixed') return 'Fecha específica';
  return 'Sin programación';
}

export default function AlertConfigurationPanel({
  resourceKind,
  resource,
  persistence,
  onSaved,
  onClose,
  showClose = false,
}) {
  const serviceRef = useRef(null);
  if (!serviceRef.current) {
    serviceRef.current = new AlertConfigurationApplicationService({ persistence });
  }

  const load = useMemo(
    () => (resource && typeof resource === 'object' ? serviceRef.current.loadCollection(resource) : empty),
    [resource],
  );

  const buildInitial = () => {
    const fs = load.formStates;
    const alertsList = fs.map((f, i) => ({
      key: `alert-${i + 1}`,
      name: f?.name || `Alerta ${i + 1}`,
      description: f?.description || '',
    }));
    const configMap = {};
    fs.forEach((f, i) => { configMap[`alert-${i + 1}`] = f; });
    return { alerts: alertsList, configs: configMap };
  };

  const initialRef = useRef(null);
  if (!initialRef.current) initialRef.current = buildInitial();

  const [alerts, setAlerts] = useState(initialRef.current.alerts);
  const [configs, setConfigs] = useState(initialRef.current.configs);
  const [activeKey, setActiveKey] = useState(initialRef.current.alerts[0]?.key || null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const counterRef = useRef(initialRef.current.alerts.length);

  const title = useMemo(() => {
    if (resourceKind === 'documentRepository') return 'Configuración de alertas del repositorio';
    return 'Configuración de alertas del formulario';
  }, [resourceKind]);

  const activeConfig = activeKey ? configs[activeKey] : null;

  const makeAlert = (name, description) => {
    counterRef.current += 1;
    return { key: `alert-${counterRef.current}`, name, description };
  };

  const onChange = (field, value) => {
    setSaved(false);
    setSaveError(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setConfigs((prev) => ({ ...prev, [activeKey]: { ...(prev[activeKey] || {}), [field]: value } }));
    if (field === 'name' || field === 'description') {
      setAlerts((prev) => prev.map((a) => (a.key === activeKey ? { ...a, [field]: value } : a)));
    }
  };

  const addAlert = () => {
    const next = makeAlert('Nueva alerta', '');
    const base = configs[activeKey] || {};
    setAlerts((prev) => [...prev, next]);
    setConfigs((prev) => ({ ...prev, [next.key]: { ...base, name: '', description: '' } }));
    setActiveKey(next.key);
    setExpanded(false);
  };

  const selectAlert = (key) => {
    setActiveKey(key);
    setErrors({});
    setSaved(false);
    setExpanded(false);
  };

  const duplicateAlert = (key) => {
    const src = alerts.find((a) => a.key === key);
    const srcConfig = configs[key] || {};
    const next = makeAlert(`${src?.name || 'Nueva alerta'} (copia)`, src?.description || '');
    setAlerts((prev) => [...prev, next]);
    setConfigs((prev) => ({ ...prev, [next.key]: { ...srcConfig, name: next.name, description: next.description } }));
    setActiveKey(next.key);
    setExpanded(false);
  };

  const deleteAlert = (key) => {
    const remaining = alerts.filter((a) => a.key !== key);
    setAlerts(remaining);
    setConfigs((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setErrors({});
    setSaved(false);
    if (activeKey === key) setActiveKey(remaining[0]?.key || null);
  };

  const onReset = () => {
    setSaved(false);
    setSaveError(null);
    setErrors({});
    const fresh = serviceRef.current.loadCollection(resource);
    const rebuilt = fresh.formStates;
    const map = {};
    rebuilt.forEach((f, i) => { map[`alert-${i + 1}`] = f; });
    const alertsList = rebuilt.map((f, i) => ({ key: `alert-${i + 1}`, name: f?.name || `Alerta ${i + 1}`, description: f?.description || '' }));
    setAlerts(alertsList);
    setConfigs(map);
    setActiveKey(alertsList[0]?.key || null);
  };

  const onSubmit = async () => {
    if (!resource || alerts.length === 0) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const formStates = alerts.map((a) => configs[a.key] || {});
      const result = await serviceRef.current.saveCollection({ resource, formStates });
      if (result.success) {
        setSaved(true);
        setErrors({});
        if (typeof onSaved === 'function') onSaved(result);
      } else {
        setErrors(result.errors || {});
      }
    } catch (err) {
      setSaveError(err?.message || 'No fue posible guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const active = alerts.find((a) => a.key === activeKey);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Loader2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500">
              {resource?.name || resource?.slug || resource?.id || 'Recurso'}
            </p>
          </div>
        </div>
        {showClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!resource || alerts.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-sm">
          No se pudo cargar la configuración de este recurso.
        </div>
      ) : (
        <>
          {saved && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-sm font-bold text-green-700">
                Colección de alertas guardada como metadata del recurso.
              </p>
            </div>
          )}

          {saveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-bold text-red-700">Error al guardar</p>
              <p className="text-xs text-red-600 mt-1">{saveError}</p>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden" data-testid="alert-configuration-workspace">
            {!expanded ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors"
                aria-expanded="false"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Bell className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate font-bold text-sm text-gray-900">Alertas configuradas</span>
                  <span className="text-[11px] font-medium text-gray-400 shrink-0">({alerts.length})</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-gray-500">Seleccionar alerta</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </span>
              </button>
            ) : (
              <>
                <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" /> Alertas configuradas
                    <span className="text-[11px] font-medium text-gray-400">({alerts.length})</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={addAlert}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      <Plus className="w-4 h-4" /> Nueva alerta
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpanded(false)}
                      className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                      aria-label="Contraer"
                      title="Contraer"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-1.5" data-testid="alerts-collection">
                  {alerts.map((a) => {
                    const selected = a.key === activeKey;
                    const cfg = configs[a.key] || {};
                    return (
                      <div
                        key={a.key}
                        className={`rounded-xl border p-2.5 transition-colors ${
                          selected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => selectAlert(a.key)}
                          className="w-full flex items-center justify-between gap-2 text-left"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span aria-hidden="true" className="text-xs text-primary">{selected ? '✓' : '•'}</span>
                            <span className="truncate font-medium text-sm text-gray-900">{a.name || 'Sin nombre'}</span>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg?.enabled === true ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                            {cfg?.enabled === true ? 'Activa' : 'Deshabilitada'}
                          </span>
                        </button>
                        <div className="mt-1.5 pl-5 space-y-0.5">
                          {a.description && <p className="text-[11px] text-gray-500 truncate">{a.description}</p>}
                          <p className="text-[11px] text-gray-400">{scheduleLabel(cfg)}</p>
                          <p className="text-[11px] text-gray-400">Prioridad: {cfg?.priority || 'media'} · Canal: {cfg?.notificationChannel || 'email'}</p>
                        </div>
                        <div className="mt-1.5 pl-5 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => duplicateAlert(a.key)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-primary"
                            title="Duplicar"
                          >
                            <Copy className="w-3.5 h-3.5" /> Duplicar
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAlert(a.key)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {active && (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden" data-testid="active-alert-preview">
              <div className="px-4 py-2 bg-gray-50/70 border-b border-gray-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Alerta activa</h4>
              </div>
              <div className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-sm text-gray-900">{active?.name || 'Sin nombre'}</p>
                  {active?.description && (
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{active.description}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1.5">Frecuencia: {scheduleLabel(activeConfig)}</p>
                  {(activeConfig?.startDate || activeConfig?.startTime) && (
                    <p className="text-[11px] text-gray-400">Inicio: {activeConfig?.startDate}{activeConfig?.startTime ? ` · ${activeConfig?.startTime}` : ''}</p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${activeConfig?.enabled === true ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                  {activeConfig?.enabled === true ? 'Activa' : 'Deshabilitada'}
                </span>
              </div>
            </div>
          )}

          {active && (
            <AlertConfigurationForm
              key={activeKey}
              formState={{
                ...(configs[active.key] || {}),
                name: active?.name || '',
                description: active?.description || '',
              }}
              errors={errors}
              onChange={onChange}
              onSubmit={onSubmit}
              onReset={onReset}
              saving={saving}
              canReset={load.source === 'metadata'}
            />
          )}
        </>
      )}
    </div>
  );
}