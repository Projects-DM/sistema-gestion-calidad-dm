import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, X, Loader2, Plus, BellRing } from 'lucide-react';
import { AlertConfigurationApplicationService } from '../../core/capabilities/alert/operational-configuration/AlertConfigurationApplicationService.js';
import AlertConfigurationForm from './AlertConfigurationForm.jsx';

/**
 * AlertConfigurationPanel
 *
 * Sprint 201 — The ADMINISTRATIVE operational experience to edit the
 * `alertConfiguration` metadata of a resource (form or document repository).
 *
 * Sprint 201.R — The panel only knows the AlertConfigurationApplicationService
 * (already constructed with the injected PersistencePort adapter). It never
 * receives a concrete persistence service nor a resourceKind→backend selection;
 * it passes a raw `resource` reference and the Application Port routes
 * persistence internally.
 *
 * Sprint 222 — Multi-alert administration: the panel keeps a presentational
 * collection (`alerts`) of named alert intents (key + name + description). The
 * administrator creates intents with "＋ Nueva alerta", selects one, and edits it
 * through the reused AlertConfigurationForm. Persistence continues through the
 * Application Service / PersistencePort as the single compatible
 * `alertConfiguration` metadata.
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

  const [load, setLoad] = useState(() => ({
    ...emptyState,
    ...(resource && typeof resource === 'object' ? serviceRef.current.load(resource) : {}),
  }));
  const [formState, setFormState] = useState(load.formState);
  const [alerts, setAlerts] = useState(() => [
    { key: 'alert-1', name: resource?.name || resource?.slug || resource?.id || 'Nueva alerta', description: '' },
  ]);
  const [activeKey, setActiveKey] = useState('alert-1');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const title = useMemo(() => {
    if (resourceKind === 'documentRepository') return 'Configuración de alertas del repositorio';
    return 'Configuración de alertas del formulario';
  }, [resourceKind]);

  const onChange = (field, value) => {
    setSaved(false);
    setSaveError(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (field === 'name' || field === 'description') {
      setAlerts((prev) => prev.map((a) => (a.key === activeKey ? { ...a, [field]: value } : a)));
    }
  };

  const addAlert = () => {
    const key = `alert-${alerts.length + 1}`;
    setAlerts((prev) => [...prev, { key, name: 'Nueva alerta', description: '' }]);
    setActiveKey(key);
  };

  const selectAlert = (key) => {
    setActiveKey(key);
    const active = alerts.find((a) => a.key === key);
    setFormState((prev) => ({ ...(prev || {}), name: active?.name || '', description: active?.description || '' }));
  };

  const onReset = () => {
    setSaved(false);
    setSaveError(null);
    setErrors({});
    setFormState(serviceRef.current.load(resource).formState);
  };

  const onSubmit = async () => {
    if (!resource || !formState) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const result = await serviceRef.current.saveConfiguration({ resource, formState });
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

      {!resource || !formState ? (
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

          {/* Sprint 222 — Colección de alertas */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-primary" /> Alertas
              </h3>
              <button
                type="button"
                onClick={addAlert}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <Plus className="w-4 h-4" /> Nueva alerta
              </button>
            </div>
            <div className="p-3 space-y-1" data-testid="alerts-collection">
              {alerts.map((a) => {
                const selected = a.key === activeKey;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => selectAlert(a.key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm text-left transition-colors ${
                      selected ? 'border-primary bg-primary/5 text-gray-900' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <span aria-hidden="true" className="text-xs">{selected ? '✓' : '•'}</span>
                    <span className="truncate font-medium">{a.name || 'Sin nombre'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <AlertConfigurationForm
            formState={{
              ...formState,
              name: active?.name || formState?.name,
              description: active?.description || formState?.description,
            }}
            errors={errors}
            onChange={onChange}
            onSubmit={onSubmit}
            onReset={onReset}
            saving={saving}
            canReset={load.source === 'metadata'}
          />
        </>
      )}
    </div>
  );
}