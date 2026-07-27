import { useEffect, useMemo, useState, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import ModuleDetailPanel from './ModuleDetailPanel';
import ModuleEditPanel from './ModuleEditPanel';
import CreateModuleWizard from './CreateModuleWizard';
import { ModuleAdministrationApplicationService } from '../../core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js';
import { ModuleCapabilityPersistenceAdapter } from '../../core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js';
import { createApplicationRequest } from '../../core/applicationLayer/common/contracts/ApplicationRequest.js';
import { createApplicationContext } from '../../core/applicationLayer/common/contracts/ApplicationContext.js';
import { dispatchModuleChange } from '../../core/applicationLayer/moduleAdministration/ModuleChangeBus.js';
import { useAuth } from '../../hooks/useAuth.js';

const persistenceProvider = new ModuleCapabilityPersistenceAdapter();
const appService = new ModuleAdministrationApplicationService({ persistenceProvider });

const STATE_LABELS = {
  draft: 'Borrador',
  configurable: 'Configurable',
  operational: 'Operacional',
  deprecated: 'Deprecado',
  archived: 'Archivado',
};

const STATE_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  configurable: 'bg-blue-100 text-blue-700',
  operational: 'bg-green-100 text-green-700',
  deprecated: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-red-100 text-red-700',
};

const CORE_PROTECTED_SLUGS = ['configuracion'];

function getModuleField(module, keys) {
  for (const k of keys) {
    if (module && module[k] !== undefined && module[k] !== null) return module[k];
  }
  return undefined;
}

export default function ModuleManager() {
  const { user, rol } = useAuth();
  const appContext = useMemo(() => createApplicationContext({
    actorId: user?.id ?? null,
    source: 'ui-module-manager',
    actorRole: rol === 'administrador' ? 'admin' : rol,
  }), [user?.id, rol]);

  const [modules, setModules] = useState([]);
  const [formsByModuleId, setFormsByModuleId] = useState({});
  const [reposByModuleSlug, setReposByModuleSlug] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const moduleLoadRef = useRef(0);

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Nombre' },
      { key: 'slug', label: 'Slug', thClass: 'hidden md:table-cell' },
      { key: 'state', label: 'Estado', thClass: 'hidden sm:table-cell' },
      { key: 'created_at', label: 'Fecha creación', thClass: 'hidden sm:table-cell' },
      { key: 'forms_count', label: 'Formularios', thClass: 'hidden sm:table-cell' },
      { key: 'actions', label: 'Acción' },
    ],
    []
  );

  const refreshModules = async () => {
    const modsResult = await appService.execute(
      createApplicationRequest({ operation: 'GET_MODULES' }),
      appContext
    );
    const mods = modsResult.success !== false ? (modsResult.data || []) : [];
    const adminModules = mods.filter((m) => !CORE_PROTECTED_SLUGS.includes(m.slug));
    setModules(adminModules);
    return adminModules;
  };

  const refreshCounts = async (adminModules) => {
    if (!adminModules || adminModules.length === 0) return;
    const moduleIds = adminModules.map(m => m.id);
    const slugs = adminModules.map(m => m.slug);

    const [formsResult, reposResult] = await Promise.all([
      appService.execute(
        createApplicationRequest({ operation: 'GET_MODULES_FORM_COUNTS', payload: { moduleIds } }),
        appContext
      ),
      appService.execute(
        createApplicationRequest({ operation: 'GET_MODULES_REPOSITORY_COUNTS', payload: { slugs } }),
        appContext
      ),
    ]);

    setFormsByModuleId(formsResult.success !== false ? (formsResult.data || {}) : {});
    setReposByModuleSlug(reposResult.success !== false ? (reposResult.data || {}) : {});
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const adminModules = await refreshModules();
        if (cancelled) return;
        setLoading(false);
        if (adminModules.length > 0) {
          await refreshCounts(adminModules);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const handleSelectModule = async (module) => {
    const loadId = ++moduleLoadRef.current;
    try {
      const configResult = await appService.execute(
        createApplicationRequest({ operation: 'GET_MODULE_CONFIGURATION', target: module.id }),
        appContext
      );
      if (loadId !== moduleLoadRef.current) return;
      if (configResult.success !== false && configResult.data) {
        setSelectedModule(configResult.data);
      } else {
        setSelectedModule(module);
      }
    } catch {
      if (loadId === moduleLoadRef.current) {
        setSelectedModule(module);
      }
    }
  };

  const handleDelete = async (moduleId, moduleName, moduleSlug) => {
    const formsCount = formsByModuleId[moduleId] ?? 0;
    const reposCount = reposByModuleSlug[moduleSlug] ?? 0;

    if (formsCount > 0 || reposCount > 0) {
      const deps = [];
      if (formsCount > 0) deps.push(`- Formularios dinámicos: ${formsCount}`);
      if (reposCount > 0) deps.push(`- Repositorios documentales: ${reposCount}`);
      alert(
        `No es posible eliminar este módulo.\n\n` +
        `El módulo contiene elementos asociados.\n\n` +
        `${deps.join('\n')}\n\n` +
        `Debe eliminar todas las dependencias antes de eliminar el módulo.`
      );
      return;
    }

    if (!window.confirm(`¿Eliminar el módulo "${moduleName}"? Esta acción no se puede deshacer.`)) return;

    try {
      const result = await appService.execute(
        createApplicationRequest({
          operation: 'DELETE_MODULE',
          target: moduleId,
          actor: { id: user?.id ?? null, role: rol === 'administrador' ? 'admin' : rol },
        }),
        appContext
      );

      if (result.success) {
        const adminModules = await refreshModules();
        dispatchModuleChange('delete');
        if (adminModules.length > 0) {
          await refreshCounts(adminModules);
        }
        setSelectedModule(null);
      } else {
        alert(result.error?.message || 'Error eliminando módulo');
      }
    } catch (err) {
      alert(err?.message || 'Error inesperado');
    }
  };

  const handleSavedAndRefresh = async (updatedModule) => {
    if (updatedModule?.id) {
      setIsEditing(false);
      const adminModules = await refreshModules();
      if (adminModules.length > 0) {
        await refreshCounts(adminModules);
      }
      handleSelectModule(updatedModule);
    } else {
      setIsEditing(false);
    }
  };

  if (isCreating) {
    return (
      <CreateModuleWizard
        onCreated={async () => {
          setIsCreating(false);
          const adminModules = await refreshModules();
          if (adminModules.length > 0) {
            await refreshCounts(adminModules);
          }
        }}
        onCancel={() => setIsCreating(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {selectedModule && isEditing ? (
        <ModuleEditPanel
          module={selectedModule}
          formsCount={formsByModuleId[selectedModule?.id] ?? 0}
          onCancel={() => setIsEditing(false)}
          onSaved={handleSavedAndRefresh}
          onDelete={async () => {
            await handleDelete(selectedModule.id, getModuleField(selectedModule, ['name']), getModuleField(selectedModule, ['slug']));
            setIsEditing(false);
          }}
        />
      ) : selectedModule ? (
        <ModuleDetailPanel
          module={selectedModule}
          formsCount={formsByModuleId[selectedModule?.id] ?? 0}
          onBack={() => setSelectedModule(null)}
          onEdit={() => setIsEditing(true)}
          onDelete={() => handleDelete(selectedModule.id, getModuleField(selectedModule, ['name']), getModuleField(selectedModule, ['slug']))}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Gestión de módulos dinámicos</h3>
              <p className="text-sm text-gray-600">Administrar módulos, capacidades y configuración visual.</p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-light transition-colors"
            >
              + Nuevo módulo
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
                        <th key={c.key} className={`px-6 py-4 font-semibold ${c.thClass || ''}`}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modules.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                          No hay módulos configurados. Crea el primero con "+ Nuevo módulo".
                        </td>
                      </tr>
                    ) : (
                      modules.map((m) => {
                        const name = getModuleField(m, ['name', 'title']);
                        const slug = getModuleField(m, ['slug']);
                        const state = getModuleField(m, ['state']) || 'draft';
                        const createdAt = getModuleField(m, ['created_at']);
                        const formsCount = formsByModuleId[m.id] ?? 0;

                        return (
                          <tr key={m.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 max-w-[220px]">
                              <p className="font-bold text-gray-900 truncate">{name || '—'}</p>
                            </td>
                            <td className="px-6 py-4 max-w-[160px] hidden md:table-cell">
                              <p className="text-xs text-gray-500 truncate">{slug || '—'}</p>
                            </td>
                            <td className="px-6 py-4 hidden sm:table-cell">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATE_COLORS[state] || STATE_COLORS.draft}`}>
                                {STATE_LABELS[state] || state}
                              </span>
                            </td>
                            <td className="px-6 py-4 hidden sm:table-cell">
                              <p className="text-xs text-gray-500">{createdAt ? String(createdAt).slice(0, 10) : '—'}</p>
                            </td>
                            <td className="px-6 py-4 hidden sm:table-cell">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {formsCount}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSelectModule(m)}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title="Ver detalle"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(m.id, name, slug)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar módulo"
                                >
                                  <Trash2 className="w-4 h-4" />
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
