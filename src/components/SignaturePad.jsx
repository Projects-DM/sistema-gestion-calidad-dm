import { useRef, useState, useEffect } from 'react';
import { PenTool, Eraser, Check, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

export default function SignaturePad({ onChange, label = "Firma", required = false }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedUrl, setSavedUrl] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
  }, []);

  const getCoordinates = (e) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Check if it's a touch event or mouse event
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e) => {
    // Solo prevenir default si es touch para evitar scroll, si es mouse no hace falta
    if (e.touches) e.preventDefault(); 
    setIsDrawing(true);
    setHasSignature(true);
    const coords = getCoordinates(e);
    if (!coords || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    if (e.touches) e.preventDefault();
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    if (!coords || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSavedUrl(null);
    onChange('');
  };

  const saveSignature = async () => {
    if (!hasSignature) return;
    setUploading(true);
    
    try {
      const canvas = canvasRef.current;
      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      
      const supabase = getSupabaseClient();
      const fileName = `firma_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.png`;
      const filePath = `firmas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-sgc')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('documentos-sgc').getPublicUrl(filePath);
      
      setSavedUrl(data.publicUrl);
      onChange(data.publicUrl);
    } catch (e) {
      console.error('Error uploading signature:', e);
      alert('Error guardando la firma: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {savedUrl ? (
        <div className="relative border-2 border-green-200 bg-green-50 rounded-2xl p-4 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
          <img src={savedUrl} alt="Firma guardada" className="max-h-32 object-contain filter contrast-125" />
          <div className="absolute top-2 right-2 text-green-700 font-bold text-[10px] bg-green-200/50 px-2 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider">
            <Check className="w-3 h-3" /> Confirmada
          </div>
          <button 
            type="button" 
            onClick={clear}
            className="mt-4 text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 transition-colors"
          >
            <Eraser className="w-3 h-3" /> Borrar y firmar de nuevo
          </button>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-2xl overflow-hidden bg-white relative shadow-inner group transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full h-48 bg-gray-50/50 touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
          />
          {!hasSignature && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 group-hover:opacity-10 transition-opacity">
              <PenTool className="w-12 h-12 text-gray-400" />
            </div>
          )}
          <div className="absolute top-2 left-3 text-gray-400 text-[10px] font-bold uppercase tracking-widest pointer-events-none flex items-center gap-1">
            Firme Aquí
          </div>
          
          <div className="bg-gray-100 p-3 border-t border-gray-200 flex justify-between items-center">
            <button 
              type="button" 
              onClick={clear}
              className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Eraser className="w-4 h-4" /> Limpiar
            </button>
            <button 
              type="button" 
              onClick={saveSignature}
              disabled={!hasSignature || uploading}
              className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary/90 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {uploading ? 'Guardando Firma...' : 'Confirmar Firma'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
