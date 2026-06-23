import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, FileText, Upload, Trash2, Eye, X, 
  Loader2, ShieldCheck, Calendar, Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { documentsService } from '../services/documentsService';

export default function DocumentManager({ 
  module, 
  title, 
  subtitle, 
  backPath, 
  backLabel,
  categories = [] 
}) {
  const { user, isAdmin, isCalidad } = useAuth();
  const canManage = isAdmin || isCalidad;
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewerDoc, setViewerDoc] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadRecords();
  }, [module]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await documentsService.getRecords(module);
      setRecords(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCategory) return;

    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF.');
      return;
    }

    try {
      setUploading(true);
      const newRecord = await documentsService.uploadRecord(module, selectedCategory, file, user.id);
      setRecords(prev => [newRecord, ...prev]);
      setSelectedCategory(null);
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`¿Eliminar "${record.name}"?`)) return;
    try {
      await documentsService.deleteRecord(record.id, record.storage_path);
      setRecords(prev => prev.filter(r => r.id !== record.id));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const filteredRecords = records.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRecordsByCategory = (categoryId) => {
    return filteredRecords.filter(r => r.type === categoryId);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to={backPath} className="hover:text-primary flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" /> {backLabel}
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-accent" />
            {title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>

        {canManage && (
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Subir nuevo documento en:</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setTimeout(() => fileInputRef.current?.click(), 100);
                  }}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-primary hover:text-white text-gray-600 rounded-xl text-xs font-bold border border-gray-200 transition-all shadow-sm"
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
      </div>

      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          placeholder={`Buscar en todas las categorías...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all shadow-sm text-lg"
        />
      </div>

      {/* Categorized Sections */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-gray-500 animate-pulse font-medium">Cargando repositorio documental...</p>
        </div>
      ) : (
        <div className="space-y-12">
          {categories.map(category => {
            const categoryRecords = getRecordsByCategory(category.id);
            if (searchTerm && categoryRecords.length === 0) return null;

            return (
              <div key={category.id} className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${category.bg} flex items-center justify-center`}>
                      <category.icon className={`w-6 h-6 ${category.color}`} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
                      <p className="text-xs text-gray-500">Repositorio técnico de {category.name.toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="px-4 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">
                    {categoryRecords.length} archivos
                  </div>
                </div>

                {categoryRecords.length === 0 ? (
                  <div className="bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 p-8 text-center">
                    <p className="text-sm text-gray-400">No hay documentos en esta categoría.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryRecords.map((record) => (
                      <div 
                        key={record.id}
                        className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                            <FileText className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => setViewerDoc(record)}
                              className="p-2 hover:bg-primary/10 rounded-lg text-gray-400 hover:text-primary transition-colors"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            {canManage && (
                              <button 
                                onClick={() => handleDelete(record)}
                                className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <h3 className="font-bold text-gray-800 mb-4 line-clamp-2 min-h-[2.5rem] text-sm leading-tight group-hover:text-primary transition-colors">
                          {record.name}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-[10px] text-gray-400 font-medium">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(record.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            Verificado
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Visor de PDF Modal */}
      {viewerDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-6xl h-[92vh] rounded-3xl overflow-hidden flex flex-col relative shadow-2xl">
            <div className="bg-primary p-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold truncate max-w-md">{viewerDoc.name}</h3>
                  <p className="text-[10px] text-white/60 tracking-widest uppercase font-bold">Visor Seguro de Documentos</p>
                </div>
              </div>
              <button 
                onClick={() => setViewerDoc(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors bg-white/5"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 bg-gray-800">
              <iframe
                src={`${viewerDoc.file_url}#toolbar=0`}
                className="w-full h-full border-none"
                title="Visor PDF"
              />
            </div>
            <div className="p-4 bg-white border-t flex justify-center">
              <button 
                onClick={() => setViewerDoc(null)}
                className="px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all text-sm"
              >
                Cerrar Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
