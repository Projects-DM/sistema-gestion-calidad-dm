import { useEffect, useMemo, useState } from 'react';
import { Edit } from 'lucide-react';
import ModuleDetailPanel from './ModuleDetailPanel';
import ModuleEditPanel from './ModuleEditPanel';
import { dynamicService } from '../../services/dynamicService';



function getModuleField(module, keys) {
  for (const k of keys) {
    if (module && module[k] !== undefined && module[k] !== null) return module[k];
  }
  return undefined;
}

export default function ModuleManager() {
  const [modules, setModules] = useState([]);
  const [formsByModuleId, setFormsByModuleId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [isEditing, setIsEditing] = useState(false);


  const columns = useMemo(

    () => [
      { key: 'name', label: 'Nombre' },
      { key: 'slug', label: 'Slug' },
      { key: 'created_at', label: 'Fecha creación' },
      { key: 'forms_count', label: 'Cantidad formularios' },
      { key: 'actions', label: 'Acción' },
    ],
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const mods = await dynamicService.getModules();
        if (cancelled) return;
        setModules(mods || []);

        // Form count: permitido por contrato existente dynamicService.getFormsByModule
        const formsMap = {};
        if (typeof dynamicService.getFormsByModule === 'function') {
          await Promise.all(
            (mods || []).map(async (m) => {
              const list = await dynamicService.getFormsByModule(m.id);
              formsMap[m.id] = Array.isArray(list) ? list.length : 0;
            })
          );
        }

        if (cancelled) return;
        setFormsByModuleId(formsMap);
      } catch (e) {
        if (cancelled) return;
        setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      {selectedModule && isEditing ? (
        <ModuleEditPanel
          module={selectedModule}
          formsCount={formsByModuleId[selectedModule?.id] ?? 0}
          onCancel={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
        />
      ) : selectedModule ? (
        <ModuleDetailPanel
          module={selectedModule}
          formsCount={formsByModuleId[selectedModule?.id] ?? 0}
          onBack={() => setSelectedModule(null)}
          onEdit={() => setIsEditing(true)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Gestión de módulos dinámicos</h3>
              <p className="text-sm text-gray-600">Listado administrativo (solo lectura) de metadatos de módulos.</p>
            </div>

            {/* placeholder visual: “+ Nuevo módulo” preparado para futura fase */}
            <button
              type="button"
              className="bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-light transition-colors opacity-60 cursor-not-allowed"
              disabled
              title="Pendiente de implementación (crear módulo)"
            >
              + Nuevo módulo
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="text-sm font-semibold text-gray-900">Estado administrativo</div>
                <div className="text-sm text-gray-600">
                  En esta fase no se renderiza estado porque no se confirma el campo oficial en `sgc_modules`.
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10 text-primary">
                Cargando módulos...
              </div>
            ) : error ? (
              <div className="p-6 text-red-600 text-sm">
                Error cargando módulos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                    <tr>
                      {columns.map((c) => (
                        <th key={c.key} className="px-6 py-4 font-semibold">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modules.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                          No hay módulos configurados.
                        </td>
                      </tr>
                    ) : (
                      modules.map((m) => {
                        const name = getModuleField(m, ['name', 'title']);
                        const slug = getModuleField(m, ['slug']);
                        const createdAt = getModuleField(m, ['created_at']);
                        const formsCount = formsByModuleId[m.id] ?? 0;

                        return (
                          <tr key={m.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">
                              <p className="font-bold text-gray-900">{name || '—'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-gray-500">{slug || '—'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-gray-500">{createdAt ? String(createdAt).slice(0, 10) : '—'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {formsCount}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedModule(m)}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title="Abrir detalle del módulo (interna, sin rutas)"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


