import { useEffect, useMemo, useState } from 'react';
import { Edit } from 'lucide-react';
import ModuleDetailPanel from './ModuleDetailPanel';
import ModuleEditPanel from './ModuleEditPanel';
import { ModuleAdministrationApplicationService } from '../../core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js';
import { createApplicationRequest } from '../../core/applicationLayer/common/contracts/ApplicationRequest.js';
import { createApplicationContext } from '../../core/applicationLayer/common/contracts/ApplicationContext.js';

const appService = new ModuleAdministrationApplicationService();
const appContext = createApplicationContext({ actorId: 'ui-module-manager', actorRole: 'admin' });



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

        const modsResult = await appService.execute(
          createApplicationRequest({ operation: 'GET_MODULES' }),
          appContext
        );
        if (cancelled) return;
        const mods = modsResult.success !== false ? (modsResult.data || []) : [];
        setModules(mods);

        const formsMap = {};
        await Promise.all(
          mods.map(async (m) => {
            const configResult = await appService.execute(
              createApplicationRequest({ operation: 'GET_MODULE_CONFIGURATION', target: m.id }),
              appContext
            );
            formsMap[m.id] = configResult.success !== false
              ? (configResult.data?.forms?.length || 0)
              : 0;
          })
        );

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
          onSaved={async (updatedModule) => {
            if (updatedModule?.id) {
              setIsEditing(false);

              const refreshedResult = await appService.execute(
                createApplicationRequest({ operation: 'GET_MODULES' }),
                appContext
              );
              const refreshed = refreshedResult.success !== false ? (refreshedResult.data || []) : [];
              setModules(refreshed);

              const refreshedSelected = (refreshed || []).find(
                (m) => m.id === updatedModule.id
              );
              if (refreshedSelected) setSelectedModule(refreshedSelected);
            } else {
              setIsEditing(false);
            }
          }}
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
                                  onClick={() => {
                                    setSelectedModule(m);
                                  }}
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


