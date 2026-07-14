import { useMemo, useState } from 'react';
import { ArrowLeft, Trash2, ListChecks, History, FileText, Check, Layers, ClipboardList, BarChart3, Settings, Users, Package, Shield, Truck, Wrench, Heart, GraduationCap, Building2 } from 'lucide-react';
import { ModuleAdministrationApplicationService } from '../../core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js';
import { ModuleCapabilityPersistenceAdapter } from '../../core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js';
import { createApplicationRequest } from '../../core/applicationLayer/common/contracts/ApplicationRequest.js';
import { createApplicationContext } from '../../core/applicationLayer/common/contracts/ApplicationContext.js';
import { dispatchModuleChange } from '../../core/applicationLayer/moduleAdministration/ModuleChangeBus.js';
import { CapabilityPackageRegistry } from '../../core/capabilities/CapabilityPackageRegistry.js';
import { useAuth } from '../../hooks/useAuth.js';

const persistenceProvider = new ModuleCapabilityPersistenceAdapter();
const appService = new ModuleAdministrationApplicationService({ persistenceProvider });

const ICON_OPTIONS = [
  'Layers', 'ClipboardList', 'FileText', 'ListChecks', 'History',
  'BarChart3', 'Settings', 'Users', 'Package', 'Shield',
  'Truck', 'Wrench', 'Heart', 'GraduationCap', 'Building2',
];

const COLOR_OPTIONS = [
  { label: 'Azul', value: '#3B82F6' },
  { label: 'Verde', value: '#10B981' },
  { label: 'Naranja', value: '#F59E0B' },
  { label: 'Rojo', value: '#EF4444' },
  { label: 'Morado', value: '#8B5CF6' },
  { label: 'Gris', value: '#6B7280' },
];

const STATE_OPTIONS = [
  { value: 'draft', label: 'Borrador' },
  { value: 'configurable', label: 'Configurable' },
  { value: 'operational', label: 'Operacional' },
  { value: 'deprecated', label: 'Deprecado' },
  { value: 'archived', label: 'Archivado' },
];

const VALID_TRANSITIONS = {
  draft: ['configurable'],
  configurable: ['operational', 'archived'],
  operational: ['deprecated'],
  deprecated: ['archived', 'configurable'],
  archived: ['draft'],
};

const ICON_MAP = { Layers, ClipboardList, FileText, ListChecks, History, BarChart3, Settings, Users, Package, Shield, Truck, Wrench, Heart, GraduationCap, Building2 };

function resolveIcon(name) {
  return ICON_MAP[name] || ListChecks;
}

function getModuleField(module, keys) {
  for (const k of keys) {
    if (module && module[k] !== undefined && module[k] !== null) return module[k];
  }
  return undefined;
}

export default function ModuleEditPanel({ module, onCancel, onSaved, onDelete, formsCount }) {
  const { user, rol } = useAuth();
  const appContext = useMemo(() => createApplicationContext({
    actorId: user?.id ?? null,
    source: 'ui-module-edit',
    actorRole: rol === 'administrador' ? 'admin' : rol,
  }), [user?.id, rol]);

  const id = useMemo(() => getModuleField(module, ['id']), [module]);
  const currentState = useMemo(() => getModuleField(module, ['state']) || 'draft', [module]);

  const [tab, setTab] = useState('info');

  const [name, setName] = useState(() => getModuleField(module, ['name', 'title']) ?? '');
  const [slug, setSlug] = useState(() => getModuleField(module, ['slug']) ?? '');
  const [description, setDescription] = useState(() => getModuleField(module, ['description']) ?? '');
  const [icon, setIcon] = useState(() => getModuleField(module, ['icon']) || 'Layers');
  const [color, setColor] = useState(() => getModuleField(module, ['color']) || '#3B82F6');
  const [orderIndex, setOrderIndex] = useState(() => getModuleField(module, ['order_index']) ?? 0);
  const [visible, setVisible] = useState(() => getModuleField(module, ['visible']) !== false);

  const allCapabilities = useMemo(() => CapabilityPackageRegistry.listPackages(), []);

  const [selectedCaps, setSelectedCaps] = useState(() => {
    const rawCaps = getModuleField(module, ['capabilities']);
    if (Array.isArray(rawCaps) && rawCaps.length > 0) {
      return rawCaps.map((c) => String(c.packageId || '').replace('pkg:standard:', '')).filter(Boolean);
    }
    return allCapabilities.filter((c) => c.enabledByDefault).map((c) => c.packageKey);
  });

  const [newState, setNewState] = useState('');
  const [touched, setTouched] = useState({ name: false, slug: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const errors = useMemo(() => {
    const e = {};
    if (!name || String(name).trim().length < 3) e.name = 'Mínimo 3 caracteres';
    if (!slug || String(slug).trim().length === 0) e.slug = 'Requerido';
    else if (!/^[a-z0-9-]+$/.test(String(slug).trim().toLowerCase())) e.slug = 'Solo minúsculas, números y guiones';
    return e;
  }, [name, slug]);

  const canSave = Object.keys(errors).length === 0;

  const allowedTransitions = VALID_TRANSITIONS[currentState] || [];
  const canTransition = newState && allowedTransitions.includes(newState);

  const toggleCap = (key) => {
    setSelectedCaps((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSaveInfo = async () => {
    setTouched({ name: true, slug: true });
    if (!canSave) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await appService.execute(
        createApplicationRequest({
          operation: 'UPDATE_MODULE_METADATA',
          target: id,
          payload: { name: name.trim(), slug: slug.trim().toLowerCase(), description: description.trim() || null },
        }),
        appContext
      );

      if (!result.success) {
        setError(result.error?.message || 'Error actualizando');
        return;
      }

      const visualResult = await appService.execute(
        createApplicationRequest({
          operation: 'UPDATE_MODULE_VISUAL_CONFIG',
          target: id,
          payload: { icon, color, order_index: orderIndex, visible },
        }),
        appContext
      );

      if (!visualResult.success) {
        setError(visualResult.error?.message || 'Error actualizando configuración visual');
        return;
      }

      setSuccess('Módulo actualizado correctamente');
      dispatchModuleChange('update');
      if (typeof onSaved === 'function') onSaved(result.data);
    } catch (err) {
      setError(err?.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCapabilities = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const assignments = selectedCaps.map((key, i) => ({
        assignmentId: `assign:${id}:${key}`,
        moduleId: id,
        packageId: `pkg:standard:${key}`,
        state: 'active',
        owner: 'system',
        version: 'v1',
        orderIndex: i,
      }));

      const result = await appService.execute(
        createApplicationRequest({
          operation: 'ASSIGN_CAPABILITIES',
          target: id,
          payload: { assignments },
        }),
        appContext
      );

      if (!result.success) {
        setError(result.error?.message || 'Error guardando capacidades');
        return;
      }

      setSuccess('Capacidades actualizadas correctamente');
      dispatchModuleChange('update');
    } catch (err) {
      setError(err?.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  const handleStateChange = async () => {
    if (!canTransition) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await appService.execute(
        createApplicationRequest({
          operation: 'CHANGE_MODULE_STATE',
          target: id,
          payload: { newState },
        }),
        appContext
      );

      if (!result.success) {
        setError(result.error?.message || 'Error cambiando estado');
        return;
      }

      setSuccess(`Estado cambiado a "${STATE_OPTIONS.find((s) => s.value === newState)?.label || newState}"`);
      dispatchModuleChange('state-change');
      setNewState('');
      if (typeof onSaved === 'function') onSaved(result.data);
    } catch (err) {
      setError(err?.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          title="Cancelar"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">Editar módulo</h3>
          <p className="text-sm text-gray-500">{name || '—'}</p>
        </div>
        <button
          type="button"
          onClick={() => { if (typeof onDelete === 'function') onDelete(); }}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar módulo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {[
          { key: 'info', label: 'Información' },
          { key: 'capabilities', label: 'Capacidades' },
          { key: 'state', label: 'Estado' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {error && (
          <div className="m-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
        )}
        {success && (
          <div className="m-4 p-4 rounded-2xl bg-green-50 border border-green-200 text-sm text-green-800">{success}</div>
        )}

        {tab === 'info' && (
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del módulo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              />
              {touched.name && errors.name && <div className="mt-1 text-xs text-red-600">{errors.name}</div>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, slug: true }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              />
              {touched.slug && errors.slug && <div className="mt-1 text-xs text-red-600">{errors.slug}</div>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ícono</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`p-2 rounded-lg border transition-colors ${
                        icon === ic ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {(() => { const IconComp = resolveIcon(ic); return <IconComp className="w-4 h-4" />; })()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-colors ${
                        color === c.value ? 'border-gray-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Orden</label>
                <input
                  type="number"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value))}
                  min={0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(e) => setVisible(e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm font-bold text-gray-700">Visible</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSaveInfo}
                disabled={!canSave || saving}
                className="px-6 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}

        {tab === 'capabilities' && (
          <div className="p-6 space-y-5">
            <p className="text-sm text-gray-500">Selecciona las capacidades que tendrá este módulo.</p>

            <div className="space-y-3">
              {allCapabilities.map((cap) => {
                const isSelected = selectedCaps.includes(cap.packageKey);
                const TabIcon = resolveIcon(cap.icon);
                return (
                  <button
                    key={cap.packageKey}
                    type="button"
                    onClick={() => toggleCap(cap.packageKey)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors text-left ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <TabIcon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-900">{cap.displayName}</div>
                      <div className="text-xs text-gray-500">{cap.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSaveCapabilities}
                disabled={saving}
                className="px-6 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar capacidades'}
              </button>
            </div>
          </div>
        )}

        {tab === 'state' && (
          <div className="p-6 space-y-5">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Estado actual</div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                currentState === 'operational' ? 'bg-green-100 text-green-700' :
                currentState === 'configurable' ? 'bg-blue-100 text-blue-700' :
                currentState === 'draft' ? 'bg-gray-100 text-gray-700' :
                currentState === 'deprecated' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {STATE_OPTIONS.find((s) => s.value === currentState)?.label || currentState}
              </span>
            </div>

            {allowedTransitions.length > 0 ? (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Transicionar a</div>
                <div className="flex flex-wrap gap-2">
                  {allowedTransitions.map((ts) => (
                    <button
                      key={ts}
                      type="button"
                      onClick={() => setNewState(ts)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                        newState === ts
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {STATE_OPTIONS.find((s) => s.value === ts)?.label || ts}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay transiciones disponibles desde este estado.</p>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleStateChange}
                disabled={!canTransition || saving}
                className="px-6 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Cambiando...' : 'Cambiar estado'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
