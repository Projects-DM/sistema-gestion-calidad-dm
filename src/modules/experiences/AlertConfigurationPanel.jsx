import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, X, Loader2, Plus, Bell, Copy, Trash2 } from 'lucide-react';
import { AlertConfigurationApplicationService } from '../../core/capabilities/alert/operational-configuration/AlertConfigurationApplicationService.js';
import AlertConfigurationForm from './AlertConfigurationForm.jsx';

/**
 * AlertConfigurationPanel
 *
 * Sprint 201 — The ADMINISTRATIVE operational experience to edit the
 * `alertConfiguration` metadata of a resource (form or document repository).
 *
 * Sprint 222 — Multi-alert administration: the panel keeps a presentational
 * collection (`alerts`) of named alert intents (key + name + description).
 * The administrator creates intents with "＋ Nueva alerta", selects one, and edits
 * it through the reused AlertConfigurationForm.
 *
 * Sprint 227 — COLLECTION ADMINISTRATION (MASTER SSOT):
 *   - The panel is now the OWNER/ADMINISTRATOR of the alert collection.
 *   - It creates, selects, edits, DUPLICATES and DELETES alert intents.
 *   - Each intent keeps its own per-alert configuration draft (`configs`), so
 *     multiple alerts are truly independent.
 *   - The form only ever receives the SELECTED (active) alert (selectedAlert);
 *     it does not know about the collection.
 *   - Cards expose only per-alert SUMMARY: name, short description, schedule,
 *     priority, and operational status (Activa / Deshabilitada). No due-date
 *     calculation happens here (that belongs to Sprint 228 + the Alert Engine).
 *   - Compatibility is PRESERVED: persistence continues through the Application
 *     Service / PersistencePort as the single compatible `alertConfiguration`
 *     metadata (the ACTIVE alert is the one written, retrocompatible scenario).
 *
 * CONTAINER ONLY. The panel loads, validates and persists; it NEVER interacts
 * with the Runtime, the Engine or the Consumption Layer.
 *
 * Props:
 *   - resource       RAW resource metadata (form / repository row)
 *   - persistence    PersistencePort adapter (loadConfiguration/saveConfiguration)
 *   - resourceKind   optional, display label only
 *   - onSaved / onClose / showClose
 */

const emptyState = Object.freeze({
  source: 'default',
  resourceId: null,
  configuration: null,
  formState: null,
});

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

  const load = useMemo(() => ({ ...emptyState, ...(resource && typeof resource === 'object' ? serviceRef.current.load(resource) : {}) }), [resource]);

  const initialAlertKey = 'alert-1';
  const [alerts, setAlerts] = useState(() => [
    { key: initialAlertKey, name: resource?.name || resource?.slug || resource?.id || 'Nueva alerta', description: '' },
  ]);
  const [configs, setConfigs] = useState(() => ({ [initialAlertKey]: load.formState }));
  const [activeKey, setActiveKey] = useState(initialAlertKey);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const counterRef = useRef(1);

  const title = useMemo(() => {
    if (resourceKind === 'documentRepository') return 'Configuración de alertas del repositorio';
    return 'Configuración de alertas del formulario';
  }, [resourceKind]);

  const activeConfig = configs[activeKey] || {};

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
    const base = configs[activeKey] || load.formState || {};
    setAlerts((prev) => [...prev, next]);
    setConfigs((prev) => ({ ...prev, [next.key]: { ...base, name: '', description: '' } }));
    setActiveKey(next.key);
  };

  const selectAlert = (key) => {
    setActiveKey(key);
    setErrors({});
    setSaved(false);
  };

  const duplicateAlert = (key) => {
    const src = alerts.find((a) => a.key === key);
    const srcConfig = configs[key] || {};
    const next = makeAlert(`${src?.name || 'Nueva alerta'} (copia)`, src?.description || '');
    setAlerts((prev) => [...prev, next]);
    setConfigs((prev) => ({ ...prev, [next.key]: { ...srcConfig, name: next.name, description: next.description } }));
    setActiveKey(next.key);
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
    if (activeKey === key) {
      const nextActive = remaining[0]?.key || null;
      setActiveKey(nextActive);
    }
  };

  const onReset = () => {
    setSaved(false);
    setSaveError(null);
    setErrors({});
    setConfigs((prev) => ({ ...prev, [activeKey]: serviceRef.current.load(resource).formState }));
  };

  const onSubmit = async () => {
    if (!resource || !activeConfig) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const result = await serviceRef.current.saveConfiguration({ resource, formState: activeConfig });
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

      {!resource || !load.formState ? (
        <div className="py-10 text-center text-gray-500 text-sm">
          No se pudo cargar la configuración de este recurso.
        </div>
      ) : (
        <>
          {saved && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-sm font-bold text-green-700">
                Configuración guardada como metadata del recurso.
              </p>
            </div>
          )}

          {saveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-bold text-red-700">Error al guardar</p>
              <p className="text-xs text-red-600 mt-1">{saveError}</p>
            </div>
          )}

          {/* Sprint 222/227 — Colección de alertas */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Alertas
                <span className="text-[11px] font-medium text-gray-400">({alerts.length})</span>
              </h3>
              <button
                type="button"
                onClick={addAlert}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <Plus className="w-4 h-4" /> Nueva alerta
              </button>
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
          </div>

          {active && (
            <AlertConfigurationForm
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