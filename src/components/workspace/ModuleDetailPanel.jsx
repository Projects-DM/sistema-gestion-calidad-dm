import { useMemo } from 'react';
import { ArrowLeft, Edit2 } from 'lucide-react';

import ModuleEditPanel from './ModuleEditPanel';


function getModuleField(module, keys) {
  for (const k of keys) {
    if (module && module[k] !== undefined && module[k] !== null) return module[k];
  }
  return undefined;
}

export default function ModuleDetailPanel({ module, onBack, formsCount, onEdit }) {
  const [isEditing, setIsEditing] = useMemo(() => [false, () => {}], []);
  // Nota: el estado real se maneja en ModuleManager; aquí solo se renderiza cuando ModuleManager activa el modo.
  const name = useMemo(() => getModuleField(module, ['name', 'title']), [module]);
  const slug = useMemo(() => getModuleField(module, ['slug']), [module]);
  const createdAt = useMemo(() => getModuleField(module, ['created_at']), [module]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          title="Volver a módulos"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Detalle del módulo</h3>
          <p className="text-sm text-gray-500">Panel administrativo (solo interno, sin rutas nuevas).</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</div>
              <div className="text-base font-bold text-gray-900">{name || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</div>
              <div className="text-base font-bold text-gray-900">{slug || '—'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha creación</div>
              <div className="text-base font-medium text-gray-900">
                {createdAt ? String(createdAt).slice(0, 10) : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Formularios asociados</div>
              <div className="text-2xl font-bold text-gray-900">{formsCount ?? 0}</div>
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
              <div className="font-bold mb-1">Estado administrativo</div>
              <div className="text-blue-800/90">
                Pendiente de contrato oficial (sin columna Estado implementada en esta fase).
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold hover:bg-primary/15 transition-colors"
                onClick={() => {
                  // Se delega el cambio de modo al componente padre (ModuleManager).
                  // Si el padre provee setIsEditing, lo usará; si no, no ocurre navegación.
                  if (typeof onEdit === 'function') onEdit();
                }}
                title="Entrar a modo edición interna"
              >
                <Edit2 className="w-4 h-4" />
                Editar módulo
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

