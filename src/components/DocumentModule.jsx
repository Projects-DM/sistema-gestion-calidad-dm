import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, RefreshCw, Loader2, Camera } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { documentsService } from '../services/documentsService';
import { processImage, MEDIA_ERROR } from '../shared/media/mediaProcessor';

import { usePdfViewerStore } from '../shared/state/viewer/pdfViewer.store';
import PdfViewerModal from '../shared/components/viewers/PdfViewerModal';
import ImageViewerModal from './ImageViewerModal';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'];

// Sprint 327 — MIME-AWARE PRESENTATION. El modelo documental no persiste
// file_type; el tipo se resuelve del artefacto persistido (file_type cuando
// existe, si no, la extensión de storage_path/file_url). Nunca se asume PDF
// por el simple hecho de pertenecer al repositorio.
function resolveDocumentKind(record) {
  const t = record?.file_type;
  if (t) {
    if (t.startsWith('image/')) return 'image';
    if (t === 'application/pdf') return 'pdf';
  }
  const ref = String(record?.storage_path || record?.file_url || record?.name || '');
  const ext = ref.split('.').pop()?.toLowerCase() || '';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  return 'pdf';
}

export default function DocumentModule({ module, title, description }) {
  const { user, isAdmin } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageDoc, setImageDoc] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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

  // Sprint 327 — TOMAR FOTO. File → processImage() → artefacto procesado →
  // uploadProgram. Nunca se sube el original si el procesamiento tiene éxito.
  // Fallback controlado: si el procesamiento falla NO se sube nada.
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, seleccione una imagen.');
      return;
    }

    try {
      setUploading(true);
      let target = file;
      try {
        const processed = await processImage(file);
        target = processed.file || processed.blob;
      } catch (pErr) {
        if (pErr?.code === MEDIA_ERROR.INVALID_IMAGE || pErr?.code === MEDIA_ERROR.MEDIA_PROCESSING_FAILED) {
          alert('No se pudo procesar la imagen: ' + pErr.message);
          return;
        }
        throw pErr;
      }
      const updatedDoc = await documentsService.uploadProgram(module, target, user.id);
      setDoc(updatedDoc);
      alert('Foto guardada correctamente.');
    } catch (error) {
      alert('Error al subir foto: ' + error.message);
    } finally {
      setUploading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
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

  const handleOpen = () => {
    if (!doc) return;
    if (resolveDocumentKind(doc) === 'image') setImageDoc(doc);
    else openViewer(doc);
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
      {/* Inputs ocultos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {!doc ? (
        // UI cuando NO hay documento
        isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all text-sm font-bold backdrop-blur-sm"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-accent" />}
              Subir Programa PDF
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all text-sm font-bold backdrop-blur-sm"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-accent" />}
              Tomar foto
            </button>
          </div>
        )
      ) : (
        // UI cuando SÍ hay documento
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={handleOpen}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-primary rounded-xl font-bold transition-all text-sm shadow-lg shadow-accent/20"
          >
            Ver Programa
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Reemplazar documento (PDF)"
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all backdrop-blur-sm"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
                title="Reemplazar con foto"
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all backdrop-blur-sm"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
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

      {/* Visores MIME-aware */}
      {viewerDoc && <PdfViewerModal doc={viewerDoc} onClose={closeViewer} />}
      {imageDoc && <ImageViewerModal doc={imageDoc} onClose={() => setImageDoc(null)} />}

    </div>
  );
}