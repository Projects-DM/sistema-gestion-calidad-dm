import { useEffect, useMemo, useState } from 'react';
import { FileText, Folder, UploadCloud, Eye, RefreshCw, Trash2, Loader2 } from 'lucide-react';

import { documentRepositoriesService } from '../../services/documentRepositoriesService';
import { documentsService } from '../../services/documentsService';
import { useAuth } from '../../hooks/useAuth';

const MODULES_CATEGORY_PLACEHOLDER = {
  // Para mantener UI idéntica a Trazabilidad/Certificados/Fichas,
  // pero sin inventar catálogo: usamos las categorías del admin.
  // Estos defaults solo se usan si por alguna razón no cargan categorías.
  operaciones: [],
  trazabilidad: [],
  'medicion-control': [],
  mantenimiento: [],
  calidad: [],
  'gestion-documental': [],
};

function safeFileType(type) {
  if (!type) return 'application/pdf';
  return type;
}

export default function ModuleDocumentViewer({ moduleSlug }) {
  const { user, isAdmin, isCalidad } = useAuth();
  const canManage = isAdmin || isCalidad;

  const [loading, setLoading] = useState(true);
  const [repositories, setRepositories] = useState([]);
  const [activeRepositoryId, setActiveRepositoryId] = useState(null);
  const [categories, setCategories] = useState([]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [docsByCategory, setDocsByCategory] = useState({}); // { [categoryKey]: records[] }
  const [viewerDoc, setViewerDoc] = useState(null);

  const uploadInputId = useMemo(() => `upload_${moduleSlug}_${Date.now()}`, [moduleSlug]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const repos = await documentRepositoriesService.getRepositories({ moduleSlug });
        setRepositories(repos);
        const first = repos?.[0]?.id ?? null;
        setActiveRepositoryId(first);
      } catch (e) {
        console.error(e);
        alert('Error cargando repositorios documentales.');
      } finally {
        setLoading(false);
      }
    })();
  }, [moduleSlug]);

  useEffect(() => {
    (async () => {
      if (!activeRepositoryId) {
        setCategories([]);
        setDocsByCategory({});
        return;
      }

      try {
        setLoading(true);
        const cats = await documentRepositoriesService.getCategories(activeRepositoryId);
        setCategories(cats);

        // Cargar documentos existentes usando el patrón actual del sistema.
        // documentsService agrupa por `type` (categoryKey) en sgc_records.
        const next = {};
        await Promise.all(
          cats.map(async (c) => {
            const records = await documentsService.getRecords(moduleSlug, c.category_key);
            next[c.category_key] = records || [];
          })
        );
        setDocsByCategory(next);
      } catch (e) {
        console.error(e);
        alert('Error cargando documentos del repositorio.');
      } finally {
        setLoading(false);
      }
    })();
  }, [activeRepositoryId, moduleSlug]);

  const moduleTitle = useMemo(() => {
    switch (moduleSlug) {
      case 'mantenimiento':
        return 'Mantenimiento';
      case 'calidad':
        return 'Calidad';
      case 'gestion-documental':
        return 'Gestión Documental';
      case 'operaciones':
        return 'Operaciones';
      // Nota: Trazabilidad NO es un módulo documental por defecto.
      // Si se llegara a renderizar, se verá con el slug literal.
      case 'trazabilidad':
        return 'trazabilidad';
      default:
        return moduleSlug;
    }
  }, [moduleSlug]);


  const handleUpload = async (categoryKey, file) => {
    if (!file) return;
    if (file.type !== safeFileType('application/pdf')) {
      alert('Solo se permiten archivos PDF.');
      return;
    }
    if (!activeRepositoryId) return;

    try {
      setUploading(true);
      await documentsService.uploadRecord(moduleSlug, categoryKey, file, user.id);

      const records = await documentsService.getRecords(moduleSlug, categoryKey);
      setDocsByCategory((prev) => ({
        ...prev,
        [categoryKey]: records || [],
      }));
    } catch (e) {
      console.error(e);
      alert('Error al subir documento: ' + (e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  const handleReplace = async (record, file) => {
    // En el sistema actual se maneja como upload de nuevo.
    // Para “reemplazar”, eliminamos y subimos.
    try {
      setSaving(true);
      await documentsService.deleteRecord(record.id, record.storage_path);
      await handleUpload(record.type, file);
    } catch (e) {
      console.error(e);
      alert('Error al reemplazar documento: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (record) => {
    if (!window.confirm(`¿Eliminar "${record.name}"?`)) return;
    try {
      setSaving(true);
      await documentsService.deleteRecord(record.id, record.storage_path);
      const categoryKey = record.type;
      const records = await documentsService.getRecords(moduleSlug, categoryKey);
      setDocsByCategory((prev) => ({
        ...prev,
        [categoryKey]: records || [],
      }));
    } catch (e) {
      console.error(e);
      alert('Error al eliminar documento: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const repositoriesForUI = (repositories || []).filter((r) => r.is_active !== false);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Panel izquierdo: repositorios */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden xl:col-span-1">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <Folder className="w-4 h-4 text-primary" />
                Repositorios
              </div>
            </div>

            <div className="max-h-[60vh] overflow-auto">
              {repositoriesForUI.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">
                  No existen repositorios documentales configurados para este módulo.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {repositoriesForUI.map((r) => (
                    <li
                      key={r.id}
                      className={`p-4 cursor-pointer hover:bg-primary/[0.03] transition-colors ${
                        r.id === activeRepositoryId ? 'bg-primary/[0.06]' : ''
                      }`}
                      onClick={() => setActiveRepositoryId(r.id)}
                    >
                      <div className="font-bold text-gray-900 text-sm">{r.name}</div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {r.slug}
                      </div>
                      <div
                        className={`mt-2 text-[11px] inline-flex px-2 py-0.5 rounded-full font-bold border ${
                          r.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {r.is_active ? 'Activo' : 'Inactivo'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Panel central: categorías */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden xl:col-span-1">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <FileText className="w-4 h-4 text-primary" />
                Categorías
              </div>
            </div>

            <div className="p-4">
              {!categories?.length ? (
                <div className="p-6 text-sm text-gray-500">
                  No hay categorías configuradas para este repositorio.
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map((c) => {
                    const records = docsByCategory[c.category_key] || [];
                    return (
                      <div key={c.id} className="p-4 rounded-2xl border border-gray-200">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-bold text-gray-900">{c.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{c.category_key}</div>
                            <div
                              className={`mt-2 text-[11px] inline-flex px-2 py-0.5 rounded-full font-bold border ${
                                c.is_active
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}
                            >
                              {c.is_active ? 'Activo' : 'Inactivo'}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 font-bold">{records.length} PDFs</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Panel derecho: documentos */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden xl:col-span-1">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <Eye className="w-4 h-4 text-primary" />
                Documentos
              </div>
            </div>

            <div className="p-4">
              {!categories?.length ? (
                <div className="p-6 text-sm text-gray-500">
                  Selecciona un repositorio para ver documentos.
                </div>
              ) : (
                <div className="space-y-5">
                  {categories.map((c) => {
                    const records = docsByCategory[c.category_key] || [];
                    return (
                      <div key={`docs_${c.id}`} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-gray-900">{c.name}</div>
                          {canManage && (
                            <label
                              htmlFor={`${uploadInputId}_${c.id}`}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/15 text-primary rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
                            >
                              <UploadCloud className="w-4 h-4" />
                              Subir
                            </label>
                          )}
                        </div>

                        {canManage && (
                          <input
                            id={`${uploadInputId}_${c.id}`}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            disabled={uploading || saving}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              handleUpload(c.category_key, file);
                            }}
                          />
                        )}

                        {records.length === 0 ? (
                          <div className="bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 p-6 text-center">
                            <p className="text-sm text-gray-400">Aún no hay documentos en esta categoría.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {records.slice(0, 12).map((record) => (
                              <div
                                key={record.id}
                                className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={uploading || saving}
                                      onClick={() => setViewerDoc(record)}
                                      className="p-2 rounded-xl border border-gray-200 hover:border-primary/50 hover:text-primary text-gray-500"
                                      title="Ver PDF"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>

                                    {canManage && (
                                      <button
                                        type="button"
                                        disabled={uploading || saving}
                                        onClick={() => handleDeleteRecord(record)}
                                        className="p-2 rounded-xl border border-gray-200 hover:border-red-200 hover:text-red-600 text-gray-500"
                                        title="Eliminar PDF"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <div className="text-sm font-bold text-gray-900 line-clamp-2">{record.name}</div>
                                  <div className="text-[10px] text-gray-500 mt-1">
                                    {new Date(record.created_at).toLocaleDateString()}
                                  </div>
                                </div>

                                {canManage && (
                                  <div className="mt-3">
                                    <label
                                      htmlFor={`${uploadInputId}_${c.id}_${record.id}`}
                                      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-primary/10 text-gray-700 hover:text-primary rounded-xl text-xs font-bold cursor-pointer transition-all border border-gray-200"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                      Reemplazar
                                    </label>
                                    <input
                                      id={`${uploadInputId}_${c.id}_${record.id}`}
                                      type="file"
                                      accept=".pdf"
                                      className="hidden"
                                      disabled={uploading || saving}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        handleReplace(record, file);
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visor PDF */}
      {viewerDoc && (
        <div className="w-full flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">

          <div className="bg-white w-full max-w-6xl h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="font-bold truncate max-w-[60vw]">{viewerDoc.name}</div>
                  <div className="text-[10px] text-white/60">Vista previa del documento</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewerDoc(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe
                src={`${viewerDoc.file_url}#toolbar=0`}
                className="w-full h-full border-none"
                title="Visor PDF"
              />
            </div>
            <div className="p-4 bg-white border-t flex justify-end">
              <button
                type="button"
                onClick={() => setViewerDoc(null)}
                className="px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

