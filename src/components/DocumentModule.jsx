import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Eye, Trash2, RefreshCw, X, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { documentsService } from '../services/documentsService';

export default function DocumentModule({ module, title, description }) {
  const { user, isAdmin } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const fileInputRef = useRef(null);

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
            onClick={() => setShowViewer(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-primary rounded-xl font-bold transition-all text-sm shadow-lg shadow-accent/20"
          >
            <Eye className="w-4 h-4" />
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

      {/* Modal Visor de PDF */}
      {showViewer && doc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden flex flex-col relative shadow-2xl">
            <div className="bg-primary p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="text-xs text-white/60">Programa Técnico del Módulo</p>
                </div>
              </div>
              <button 
                onClick={() => setShowViewer(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 bg-gray-100">
              <iframe
                src={`${doc.file_url}#toolbar=0`}
                className="w-full h-full border-none"
                title="Visor PDF"
              />
            </div>
            
            <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Archivo: <span className="font-medium">{doc.name}</span>
              </p>
              <button 
                onClick={() => setShowViewer(false)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-all text-sm"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
