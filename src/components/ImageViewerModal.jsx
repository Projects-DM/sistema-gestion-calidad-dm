import { createPortal } from 'react-dom';
import { Image as ImageIcon, X } from 'lucide-react';

/**
 * Sprint 327 — IMAGE VIEWER MODAL · decisión puramente presentacional.
 * ÚNICAMENTE presenta una file_url con <img>. No consulta Supabase, no sube
 * archivos, no elimina, no procesa imágenes, no modifica metadata.
 */
export default function ImageViewerModal({ doc, onClose }) {
  if (!doc) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white w-full max-w-6xl h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* HEADER */}
        <div className="p-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="font-bold truncate max-w-[60vw]">{doc.name}</div>
              <div className="text-[10px] text-white/60">Vista previa de la imagen</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Cerrar visor de imagen"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* IMAGEN — presentación de la file_url existente (sin recarga/consulta) */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center p-4 overflow-auto">
          <img
            src={doc.file_url}
            alt={doc.name || 'Imagen'}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          />
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-white border-t flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}