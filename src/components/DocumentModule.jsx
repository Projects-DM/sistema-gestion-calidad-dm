import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { documentsService } from '../services/documentsService';

import { usePdfViewerStore } from '../shared/state/viewer/pdfViewer.store';
import PdfViewerModal from '../shared/components/viewers/PdfViewerModal';

export default function DocumentModule({ module, title, description }) {
  const { user, isAdmin } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const viewerDoc = usePdfViewerStore((s) => s.viewerDoc);
  const openViewer = usePdfViewerStore((s) => s.openViewer);
  const closeViewer = usePdfViewerStore((s) => s.closeViewer);


  useEffect(() => {
    loadDocument();
  }, [module]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const data = await documentsService.getProgram(module);
      setDoc(data);
    } catch (error) {
      console.error('Error cargando documento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor, suba solo archivos PDF.');
      return;
    }

    try {
      setUploading(true);
      const updatedDoc = await documentsService.uploadProgram(module, file, user.id);
      setDoc(updatedDoc);
      alert('Documento guardado correctamente.');
    } catch (error) {
      alert('Error al subir documento: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Está seguro de eliminar el programa de este módulo?')) return;

    try {
      setUploading(true);
      await documentsService.deleteProgram(doc.id, doc.storage_path);
      setDoc(null);
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando programa...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-3">
      {/* Input oculto para subir archivos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf"
        className="hidden"
      />

      {!doc ? (
        // UI cuando NO hay documento
        isAdmin && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all text-sm font-bold backdrop-blur-sm"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-accent" />}
            Subir Programa PDF
          </button>
        )
      ) : (
        // UI cuando SÍ hay documento
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => openViewer(doc)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-primary rounded-xl font-bold transition-all text-sm shadow-lg shadow-accent/20"
          >
            Ver Programa
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Reemplazar documento"
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all backdrop-blur-sm"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </button>
              <button
                onClick={handleDelete}
                disabled={uploading}
                title="Eliminar documento"
                className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-xl border border-red-500/30 transition-all backdrop-blur-sm"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}

      {doc && (
        <p className="text-[10px] text-white/40 italic">
          Última actualización: {new Date(doc.created_at).toLocaleDateString()}
        </p>
      )}

      {/* Visor PDF global */}
      {viewerDoc && <PdfViewerModal doc={viewerDoc} onClose={closeViewer} />}

    </div>
  );
}
