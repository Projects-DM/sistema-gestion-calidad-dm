import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Folder, UploadCloud, Eye, RefreshCw, Trash2, Loader2 } from 'lucide-react';

import { documentRepositoriesService } from '../../services/documentRepositoriesService';
import { documentsService } from '../../services/documentsService';
import { useAuth } from '../../hooks/useAuth';

import { usePdfViewerStore } from '../../shared/state/viewer/pdfViewer.store';
import PdfViewerModal from '../../shared/components/viewers/PdfViewerModal';
import { useAlertRuntime } from '../../hooks/useAlertRuntime';
import { alertVisualClasses, resolveAlertIcon } from '../../utils/alertVisual';
import { projectResourceAlertState, formatExecutionTime } from '../../utils/alertResourceState';


function safeFileType(type) {
  if (!type) return 'application/pdf';
  return type;
}

// Sprint 290/291 — Static icon map resolved once (Sprint 286 F8 pattern).
const REPOSITORY_STATE_ICON_COMPONENTS = Object.freeze({
  overdue: resolveAlertIcon('AlertTriangle'),
  today: resolveAlertIcon('Clock'),
  upcoming: resolveAlertIcon('Calendar'),
  active: resolveAlertIcon('CheckCircle2'),
  completed: resolveAlertIcon('CheckCircle'),
  cancelled: resolveAlertIcon('AlertOctagon'),
  disabled: resolveAlertIcon('Bell'),
  fallback: resolveAlertIcon('Bell'),
});

// Sprint 291 — RICH REPOSITORY/CATEGORY ALERT STATE BLOCK. Presents the alert
// state projected over THIS repository (one visual alert per repository, the
// internal occurrence windows as events). PURE PRESENTATION: consumes the
// projector output, never rebuilds identity/schedules/completion (AC-05..AC-07).
function RepositoryAlertStateBlock({ state }) {
  if (state?.present !== true) return null;
  const classes = alertVisualClasses(state.color);
  const IconComponent = REPOSITORY_STATE_ICON_COMPONENTS[state.status] || REPOSITORY_STATE_ICON_COMPONENTS.fallback;
  return (
    <div className={`mt-2 p-3 rounded-xl border ${classes.badge}`}>
      <div className="flex items-start gap-2">
        <IconComponent className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="text-[11px] leading-snug">
          <div className="font-bold mb-1">Alerta operacional</div>
          <div>
            Estado: <span className="font-bold">{state.statusLabel}</span>
            {state.priorityLabel ? <span> · Prioridad {state.priorityLabel}</span> : null}
            {state.nextExecution ? <span> · Próximo vencimiento: {state.nextExecution}</span> : null}
          </div>
          {state.openCount > 0 && (
            <div className="mt-1 font-semibold">{state.openCount} evento(s) abierto(s)</div>
          )}
        </div>
      </div>
      {state.events?.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-[11px] font-semibold">
          {state.events.slice(0, 3).map((ev) => (
            <li key={ev.occurrenceId ?? `${ev.alertId}:${ev.sequence}`}>
              {ev.statusLabel}
              {ev.dueMs ? ` · ${formatExecutionTime(ev.dueMs)}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ModuleDocumentViewer({ moduleSlug, navigationContext }) {
  const { user, isAdmin, isCalidad } = useAuth();
  const canManage = isAdmin || isCalidad;

  const [loading, setLoading] = useState(true);
  const [repositories, setRepositories] = useState([]);
  const [activeRepositoryId, setActiveRepositoryId] = useState(null);
  const [categories, setCategories] = useState([]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [docsByCategory, setDocsByCategory] = useState({}); // { [categoryKey]: records[] }

  const viewerDoc = usePdfViewerStore((state) => state.viewerDoc);
  const openViewer = usePdfViewerStore((state) => state.openViewer);
  const closeViewer = usePdfViewerStore((state) => state.closeViewer);

  // Sprint 184 — Operational UI Consumption.
  // Consumes ONLY the Runtime Visibility surface for the Document Repository engine.
  // Sprint 290 — the Repository ALSO consumes the projected occurrences to
  // present the REAL alert state of the active repository (and its categories,
  // root: category.repository_id → repository). consume → presenta; never
  // rebuilds identity/schedules/completion (AC-05/AC-06/AC-07, AC-17).
  const { visibility, occurrences, existing } = useAlertRuntime({
    module: moduleSlug,
    moduleSlug,
  });
  const documentBadge = visibility?.badges?.documentRepository ?? null;

  // Sprint 290/291 — REAL REPOSITORY ALERT STATE (one visual alert per
  // repository, internal occurrence windows as events). Pure presentation over
  // the certified projection; the identity stays on the repository (never on
  // the category — no `category:alert:...` identity is invented, STOP respected).
  const repositoryAlertStates = useMemo(() => {
    const byId = new Map();
    const reps = (existing?.repositories || repositories || []);
    for (const repo of reps) {
      const state = projectResourceAlertState({
        occurrences,
        resourceKind: 'documentRepository',
        resourceId: repo.id ?? repo.slug,
        resource: repo,
      });
      if (state) byId.set(String(repo.id ?? repo.slug ?? ''), state);
    }
    return byId;
  }, [occurrences, existing, repositories]);

  // Sprint 294 — CATEGORY OWN ALERT STATE (override). A category that carries
  // its OWN alert_config projects its OWN visual state via the SAME certified
  // pipeline (resourceKind='documentCategory', resourceId=category.id). The
  // identity comes from the domain (alertConfigIdOf/occurrenceIdOf) — never
  // rebuilt here. Categories without own configuration fall back to the
  // repository inheritance below.
  const categoryAlertStates = useMemo(() => {
    const byId = new Map();
    const cats = (existing?.categories || categories || []);
    for (const cat of cats) {
      const state = projectResourceAlertState({
        occurrences,
        resourceKind: 'documentCategory',
        resourceId: cat.id,
        resource: cat,
      });
      if (state) byId.set(String(cat.id ?? ''), state);
    }
    return byId;
  }, [occurrences, existing, categories]);

  const uploadInputId = useMemo(() => `upload_${moduleSlug}_${Date.now()}`, [moduleSlug]);

  // Sprint 189 — Context Navigation Decoupling.
  // The Repository NEVER interprets a navigation context as a user selection.
  // The navigationContext is consumed EXACTLY ONCE: locate the document,
  // scroll to it and highlight it TEMPORARILY (fade), then the Repository
  // returns to a completely neutral state. It never leaves the document
  // selected, never opens a menu, never activates edit/replace/delete, and
  // never blocks module navigation.
  const documentRefs = useRef(new Map());
  const [navigationTarget, setNavigationTarget] = useState(null); // { resourceId } — consumed once
  const [contextHighlightId, setContextHighlightId] = useState(null); // temporary highlight
  const [highlightVisible, setHighlightVisible] = useState(false);

  // Consume the context exactly once. After the first render the context is
  // dropped so the Repository returns immediately to a neutral state.
  useEffect(() => {
    if (!navigationContext || navigationContext.resourceType !== 'document') return;
    const resourceId = navigationContext.resourceId;
    if (resourceId == null) return;
    setNavigationTarget({ resourceId });
    setContextHighlightId(String(resourceId));
    setHighlightVisible(true);
  }, [navigationContext]);

  // Temporary highlight: fade out and clear. The document is NEVER selected.
  useEffect(() => {
    if (!contextHighlightId) return;
    const fadeTimer = setTimeout(() => setHighlightVisible(false), 1600);
    const clearTimer = setTimeout(() => setContextHighlightId(null), 2400);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [contextHighlightId]);

  // Scroll the target document into view once the panels are rendered.
  useEffect(() => {
    if (!navigationTarget || loading) return;
    const node = documentRefs.current?.get(String(navigationTarget.resourceId));
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [navigationTarget, loading, docsByCategory]);

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
    return moduleSlug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
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
                  {repositoriesForUI.map((r) => {
                    const repoAlertState = repositoryAlertStates.get(String(r.id ?? r.slug ?? '')) || null;
                    return (
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
                        <RepositoryAlertStateBlock state={repoAlertState} />
                      </li>
                    );
                  })}
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
                    // Sprint 294 — CATEGORY ALERT STATE (override + fallback).
                    //   Category WITH own configuration → projects own state
                    //   (resourceKind='documentCategory', resourceId=category.id)
                    //   — owns its alert; does NOT consume the repository alert.
                    //   Category WITHOUT own configuration → inherits the state
                    //   of its owning repository (repositoryAlertStates). The
                    //   identity NEVER moves to the category.
                    // Sprint 295 — DISABLED OWN-OVERRIDE. A category that carries
                    //   its OWN configuration (even when the selector yields NO
                    //   visual state — e.g. explicitly `enabled === false`)
                    //   owns its alert surface: it MUST NOT fall back to the
                    //   repository alert. Fallback applies ONLY to categories
                    //   with NO configuration of their own.
                    const catRaw = c?.alertConfiguration ?? c?.alert_config;
                    const hasOwnCategoryConfig = !!(
                      catRaw &&
                      typeof catRaw === 'object' &&
                      (Array.isArray(catRaw.alertConfigurations)
                        ? catRaw.alertConfigurations.length > 0
                        : true)
                    );
                    const ownCategoryState = categoryAlertStates.get(String(c?.id ?? '')) || null;
                    const categoryOwnerState = hasOwnCategoryConfig
                      ? ownCategoryState
                      : ownCategoryState ||
                        repositoryAlertStates.get(String(c?.repository_id ?? '')) ||
                        null;
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
                              <RepositoryAlertStateBlock state={categoryOwnerState} />
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
                            {records.slice(0, 12).map((record) => {
                              const isHighlighted =
                                highlightVisible &&
                                contextHighlightId !== null &&
                                String(record.id) === String(contextHighlightId);
                              return (
                              <div
                                key={record.id}
                                ref={(node) => {
                                  if (node) documentRefs.current.set(String(record.id), node);
                                  else documentRefs.current.delete(String(record.id));
                                }}
                                className={`bg-white rounded-2xl p-4 border shadow-sm transition-all ${
                                  isHighlighted
                                    ? 'border-primary ring-2 ring-primary/30 bg-primary/[0.03]'
                                    : 'border-gray-200 hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={uploading || saving}
                                      onClick={() => openViewer(record)}

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
                                  {documentBadge?.show === true && documentBadge.badge && (
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mt-2 ${alertVisualClasses(documentBadge.badge.color).badge}`}
                                      title={documentBadge.badge.tooltip}
                                    >
                                      {(() => {
                                        const IconComponent = resolveAlertIcon(documentBadge.badge.icon);
                                        return <IconComponent className="w-3 h-3" />;
                                      })()}
                                      {documentBadge.badge.label}
                                    </span>
                                  )}
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
                              );
                            })}
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
      {viewerDoc && <PdfViewerModal doc={viewerDoc} onClose={closeViewer} />}
    </div>
  );
}

