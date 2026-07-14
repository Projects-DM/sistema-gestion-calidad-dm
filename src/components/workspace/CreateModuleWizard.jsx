import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ListChecks, History, FileText, Layers, ClipboardList, BarChart3, Settings, Users, Package, Shield, Truck, Wrench, Heart, GraduationCap, Building2 } from 'lucide-react';
import { ModuleAdministrationApplicationService } from '../../core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js';
import { ModuleCapabilityPersistenceAdapter } from '../../core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js';
import { createApplicationRequest } from '../../core/applicationLayer/common/contracts/ApplicationRequest.js';
import { createApplicationContext } from '../../core/applicationLayer/common/contracts/ApplicationContext.js';
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

const ICON_MAP = { Layers, ClipboardList, FileText, ListChecks, History, BarChart3, Settings, Users, Package, Shield, Truck, Wrench, Heart, GraduationCap, Building2 };

function resolveIcon(name) {
  return ICON_MAP[name] || ListChecks;
}

const TOTAL_STEPS = 5;

export default function CreateModuleWizard({ onCreated, onCancel }) {
  const { user, rol } = useAuth();
  const appContext = useMemo(() => createApplicationContext({
    actorId: user?.id ?? null,
    source: 'ui-create-wizard',
    actorRole: rol === 'administrador' ? 'admin' : rol,
  }), [user?.id, rol]);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Layers');
  const [color, setColor] = useState('#3B82F6');
  const [orderIndex, setOrderIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const [category, setCategory] = useState('');
  const [group, setGroup] = useState('');

  const allCapabilities = useMemo(() => CapabilityPackageRegistry.listPackages(), []);
  const [selectedCaps, setSelectedCaps] = useState(() =>
    allCapabilities.filter((c) => c.enabledByDefault).map((c) => c.packageKey)
  );

  const toggleCap = (key) => {
    setSelectedCaps((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const errors = useMemo(() => {
    const e = {};
    if (!name || String(name).trim().length < 3) e.name = 'Mínimo 3 caracteres';
    if (!slug || String(slug).trim().length === 0) e.slug = 'Requerido';
    else if (!/^[a-z0-9-]+$/.test(String(slug).trim().toLowerCase())) e.slug = 'Solo minúsculas, números y guiones';
    return e;
  }, [name, slug]);

  const canNext = useMemo(() => {
    if (step === 1) return Object.keys(errors).length === 0;
    if (step === 3) return selectedCaps.length > 0;
    return true;
  }, [step, errors, selectedCaps]);

  const previewTabs = useMemo(() => {
    return allCapabilities
      .filter((c) => selectedCaps.includes(c.packageKey))
      .sort((a, b) => a.defaultOrder - b.defaultOrder);
  }, [allCapabilities, selectedCaps]);

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const createResult = await appService.execute(
        createApplicationRequest({
          operation: 'CREATE_MODULE',
          payload: {
            name: name.trim(),
            slug: slug.trim().toLowerCase(),
            description: description.trim() || null,
            icon,
            color,
            order_index: orderIndex,
            visible,
            category: category.trim() || null,
            grupo: group.trim() || null,
          },
          actor: { id: user?.id ?? null, role: rol === 'administrador' ? 'admin' : rol },
        }),
        appContext
      );

      if (!createResult.success) {
        setError(createResult.error?.message || 'Error creando módulo');
        return;
      }

      const moduleId = createResult.data?.id;

      if (moduleId && selectedCaps.length > 0) {
        const assignments = selectedCaps.map((key, i) => ({
          assignmentId: `assign:${moduleId}:${key}`,
          moduleId,
          packageId: `pkg:standard:${key}`,
          state: 'active',
          owner: 'system',
          version: 'v1',
          orderIndex: i,
        }));

        const assignResult = await appService.execute(
          createApplicationRequest({
            operation: 'ASSIGN_CAPABILITIES',
            target: moduleId,
            payload: { assignments },
            actor: { id: user?.id ?? null, role: rol === 'administrador' ? 'admin' : rol },
          }),
          appContext
        );

        if (!assignResult.success) {
          setError(assignResult.error?.message || 'Error asignando capacidades');
          return;
        }
      }

      if (moduleId) {
        const stateResult = await appService.execute(
          createApplicationRequest({
            operation: 'CHANGE_MODULE_STATE',
            target: moduleId,
            payload: { newState: 'configurable' },
            actor: { id: user?.id ?? null, role: rol === 'administrador' ? 'admin' : rol },
          }),
          appContext
        );

        if (!stateResult.success) {
          setError(stateResult.error?.message || 'Error cambiando estado');
          return;
        }
      }

      setSuccess('Módulo creado correctamente');
      setTimeout(() => {
        if (typeof onCreated === 'function') onCreated(createResult.data);
      }, 800);
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
          <h3 className="text-lg font-bold text-gray-900">Crear nuevo módulo</h3>
          <p className="text-sm text-gray-500">Paso {step} de {TOTAL_STEPS}</p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i + 1 <= step ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {step === 1 && (
          <div className="p-6 space-y-5">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Información general</h4>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del módulo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Control de Proveedores"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              />
              {errors.name && <div className="mt-1 text-xs text-red-600">{errors.name}</div>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Ej: control-proveedores"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              />
              {errors.slug && <div className="mt-1 text-xs text-red-600">{errors.slug}</div>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Descripción opcional del módulo"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ícono</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((ic) => {
                    const IconComp = resolveIcon(ic);
                    return (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setIcon(ic)}
                        className={`p-2 rounded-lg border transition-colors ${
                          icon === ic ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        title={ic}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
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
                      title={c.label}
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
          </div>
        )}

        {step === 2 && (
          <div className="p-6 space-y-5">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Programa</h4>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Categoría</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej: Gestión de Calidad"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Grupo</label>
              <input
                type="text"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                placeholder="Ej: Procesos Críticos"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <p className="text-xs text-gray-400">Estos campos son opcionales y se usarán para organizar módulos en el futuro.</p>
          </div>
        )}

        {step === 3 && (
          <div className="p-6 space-y-5">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Capacidades</h4>
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
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
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

            {selectedCaps.length === 0 && (
              <p className="text-xs text-red-600">Debes seleccionar al menos una capacidad.</p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="p-6 space-y-5">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Vista previa</h4>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg" style={{ backgroundColor: color + '20' }}>
                  {(() => { const PreviewIcon = resolveIcon(icon); return <PreviewIcon className="w-5 h-5" />; })()}
                </div>
                <div>
                  <div className="text-base font-bold text-gray-900">{name || 'Sin nombre'}</div>
                  <div className="text-xs text-gray-500">{slug || 'sin-slug'}</div>
                </div>
              </div>
              {description && (
                <p className="text-sm text-gray-600 mb-3">{description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {category && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{category}</span>}
                {group && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">{group}</span>}
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">Orden: {orderIndex}</span>
                <span className={`px-2 py-1 rounded-full ${visible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {visible ? 'Visible' : 'Oculto'}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pestañas de navegación</div>
              <div className="flex border-b border-gray-200 gap-6">
                {previewTabs.map((tab) => {
                  const TabIcon = resolveIcon(tab.icon);
                  return (
                    <div key={tab.packageKey} className="flex items-center gap-2 pb-3 border-b-2 border-primary text-primary text-sm font-bold">
                      <TabIcon className="w-4 h-4" />
                      {tab.displayName}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Componentes del motor</div>
              <div className="flex flex-wrap gap-2">
                {selectedCaps.includes('forms') && (
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">Formularios Dinámicos</span>
                )}
                {selectedCaps.includes('records') && (
                  <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium">Historial y Consultas</span>
                )}
                {selectedCaps.includes('repository') && (
                  <span className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium">Repositorio Documental</span>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="p-6 space-y-5">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Crear módulo</h4>

            {saving && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-sm text-blue-900">
                Creando módulo...
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-800">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-sm text-green-800">
                {success}
              </div>
            )}

            {!saving && !error && !success && (
              <p className="text-sm text-gray-600">
                Haz clic en "Crear módulo" para finalizar. El módulo se creará con estado <strong>Configurable</strong> y las capacidades seleccionadas.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={step === 1 ? onCancel : () => setStep((s) => s - 1)}
          className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 1 ? 'Cancelar' : 'Anterior'}
        </button>

        <div className="flex gap-3">
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="px-6 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !!success}
              className="px-6 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Crear módulo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
