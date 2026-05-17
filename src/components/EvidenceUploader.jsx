import { useState, useRef } from 'react';
import { Upload, X, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

export default function EvidenceUploader({ onEvidencesChange }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    
    setUploading(true);
    const supabase = getSupabaseClient();
    const newEvidences = [];

    for (const file of selectedFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `evidencias/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documentos-sgc')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('documentos-sgc').getPublicUrl(filePath);
        
        newEvidences.push({
          file_url: data.publicUrl,
          storage_path: filePath,
          file_type: file.type,
          name: file.name
        });
      } catch (error) {
        console.error('Error uploading evidence:', error);
        alert('Error subiendo ' + file.name + ': ' + error.message);
      }
    }

    const updatedFiles = [...files, ...newEvidences];
    setFiles(updatedFiles);
    onEvidencesChange(updatedFiles);
    setUploading(false);
    
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removeFile = async (index) => {
    const fileToRemove = files[index];
    try {
      const supabase = getSupabaseClient();
      await supabase.storage.from('documentos-sgc').remove([fileToRemove.storage_path]);
    } catch (e) {
      console.error('Error deleting from storage:', e);
    }
    
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onEvidencesChange(updated);
  };

  return (
    <div className="space-y-4 border-t border-gray-200 pt-6 mt-6">
      <h3 className="text-lg font-bold text-gray-900">Evidencias Fotográficas / Archivos</h3>
      <p className="text-sm text-gray-500">Puedes adjuntar fotografías o documentos (opcional).</p>

      <div className="flex flex-wrap gap-4">
        {/* Gallery/File Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-primary/30 text-primary rounded-xl hover:bg-primary/5 transition-colors font-bold disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
          Subir Archivo
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept="image/*,application/pdf"
          onChange={handleFileChange}
        />

        {/* Camera Button (Mobile optimization) */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-bold disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          Tomar Foto
        </button>
        <input 
          type="file" 
          ref={cameraInputRef} 
          className="hidden" 
          accept="image/*" 
          capture="environment"
          onChange={handleFileChange}
        />
      </div>

      {/* Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
          {files.map((file, idx) => (
            <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-50">
              {file.file_type?.startsWith('image') ? (
                <img src={file.file_url} alt="Evidencia" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-xs text-gray-500 font-medium">
                  <Upload className="w-8 h-8 mb-2 text-gray-400" />
                  <span className="line-clamp-2">{file.name}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
