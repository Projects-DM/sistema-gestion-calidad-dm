import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Layers,
  MoveUp,
  MoveDown,
  FileText,
  Save,
  X,
  ShieldCheck,
  Beaker,
  Package,
  Factory,
  Briefcase,
  Settings,
  Wrench,
  Bell,
} from 'lucide-react';
import { documentRepositoriesService } from '../../services/documentRepositoriesService';
import { ModuleAdministrationApplicationService } from '../../core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js';
import { ModuleCapabilityPersistenceAdapter } from '../../core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js';
import { createApplicationRequest } from '../../core/applicationLayer/common/contracts/ApplicationRequest.js';
import { onModuleChange } from '../../core/applicationLayer/moduleAdministration/ModuleChangeBus.js';
import AlertConfigurationPanel from '../../modules/experiences/AlertConfigurationPanel.jsx';
import { alertConfigurationPersistence } from '../../modules/experiences/AlertConfigurationPersistenceAdapter.js';

const persistenceProvider = new ModuleCapabilityPersistenceAdapter();
const appService = new ModuleAdministrationApplicationService({ persistenceProvider });

const ICON_WHITELIST = {
  ShieldCheck: 'ShieldCheck',
  Beaker: 'Beaker',
  Package: 'Package',
  Factory: 'Factory',
  Briefcase: 'Briefcase',
  Settings: 'Settings',
  FileText: 'FileText',
  Wrench: 'Wrench',
};

const ICON_COMPONENTS = {
  ShieldCheck,
  Beaker,
  Package,
  Factory,
  Briefcase,
  Settings,
  FileText,
  Wrench,
};

function iconAllowed(iconKey) {
  return !!(iconKey && ICON_WHITELIST[iconKey]);
}

function normalizeIconKey(iconKey) {
  return iconAllowed(iconKey) ? iconKey : null;
}

function IconPreview({ iconKey, className = '' }) {
  const normalized = normalizeIconKey(iconKey) || 'FileText';
  const Icon = ICON_COMPONENTS[normalized] || FileText;
  return <Icon className={className} />;
}

function ModalShell({ open, title, icon, onClose, children, saving }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const Icon = icon;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onMouseDown={(e) => {
          // click fuera: solo si el click inicia en el overlay
          if (e.target === e.currentTarget) onClose();
        }}
      />

      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 bg-primary text-white flex items-center justify-between flex-none">
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" />
            <h3 className="font-bold text-lg">{title}</h3>
          </div>
          <button
            type="button"
            className="p-2 hover:bg-white/10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function DocumentRepositoriesAdmin() {

  const [activeRepositoryId, setActiveRepositoryId] = useState(null);

  const [repositories, setRepositories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modules, setModules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [editingRepo, setEditingRepo] = useState(null);
  const [repoForm, setRepoForm] = useState({
    slug: '',
    name: '',
    description: '',
    module_slug: '',
    icon_key: 'FileText',
    is_active: true,
  });

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catForm, setCatForm] = useState({
    category_key: '',
    name: '',
    description: '',
    icon_key: 'FileText',
    sort_order: 0,
    is_active: true,
  });

  const [alertConfigTarget, setAlertConfigTarget] = useState(null);

  const repo = useMemo(() => repositories.find(r => r.id === activeRepositoryId) || null, [repositories, activeRepositoryId]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await documentRepositoriesService.getRepositories();
        setRepositories(data);
        if (data.length && !activeRepositoryId) {
          setActiveRepositoryId(data[0].id);
        }
      } catch (e) {
        console.error(e);
        alert('Error cargando repositorios documentales: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const result = await appService.execute(
          createApplicationRequest({ operation: 'GET_MODULES' }),
          { actorId: null, actorRole: 'admin', source: 'document-repositories-admin' }
        );
        const mods = result.success !== false ? (result.data || []) : [];
        setModules(mods.filter((m) => m.slug !== 'configuracion'));
      } catch (e) {
        console.error('Error loading modules for repository admin:', e);
      }
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = onModuleChange(() => {
      appService.execute(
        createApplicationRequest({ operation: 'GET_MODULES' }),
        { actorId: null, actorRole: 'admin', source: 'document-repositories-admin' }
      )      .then((result) => {
        if (result.success !== false) setModules((result.data || []).filter((m) => m.slug !== 'configuracion'));
      }).catch(() => {});
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    (async () => {
      if (!activeRepositoryId) return;
      try {
        setLoading(true);
        const cats = await documentRepositoriesService.getCategories(activeRepositoryId);
        setCategories(cats);
      } catch (e) {
        console.error(e);
        alert('Error cargando categorías: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeRepositoryId]);

  const openCreateRepo = () => {
    setEditingRepo(null);
    setRepoForm({
      slug: '',
      name: '',
      description: '',
      module_slug: '',
      icon_key: 'FileText',
      is_active: true,
    });
    setRepoModalOpen(true);
  };

  const openEditRepo = (r) => {
    setEditingRepo(r);
    setRepoForm({
      slug: r.slug,
      name: r.name,
      description: r.description || '',
      module_slug: r.module_slug,
      icon_key: r.icon_key || 'FileText',
      is_active: r.is_active,
    });
    setRepoModalOpen(true);
  };

  const submitRepo = async (e) => {
    e.preventDefault();

    if (!repoForm.slug.trim()) return alert('Slug requerido');
    if (!repoForm.name.trim()) return alert('Nombre requerido');
    if (!repoForm.module_slug.trim()) return alert('Módulo destino requerido');

    const payload = {
      ...repoForm,
      icon_key: normalizeIconKey(repoForm.icon_key) || 'FileText',
    };

    try {
      setSaving(true);
      if (editingRepo) {
        await documentRepositoriesService.updateRepository(editingRepo.id, payload);
      } else {
        await documentRepositoriesService.createRepository(payload);
      }

      const data = await documentRepositoriesService.getRepositories();
      setRepositories(data);
      // mantener selección si existe
      if (editingRepo) {
        const still = data.find(x => x.id === editingRepo.id);
        if (still) setActiveRepositoryId(still.id);
      } else if (data.length) {
        const newly = data.find(x => x.slug === payload.slug);
        if (newly) setActiveRepositoryId(newly.id);
      }

      setRepoModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error guardando repositorio: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRepo = async (repositoryId) => {
    if (!window.confirm('¿Eliminar el repositorio documental? Las categorías se eliminarán en cascada.')) return;
    try {
      setSaving(true);
      await documentRepositoriesService.deleteRepository(repositoryId);
      const data = await documentRepositoriesService.getRepositories();
      setRepositories(data);
      setActiveRepositoryId(data.length ? data[0].id : null);
      setCategories([]);
    } catch (err) {
      console.error(err);
      alert('Error eliminando repositorio: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openCreateCategory = () => {
    const maxSort = (categories || []).reduce((acc, c) => Math.max(acc, c.sort_order ?? 0), 0);
    setEditingCategory(null);
    setCatForm({
      category_key: '',
      name: '',
      description: '',
      icon_key: 'FileText',
      sort_order: maxSort + 1,
      is_active: true,
    });
    setCatModalOpen(true);
  };

  const openEditCategory = (c) => {
    setEditingCategory(c);
    setCatForm({
      category_key: c.category_key,
      name: c.name,
      description: c.description || '',
      icon_key: c.icon_key || 'FileText',
      sort_order: c.sort_order ?? 0,
      is_active: c.is_active,
    });
    setCatModalOpen(true);
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    if (!activeRepositoryId) return;

    if (!catForm.category_key.trim()) return alert('category_key requerido');
    if (!catForm.name.trim()) return alert('Nombre de categoría requerido');

    const payload = {
      ...catForm,
      icon_key: normalizeIconKey(catForm.icon_key) || 'FileText',
      sort_order: Number.isInteger(Number(catForm.sort_order)) ? Number(catForm.sort_order) : 0,
    };

    try {
      setSaving(true);
      if (editingCategory) {
        await documentRepositoriesService.updateCategory(editingCategory.id, payload);
      } else {
        await documentRepositoriesService.createCategory(activeRepositoryId, payload);
      }
      const cats = await documentRepositoriesService.getCategories(activeRepositoryId);
      setCategories(cats);
      setCatModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error guardando categoría: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return;
    try {
      setSaving(true);
      await documentRepositoriesService.deleteCategory(categoryId);
      const cats = await documentRepositoriesService.getCategories(activeRepositoryId);
      setCategories(cats);
    } catch (err) {
      console.error(err);
      alert('Error eliminando categoría: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const moveCategory = async (categoryId, direction) => {
    // direction: 'up' | 'down'
    const idx = categories.findIndex(c => c.id === categoryId);
    if (idx < 0) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;

    const next = [...categories];
    const [sp] = next.splice(idx, 1);
    next.splice(targetIdx, 0, sp);

    const orderedCategoryIds = next.map(c => c.id);

    try {
      setSaving(true);
      await documentRepositoriesService.reorderCategories({ repositoryId: activeRepositoryId, orderedCategoryIds });
      setCategories(next.map((c, i) => ({ ...c, sort_order: i })));
    } catch (err) {
      console.error(err);
      alert('Error reordenando categoría: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-7 h-7 text-accent" />
            Repositorios Documentales
          </h1>
          <p className="text-xs text-gray-500 mt-1">Configura repositorios y categorías para la gestión documental.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={openCreateRepo}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-primary hover:bg-primary-light text-white rounded-xl font-bold transition-all shadow-md shadow-primary/20 w-full sm:w-auto text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            <Plus className="w-4 h-4" /> Nuevo Repositorio Documental
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <Layers className="w-4 h-4 text-primary" />
                  Repositorios
                </div>
                <div className="text-xs text-gray-500">{repositories.length}</div>
              </div>

              <div className="max-h-[60vh] overflow-auto">
                {repositories.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500">No hay repositorios aún.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {repositories.map((r) => (
                      <li
                        key={r.id}
                        className={`p-4 cursor-pointer hover:bg-primary/[0.03] transition-colors ${r.id === activeRepositoryId ? 'bg-primary/[0.06]' : ''}`}
                        onClick={() => setActiveRepositoryId(r.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-gray-900 text-sm truncate">{r.name}</div>
                            <div className="text-[11px] text-gray-500 mt-1 truncate hidden md:block">{r.slug} · {r.module_slug}</div>
                            <div className={`mt-2 text-[11px] inline-flex px-2 py-0.5 rounded-full font-bold border ${r.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {r.is_active ? 'Activo' : 'Inactivo'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="p-1.5 text-amber-500 hover:text-amber-600 bg-white border border-gray-200 rounded-lg"
                              onClick={(e) => { e.stopPropagation(); setAlertConfigTarget(r); }}
                              title="Configurar alertas del repositorio"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 text-gray-400 hover:text-primary bg-white border border-gray-200 rounded-lg"
                              onClick={(e) => { e.stopPropagation(); openEditRepo(r); }}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 text-gray-400 hover:text-red-600 bg-white border border-gray-200 rounded-lg"
                              onClick={(e) => { e.stopPropagation(); deleteRepo(r.id); }}
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <div className="font-bold text-gray-900 truncate">{repo ? repo.name : 'Selecciona un repositorio'}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {repo ? `module_slug: ${repo.module_slug} · slug: ${repo.slug}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                  <button
                    disabled={!activeRepositoryId || saving}
                    onClick={openCreateCategory}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-xl font-bold transition-all shadow-md shadow-primary/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" /> Nueva Categoría
                  </button>
                </div>
              </div>

              <div className="p-4">
                {categories.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500">No hay categorías para este repositorio.</div>
                ) : (
                  <div className="space-y-3">
                    {categories.map((c, idx) => (
                      <div key={c.id} className="p-4 rounded-2xl border border-gray-200 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                <IconPreview iconKey={c.icon_key} className="w-5 h-5 text-gray-400" />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">{c.name}</div>
                                <div className="text-xs text-gray-500 mt-1">category_key: {c.category_key}</div>
                                <div className={`mt-2 text-[11px] inline-flex px-2 py-0.5 rounded-full font-bold border ${c.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                  {c.is_active ? 'Activo' : 'Inactivo'}
                                </div>
                              </div>
                            </div>

                            {c.description ? (
                              <div className="text-sm text-gray-600 mt-3">{c.description}</div>
                            ) : null}

                            <div className="text-xs text-gray-400 mt-2">Orden: {idx + 1}</div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              disabled={idx === 0 || saving}
                              className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => moveCategory(c.id, 'up')}
                              title="Subir"
                            >
                              <MoveUp className="w-4 h-4" />
                            </button>
                            <button
                              disabled={idx === categories.length - 1 || saving}
                              className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => moveCategory(c.id, 'down')}
                              title="Bajar"
                            >
                              <MoveDown className="w-4 h-4" />
                            </button>
                            <button
                              disabled={saving}
                              className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-primary"
                              onClick={() => openEditCategory(c)}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              disabled={saving}
                              className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-red-600"
                              onClick={() => deleteCategory(c.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Repositorio */}
      <ModalShell
        open={repoModalOpen}
        title={editingRepo ? 'Editar repositorio documental' : 'Nuevo repositorio documental'}
        icon={FileText}
        saving={saving}
        onClose={() => setRepoModalOpen(false)}
      >
        <form onSubmit={submitRepo} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Slug *</label>
              <input
                disabled={!!editingRepo}
                value={repoForm.slug}
                onChange={(e) => setRepoForm({ ...repoForm, slug: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-60"
                placeholder="certificados-calidad"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Módulo destino *</label>
              <select
                value={repoForm.module_slug}
                onChange={(e) => setRepoForm({ ...repoForm, module_slug: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Selecciona un módulo...</option>
                {modules.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
            <input
              value={repoForm.name}
              onChange={(e) => setRepoForm({ ...repoForm, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Certificados de Calidad"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
            <input
              value={repoForm.description}
              onChange={(e) => setRepoForm({ ...repoForm, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Repositorio por categorías"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 mb-0">Icono</label>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <IconPreview iconKey={repoForm.icon_key} className="w-5 h-5 text-gray-500" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate">
                  {repoForm.icon_key && iconAllowed(repoForm.icon_key) ? repoForm.icon_key : 'FileText'}
                </div>
                <div className="text-xs text-gray-500">Selecciona el icono del repositorio.</div>
              </div>
            </div>
            <select
              value={repoForm.icon_key}
              onChange={(e) => setRepoForm({ ...repoForm, icon_key: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Object.values(ICON_WHITELIST).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={repoForm.is_active}
                onChange={(e) => setRepoForm({ ...repoForm, is_active: e.target.checked })}
                disabled={saving}
              />
              <span className="text-sm font-bold text-gray-700">Activo</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setRepoModalOpen(false)}
              className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Modal: Categoría */}
      <ModalShell
        open={catModalOpen}
        title={editingCategory ? 'Editar categoría' : 'Nueva categoría'}
        icon={FileText}
        saving={saving}
        onClose={() => setCatModalOpen(false)}
      >
        <form onSubmit={submitCategory} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">category_key *</label>
            <input
              value={catForm.category_key}
              onChange={(e) => setCatForm({ ...catForm, category_key: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="productos_quimicos"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
            <input
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Productos Químicos"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
            <input
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Categoria técnica"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Orden</label>
              <input
                type="number"
                value={catForm.sort_order}
                onChange={(e) => setCatForm({ ...catForm, sort_order: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 mb-0">Ícono</label>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <IconPreview iconKey={catForm.icon_key} className="w-5 h-5 text-gray-500" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-900 truncate">
                  {catForm.icon_key && iconAllowed(catForm.icon_key) ? catForm.icon_key : 'FileText'}
                </div>
                <div className="text-xs text-gray-500">Seleccione un ícono para la categoría.</div>
              </div>
            </div>
            <select
              value={catForm.icon_key}
              onChange={(e) => setCatForm({ ...catForm, icon_key: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {Object.values(ICON_WHITELIST).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={catForm.is_active}
                onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })}
              />
              <span className="text-sm font-bold text-gray-700">Activo</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCatModalOpen(false)}
              className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Modal: Alert Configuration */}
      <ModalShell
        open={!!alertConfigTarget}
        title={alertConfigTarget ? `Alertas: ${alertConfigTarget.name}` : 'Alertas'}
        icon={Bell}
        saving={saving}
        onClose={() => setAlertConfigTarget(null)}
      >
        <div className="p-6">
          {alertConfigTarget && (
            <AlertConfigurationPanel
              resourceKind="documentRepository"
              resource={alertConfigTarget}
              persistence={alertConfigurationPersistence}
              onSaved={() => {
                const repoRow = { ...alertConfigTarget };
                setAlertConfigTarget(null);
                documentRepositoriesService
                  .getRepositoryById(repoRow.id)
                  .then((fresh) => {
                    if (fresh) {
                      setRepositories((prev) =>
                        prev.map((r) => (String(r.id) === String(fresh.id) ? fresh : r)),
                      );
                    }
                  })
                  .catch(() => {});
              }}
            />
          )}
        </div>
      </ModalShell>
    </div>
  );
}

