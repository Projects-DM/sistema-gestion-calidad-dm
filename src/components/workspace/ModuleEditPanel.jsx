import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { dynamicService } from '../../services/dynamicService';

function getModuleField(module, keys) {

  for (const k of keys) {
    if (module && module[k] !== undefined && module[k] !== null) return module[k];
  }
  return undefined;
}

export default function ModuleEditPanel({ module, onCancel, onSaved, formsCount }) {
  const id = useMemo(() => getModuleField(module, ['id']), [module]);
  const createdAt = useMemo(() => getModuleField(module, ['created_at']), [module]);
  const nameCurrent = useMemo(() => getModuleField(module, ['name', 'title']) ?? '', [module]);
  const slugCurrent = useMemo(() => getModuleField(module, ['slug']) ?? '', [module]);

  const [name, setName] = useState(nameCurrent);
  const [slug, setSlug] = useState(slugCurrent);
  const [touched, setTouched] = useState({ name: false, slug: false });
  const [savingInfoVisible, setSavingInfoVisible] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


  const errors = useMemo(() => {
    const e = {};

    // Nombre: obligatorio, mínimo 3 caracteres
    if (!name || String(name).trim().length === 0) {
      e.name = 'El nombre es obligatorio.';
    } else if (String(name).trim().length < 3) {
      e.name = 'El nombre debe tener al menos 3 caracteres.';
    }

    // Slug: obligatorio para esta UI de edición
    if (!slug || String(slug).trim().length === 0) {
      e.slug = 'El slug es obligatorio.';
    }

    return e;
  }, [name, slug]);

  const canSave = Object.keys(errors).length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched({ name: true, slug: true });
    setError('');
    setSuccess('');

    if (!canSave) return;

    try {
      setSavingInfoVisible(true);

      const payload = {
        id,
        name: name.trim(),
        slug,
      };

      const result = await dynamicService.updateModule(payload);

      if (result && result.success === true) {
        setSuccess('Módulo actualizado correctamente');
        if (typeof onSaved === 'function') {
          onSaved(result.updatedModule);
        }
      } else {
        const msg = result?.error || 'No fue posible actualizar el módulo';
        setError(msg);
      }
    } catch (err) {
      setError(err?.message || 'No fue posible actualizar el módulo');
    } finally {
      setSavingInfoVisible(false);
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
        <div>
          <h3 className="text-lg font-bold text-gray-900">Editar módulo</h3>
          <p className="text-sm text-gray-500">Edición administrativa (sin persistencia por fase).</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</div>
              <div className="text-base font-medium text-gray-900">{id || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha creación</div>
              <div className="text-base font-medium text-gray-900">
                {createdAt ? String(createdAt).slice(0, 10) : '—'}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cantidad formularios</div>
              <div className="text-base font-medium text-gray-900">{formsCount ?? 0}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado administrativo</div>
              <div className="text-sm font-medium text-gray-900">Pendiente de contrato oficial</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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

          {savingInfoVisible && (
            <div className="mt-2 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-sm text-blue-900">
              Guardando módulo...
            </div>
          )}

          {!!error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          {!!success && (
            <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-sm text-green-800">
              {success}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSave || savingInfoVisible}
              className="px-6 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Guardar módulo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

