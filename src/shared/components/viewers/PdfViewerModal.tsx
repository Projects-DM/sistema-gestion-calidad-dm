import type React from 'react';
import { FileText, X } from 'lucide-react';

import type { PdfViewerDoc } from '../../state/viewer/pdfViewer.store';

export default function PdfViewerModal({
  doc,
  onClose,
}: {
  doc: PdfViewerDoc;
  onClose: () => void;
}) {
  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white w-full max-w-6xl h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="font-bold truncate max-w-[60vw]">{doc.name}</div>
              <div className="text-[10px] text-white/60">Vista previa del documento</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Cerrar visor PDF"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 bg-gray-100">
          <iframe
            src={`${doc.file_url}#toolbar=0`}
            className="w-full h-full border-none"
            title="Visor PDF"
          />
        </div>

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
    </div>
  );
}

