import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, X, Loader2 } from 'lucide-react';
import { AlertConfigurationApplicationService } from '../../core/capabilities/alert/operational-configuration/AlertConfigurationApplicationService.js';
import AlertConfigurationForm from './AlertConfigurationForm.jsx';

/**
 * AlertConfigurationPanel
 *
 * Sprint 201 — The ADMINISTRATIVE operational experience to edit the
 * `alertConfiguration` metadata of a resource (form or document repository).
 *
 * Sprint 201.R — The panel only knows the AlertConfigurationApplicationService
 * (already constructed with the injected PersistencePort adapter). The panel
 * never receives a concrete persistence service nor a resourceKind→backend
 * selection; it passes a raw `resource` reference and the Application Port
 * routes persistence internally.
 *
 * CONTAINER ONLY. The panel:
 *   1. Loads the current configuration through the certified
 *      AlertConfigurationResolver (via the Application Service) → editable
 *      draft.
 *   2. Renders the AlertConfigurationForm (pure presentation).
 *   3. On submit, orchestrates VALIDATION + PERSISTENCE through the
 *      Application Service using the injected `persistence` persister.
 *
 * The panel NEVER interacts with the Runtime, the Engine or the Consumption
 * Layer. It edits METADATA ONLY and never computes severity / risk / due
 * dates / status.
 *
 * Props:
 *   - resource       the RAW resource metadata (form / repository row)
 *   - persistence    PersistencePort adapter (contract: loadConfiguration/saveConfiguration)
 *   - onSaved        optional callback after a successful save
 *   - onClose        optional close button handler
 *   - showClose      boolean, renders the close button
 *   - resourceKind   optional, display label only (kept for the container title)
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
      const result = await serviceRef.current.saveConfiguration({
        resource,
        formState,
      });
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

          <AlertConfigurationForm
            formState={formState}
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
