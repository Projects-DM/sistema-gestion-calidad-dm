import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { parseDispatchesExcelFile } from '../utils/dispatchesExcel';

export default function ExcelUploadModal({ open, onClose, onImported }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [missingHeaders, setMissingHeaders] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [preview, setPreview] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!open) return;
    setIsDragging(false);
    setFileName('');
    setLoading(false);
    setError('');
    setMissingHeaders([]);
    setWarnings([]);
    setPreview([]);
    setRows([]);
  }, [open]);

  const canImport = useMemo(() => rows.length > 0 && !loading, [rows, loading]);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file) => {
    setError('');
    setMissingHeaders([]);
    setWarnings([]);
    setPreview([]);
    setRows([]);

    try {
      setLoading(true);
      setFileName(file?.name || '');
      const res = await parseDispatchesExcelFile(file);
      setMissingHeaders(res.missingHeaders || []);
      setPreview(res.preview || []);
      setRows(res.rows || []);
      if (!res.rows?.length) setError('No se encontraron filas con datos para importar.');
      if (res.missingHeaders?.length) {
        setWarnings([`Columnas no encontradas (se importarán vacías): ${res.missingHeaders.join(', ')}`]);
      }
    } catch (e) {
      setError(e?.message || 'No se pudo leer el archivo.');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-4xl bg-white sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 h-[100dvh] sm:h-auto sm:max-h-[90dvh] flex flex-col">
        <div className="bg-primary px-4 sm:px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Cargar Excel de Despachos</h2>
              <p className="text-primary-100 text-xs">Importa registros desde un archivo .xlsx con vista previa.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
          <div
            className={[
              'rounded-2xl border-2 border-dashed p-4 sm:p-6 transition-all',
              isDragging ? 'border-accent bg-yellow-50' : 'border-gray-200 bg-gray-50',
            ].join(' ')}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={onDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <Upload className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Arrastra tu Excel aquí o selecciona un archivo</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Se detectan encabezados de forma inteligente (sinónimos). Si falta una columna, se importará vacía.
                  </p>
                  {fileName && (
                    <p className="text-xs text-gray-700 mt-2">
                      Archivo: <span className="font-semibold">{fileName}</span>
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handlePick}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-bold border border-gray-200 transition-all shadow-sm w-full md:w-auto"
                disabled={loading}
              >
                <FileSpreadsheet className="w-4 h-4 text-accent" />
                Seleccionar .xlsx
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">No se puede importar</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {warnings.length > 0 && !error && (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-accent" />
              <div className="flex-1">
                <p className="font-bold">Importación parcial</p>
                <p className="text-xs mt-1">{warnings[0]}</p>
              </div>
            </div>
          )}

          {preview.length > 0 && !error && (
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">Vista previa</p>
                  <p className="text-xs text-gray-500">Se mostrarán las primeras {preview.length} filas. Total: {rows.length}</p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-200/50">
                  <CheckCircle2 className="w-4 h-4" />
                  Listo para importar
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <div className="max-h-[42dvh] sm:max-h-[50dvh] lg:max-h-[52dvh] overflow-y-auto">
                  <table className="w-full min-w-[1100px] text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-200 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10">
                      <th className="p-2 sm:p-3">Fecha</th>
                      <th className="p-2 sm:p-3">Hora</th>
                      <th className="p-2 sm:p-3">Cliente</th>
                      <th className="p-2 sm:p-3">Producto</th>
                      <th className="p-2 sm:p-3">Lote</th>
                      <th className="p-2 sm:p-3">Cantidad</th>
                      <th className="p-2 sm:p-3">Peso</th>
                      <th className="p-2 sm:p-3">Destino</th>
                      <th className="p-2 sm:p-3">Placa</th>
                      <th className="p-2 sm:p-3">Conductor</th>
                      <th className="p-2 sm:p-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((r, i) => (
                      <tr key={i} className="hover:bg-primary/[0.02] transition-colors">
                        <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-900">{r.fechaDespacho}</td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-700">{r.hora}</td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-900 font-semibold">{r.cliente}</td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-800">{r.producto}</td>
                        <td className="p-2 sm:p-3 text-[11px] sm:text-sm font-mono text-gray-700">{r.lote}</td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-900">{r.cantidadBolsas}</td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-900">{r.peso}</td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-700 max-w-[200px] sm:max-w-[240px] truncate">{r.destino}</td>
                        <td className="p-2 sm:p-3 text-[11px] sm:text-sm font-mono text-gray-700">{r.placa}</td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-800">{r.conductor}</td>
                        <td className="p-2 sm:p-3 text-xs sm:text-sm text-gray-600 max-w-[220px] sm:max-w-[280px] truncate">{r.observaciones}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-gray-500">
            Los campos se mapearán automáticamente al registro de despacho.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors w-full sm:w-auto"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onImported?.(rows)}
              className={[
                'flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all shadow-lg w-full sm:w-auto',
                canImport ? 'bg-primary hover:bg-primary-light text-white shadow-primary/20' : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none',
              ].join(' ')}
              disabled={!canImport}
            >
              <CheckCircle2 className="w-4 h-4" />
              Importar {rows.length ? `(${rows.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

