import { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, ArrowRight, X } from 'lucide-react';
import { parseDocument, detectStructure, adaptDetectedStructure } from '../services/import/index.js';

export default function ImportAssistant({ modules, onReady, onCancel }) {
  const [phase, setPhase] = useState('select');
  const [error, setError] = useState(null);

  const [builderData, setBuilderData] = useState(null);
  const [editName, setEditName] = useState('');
  const [editModuleId, setEditModuleId] = useState('');

  const supportedFormats = '.xlsx,.xls,.csv,.docx,.pdf';

  const handleFile = async (file) => {
    setError(null);
    setPhase('parsing');
    try {
      const rawModel = await parseDocument(file);
      setPhase('detecting');
      const detected = detectStructure(rawModel, modules);
      setPhase('adapting');
      const adapted = adaptDetectedStructure(detected, null, null);
      setBuilderData(adapted);
      setEditName(adapted.name);
      setEditModuleId(adapted.moduleId || '');
      setPhase('ready');
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo');
      setPhase('select');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleOpenBuilder = () => {
    if (!editName.trim()) {
      setError('El nombre del formulario es obligatorio');
      return;
    }
    onReady({
      ...builderData,
      name: editName.trim(),
      moduleId: editModuleId,
      moduleName: editModuleId
        ? (modules.find(m => m.id === editModuleId)?.name || null)
        : builderData.moduleName,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-gray-900">Importar Formulario desde Archivo</h3>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {phase === 'select' && (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('import-file-input').click()}
            >
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-bold mb-1">Selecciona o arrastra un archivo</p>
              <p className="text-xs text-gray-500">
                Formatos soportados: XLSX, XLS, CSV, DOCX, PDF
              </p>
            </div>
            <input
              id="import-file-input"
              type="file"
              accept={supportedFormats}
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) handleFile(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </>
        )}

        {phase === 'parsing' && (
          <div className="text-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-gray-600 font-bold">Leyendo archivo...</p>
            <p className="text-xs text-gray-500 mt-1">Extrayendo contenido</p>
          </div>
        )}

        {phase === 'detecting' && (
          <div className="text-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-gray-600 font-bold">Analizando estructura...</p>
            <p className="text-xs text-gray-500 mt-1">Detectando campos y tipos</p>
          </div>
        )}

        {phase === 'adapting' && (
          <div className="text-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-gray-600 font-bold">Preparando datos...</p>
          </div>
        )}

        {phase === 'ready' && builderData && (
          <div className="space-y-5">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-green-800 text-sm">Estructura detectada</p>
                <p className="text-xs text-green-600">
                  {builderData.fields.length} campo{builderData.fields.length !== 1 ? 's' : ''} encontrado{builderData.fields.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Formulario *</label>
              <input
                type="text" required
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Nombre del formulario"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Módulo Destino</label>
              <select
                value={editModuleId}
                onChange={e => setEditModuleId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Selecciona un módulo...</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Siempre puedes cambiarlo después en el constructor.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm font-bold text-gray-700 mb-2">Campos Detectados</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {builderData.fields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 py-1">
                    <span className="font-mono text-gray-400 w-5">{i + 1}.</span>
                    <span className="font-bold text-gray-800">{f.label}</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">{f.field_type}</span>
                    {f.required && <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">Req</span>}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Podrás modificar todos los campos antes de guardar.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onCancel}
                className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpenBuilder}
                className="px-6 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" /> Abrir Constructor Visual
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
