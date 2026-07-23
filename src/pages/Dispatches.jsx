import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Download, FileText, Search, Filter, 
  Save, X, CheckCircle, Truck, MapPin, Package, UserSquare2, 
  Calendar, Clock, Edit2, Trash2, AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import RoleGate from '../components/RoleGate';
import ExcelUploadModal from '../components/ExcelUploadModal';
import { exportDispatchesPdf } from '../utils/dispatchesPdf';
import { getDispatchesDefaults, withDispatchDefaults } from '../config/dispatchesConfig';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  fetchDespachos,
  insertDespacho,
  insertDespachosBatch,
  formToInsertPayload,
  excelRowToInsertPayload,
} from '../services/despachosService';

// Mock Data for Automations
const MOCK_CLIENTS = {
  'Supermercados El Centro': { destino: 'Bodega Principal Norte', productos: ['Arroz Extra', 'Frijol Cargamanto'] },
  'Restaurante La Casona': { destino: 'Sede Centro', productos: ['Lenteja Importada'] },
  'Distribuidora Sur': { destino: 'Almacén Sur', productos: ['Azúcar Refinada', 'Arroz Extra'] },
};

const MOCK_DRIVERS = {
  'Carlos Rodríguez': { placa: 'XYZ-123' },
  'Miguel Sánchez': { placa: 'ABW-456' },
  'Luis Gómez': { placa: 'TRP-789' },
};

const MOCK_PRODUCTS = {
  'Arroz Extra': { presentacion: 'Bulto 50kg' },
  'Frijol Cargamanto': { presentacion: 'Bolsa 1kg' },
  'Lenteja Importada': { presentacion: 'Bolsa 500g' },
  'Azúcar Refinada': { presentacion: 'Bulto 25kg' },
};

export default function Dispatches() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [banner, setBanner] = useState(null);
  const [dispatchDefaults] = useState(() => getDispatchesDefaults());
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  
  const { profile, isAdmin, isCalidad, isOperativo, isConductor } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured()) {
        setLoadingRecords(false);
        setBanner({
          type: 'error',
          message:
            'Supabase no configurado: cree un archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (vea .env.example).',
        });
        return;
      }

      setLoadingRecords(true);
      try {
        const data = await fetchDespachos();
        if (!cancelled) setRecords(data);
      } catch (err) {
        if (!cancelled) {
          setBanner({
            type: 'error',
            message: err?.message || 'No se pudieron cargar los despachos desde Supabase.',
          });
        }
      } finally {
        if (!cancelled) setLoadingRecords(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    cliente: '',
    producto: '',
    presentacion: '',
    lote: '',
    cantidad: '',
    peso: '',
    destino: '',
    temperatura: '',
    calidadEmpaque: 'Excelente',
    placa: dispatchDefaults.placa,
    conductor: dispatchDefaults.conductor,
    firmaConductor: '',
    observaciones: ''
  });

  // Init Form (Create or Edit)
  useEffect(() => {
    if (isFormOpen) {
      if (editingRecord) {
        // Map UI record back to form data
        setFormData({
          fecha: editingRecord.fecha,
          hora: editingRecord.hora,
          cliente: editingRecord.cliente,
          producto: editingRecord.producto,
          presentacion: editingRecord.presentacion || '',
          lote: editingRecord.lote,
          cantidad: editingRecord.cantidad,
          peso: editingRecord.peso,
          destino: editingRecord.destino,
          temperatura: editingRecord.temperatura || '',
          calidadEmpaque: editingRecord.calidadEmpaque || 'Excelente',
          placa: editingRecord.placa,
          conductor: editingRecord.conductor,
          firmaConductor: editingRecord.firmaConductor || '',
          observaciones: editingRecord.observaciones || ''
        });
      } else {
        const now = new Date();
        setFormData({
          fecha: format(now, 'yyyy-MM-dd'),
          hora: format(now, 'HH:mm'),
          cliente: '',
          producto: '',
          presentacion: '',
          lote: '',
          cantidad: '',
          peso: '',
          destino: '',
          temperatura: '',
          calidadEmpaque: 'Excelente',
          placa: dispatchDefaults.placa,
          conductor: dispatchDefaults.conductor,
          firmaConductor: '',
          observaciones: ''
        });
      }
    }
  }, [isFormOpen, editingRecord, dispatchDefaults]);

  // Smart Automations
  const handleClientChange = (e) => {
    const client = e.target.value;
    setFormData(prev => {
      const updates = { ...prev, cliente: client };
      if (MOCK_CLIENTS[client]) {
        updates.destino = MOCK_CLIENTS[client].destino;
        if (!prev.producto && MOCK_CLIENTS[client].productos.length > 0) {
          updates.producto = MOCK_CLIENTS[client].productos[0];
          updates.presentacion = MOCK_PRODUCTS[updates.producto]?.presentacion || '';
        }
      }
      return updates;
    });
  };

  const handleProductChange = (e) => {
    const prod = e.target.value;
    setFormData(prev => ({
      ...prev,
      producto: prod,
      presentacion: MOCK_PRODUCTS[prod]?.presentacion || prev.presentacion
    }));
  };

  const handleDriverChange = (e) => {
    const driver = e.target.value;
    setFormData(prev => ({
      ...prev,
      conductor: driver,
      placa: MOCK_DRIVERS[driver]?.placa || prev.placa
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setBanner({ type: 'error', message: 'Configure Supabase en .env para guardar registros.' });
      return;
    }

    setSaving(true);
    try {
      const merged = withDispatchDefaults(formData, dispatchDefaults);
      const payload = formToInsertPayload(merged, dispatchDefaults);
      
      if (editingRecord) {
        const updated = await updateDespacho(editingRecord.id, payload);
        setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
        setBanner({ type: 'success', message: 'Despacho actualizado correctamente.' });
      } else {
        const inserted = await insertDespacho(payload);
        setRecords((prev) => [inserted, ...prev]);
        setBanner({ type: 'success', message: 'Despacho guardado correctamente.' });
      }
      
      setIsFormOpen(false);
      setEditingRecord(null);
    } catch (err) {
      setBanner({
        type: 'error',
        message: err?.message || 'No se pudo guardar el despacho.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.')) return;
    
    try {
      await deleteDespacho(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      setBanner({ type: 'success', message: 'Registro eliminado correctamente.' });
    } catch (err) {
      setBanner({ type: 'error', message: 'Error al eliminar: ' + err.message });
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleExcelImported = async (rows) => {
    if (!isSupabaseConfigured()) {
      setBanner({ type: 'error', message: 'Configure Supabase en .env para importar Excel.' });
      return;
    }

    try {
      const importedUi = (rows || []).map((r) => ({
        fechaDespacho: r.fechaDespacho || '',
        hora: r.hora || '',
        cliente: r.cliente || '',
        producto: r.producto || '',
        lote: r.lote || '',
        cantidadBolsas: r.cantidadBolsas ?? '',
        peso: r.peso ?? '',
        destino: r.destino || '',
        placa: r.placa || dispatchDefaults.placa,
        conductor: r.conductor || dispatchDefaults.conductor,
        observaciones: r.observaciones || '',
      }));

      if (!importedUi.length) {
        setBanner({ type: 'error', message: 'No se importaron filas (archivo vacío o sin datos).' });
        return;
      }

      setSaving(true);
      const payloads = importedUi.map((r) => excelRowToInsertPayload(r, dispatchDefaults));
      const inserted = await insertDespachosBatch(payloads);

      setRecords((prev) => [...inserted, ...prev]);
      setIsExcelOpen(false);
      setBanner({
        type: 'success',
        message: `Importación exitosa: ${inserted.length} registros guardados.`,
      });
    } catch (err) {
      setBanner({
        type: 'error',
        message: err?.message || 'Ocurrió un error al importar el Excel.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!isSupabaseConfigured()) {
      setBanner({ type: 'error', message: 'Configure Supabase en .env para exportar.' });
      return;
    }

    try {
      if (!records?.length) {
        setBanner({ type: 'error', message: 'No hay registros para exportar.' });
        return;
      }
      const normalized = records.map((r) => withDispatchDefaults(r, dispatchDefaults));
      exportDispatchesPdf({ records: normalized, defaults: dispatchDefaults });
      setBanner({ type: 'success', message: 'PDF generado correctamente.' });
    } catch (err) {
      setBanner({
        type: 'error',
        message: err?.message || 'No se pudo generar el PDF.',
      });
    }
  };

  // Real-time filtering
  const filteredRecords = records.filter(r => 
    r.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.lote?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.conductor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.placa?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to="/trazabilidad" className="hover:text-primary flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver a Trazabilidad
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="w-7 h-7 text-accent" />
            Registro de Despachos
          </h1>
          {isSupabaseConfigured() ? (
            <p className="text-xs text-green-700 font-medium mt-2">Datos en vivo · Supabase</p>
          ) : (
            <p className="text-xs text-amber-700 font-medium mt-2">Sin conexión a Supabase · revise .env</p>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isFormOpen && (
            <>
              <RoleGate allowedRoles={['administrador', 'calidad']}>
                <button
                  onClick={handleExportPdf}
                  disabled={loadingRecords || saving}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium border border-gray-200 transition-colors w-full sm:w-auto text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" /> PDF
                </button>
              </RoleGate>
              <RoleGate allowedRoles={['administrador', 'calidad']}>
                <button
                  onClick={() => setIsExcelOpen(true)}
                  disabled={loadingRecords || saving}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium border border-gray-200 transition-colors w-full sm:w-auto text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" /> Excel
                </button>
              </RoleGate>
              <RoleGate allowedRoles={['administrador', 'operativo', 'calidad']}>
                <button 
                  onClick={() => setIsFormOpen(true)}
                  disabled={loadingRecords || saving}
                  className="flex items-center justify-center gap-2 px-5 py-2 bg-primary hover:bg-primary-light text-white rounded-xl font-bold transition-all shadow-md shadow-primary/20 w-full sm:w-auto text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" /> Nuevo Registro
                </button>
              </RoleGate>
            </>
          )}
        </div>
      </div>

      {banner && (
        <div
          className={[
            'rounded-2xl border px-5 py-4 text-sm flex items-start gap-3',
            banner.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800',
          ].join(' ')}
        >
          {banner.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-bold">{banner.type === 'success' ? 'Listo' : 'Atención'}</p>
            <p className="text-xs mt-1">{banner.message}</p>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            aria-label="Cerrar mensaje"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isFormOpen ? (
        /* Smart Form */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-primary px-8 py-5 flex items-center justify-between text-white">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingRecord ? <Edit2 className="w-5 h-5 text-accent" /> : <Plus className="w-5 h-5 text-accent" />}
                {editingRecord ? 'Editar Despacho' : 'Nuevo Despacho Inteligente'}
              </h2>
              <p className="text-primary-100 text-sm mt-1">
                {editingRecord ? 'Actualice la información del registro seleccionado.' : 'Los campos se autocompletarán según el historial.'}
              </p>
            </div>
            <button onClick={() => { setIsFormOpen(false); setEditingRecord(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
              
              {/* Sección: Tiempo */}
              <div className="col-span-full mb-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" /> Fecha y Hora
                </h3>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Fecha Despacho</label>
                <input type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-gray-900" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Hora</label>
                <input type="time" value={formData.hora} onChange={e => setFormData({...formData, hora: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-gray-900" required />
              </div>

              {/* Sección: Destino */}
              <div className="col-span-full mt-4 mb-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent" /> Cliente y Destino
                </h3>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Cliente / Razón Social</label>
                <input list="clients" value={formData.cliente} onChange={handleClientChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-gray-900 placeholder-gray-400" placeholder="Escriba o seleccione un cliente..." required />
                <datalist id="clients">
                  {Object.keys(MOCK_CLIENTS).map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Destino (Sugerido)</label>
                <input type="text" value={formData.destino} onChange={e => setFormData({...formData, destino: e.target.value})} className="w-full px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm font-medium text-gray-900" required />
              </div>

              {/* Sección: Producto */}
              <div className="col-span-full mt-4 mb-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-accent" /> Detalles del Producto
                </h3>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Nombre Producto</label>
                <input list="products" value={formData.producto} onChange={handleProductChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-gray-900" placeholder="Escriba producto..." required />
                <datalist id="products">
                  {Object.keys(MOCK_PRODUCTS).map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Presentación</label>
                <input type="text" value={formData.presentacion} onChange={e => setFormData({...formData, presentacion: e.target.value})} className="w-full px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm font-medium text-gray-900" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Lote</label>
                <input type="text" value={formData.lote} onChange={e => setFormData({...formData, lote: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-gray-900 uppercase" placeholder="Ej: L-1234" required />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Cant. Bolsas/Bultos</label>
                <input type="number" value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-gray-900" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Peso Total (Kg)</label>
                <input type="number" step="0.01" value={formData.peso} onChange={e => setFormData({...formData, peso: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-gray-900" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Temperatura (°C)</label>
                <input type="text" value={formData.temperatura} onChange={e => setFormData({...formData, temperatura: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-gray-900" placeholder="Ambiente / 4°C" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Calidad Empaque</label>
                <select value={formData.calidadEmpaque} onChange={e => setFormData({...formData, calidadEmpaque: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-gray-900" required>
                  <option>Excelente</option>
                  <option>Bueno</option>
                  <option>Regular</option>
                  <option>Malo (Rechazo)</option>
                </select>
              </div>

              {/* Sección: Transporte */}
              <div className="col-span-full mt-4 mb-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <UserSquare2 className="w-4 h-4 text-accent" /> Transporte y Conductor
                </h3>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Nombre Conductor</label>
                <input list="drivers" value={formData.conductor} onChange={handleDriverChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-gray-900" placeholder="Seleccione conductor..." required />
                <datalist id="drivers">
                  {Object.keys(MOCK_DRIVERS).map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Placa Vehículo</label>
                <input type="text" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value})} className="w-full px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm font-medium text-gray-900 uppercase" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">Firma / CC Conductor</label>
                <input type="text" value={formData.firmaConductor} onChange={e => setFormData({...formData, firmaConductor: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-gray-900" placeholder="CC o nombre" required />
              </div>

              {/* Observaciones */}
              <div className="col-span-full space-y-1.5 mt-4">
                <label className="text-xs font-semibold text-gray-600 uppercase">Observaciones Adicionales</label>
                <textarea rows="2" value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-gray-900" placeholder="Cualquier novedad durante el despacho..."></textarea>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-end gap-3 border-t pt-6">
              <button type="button" onClick={() => { setIsFormOpen(false); setEditingRecord(null); }} className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-light text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" /> {saving ? 'Guardando…' : (editingRecord ? 'Actualizar Registro' : 'Guardar Registro')}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Data Table */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
            <div className="relative w-full sm:w-96">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente, lote, destino..." 
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all shadow-sm" 
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors w-full sm:w-auto shadow-sm">
              <Filter className="w-4 h-4" /> Filtros Avanzados
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">ID Despacho</th>
                  <th className="p-4">Fecha / Hora</th>
                  <th className="p-4">Cliente / Destino</th>
                  <th className="p-4">Producto / Lote</th>
                  <th className="p-4 hidden sm:table-cell">Cant.</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 pr-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingRecords ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-sm text-gray-500">
                      Cargando despachos desde Supabase…
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-sm text-gray-500">
                      {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'No hay despachos registrados. Cree uno manual o importe un Excel.'}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="p-4 pl-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-bold">
                        {record.displayId || record.id}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-gray-900">{record.fecha}</div>
                      <div className="text-xs text-gray-500 hidden md:block">{record.hora}</div>
                    </td>
                    <td className="p-4 max-w-[200px]">
                      <div className="text-sm font-bold text-gray-900 truncate">{record.cliente}</div>
                      <div className="text-xs text-gray-500 truncate">{record.destino}</div>
                    </td>
                    <td className="p-4 max-w-[180px]">
                      <div className="text-sm font-medium text-gray-900 truncate">{record.producto}</div>
                      <div className="text-xs text-gray-500 truncate">Lote: <span className="font-mono text-gray-700">{record.lote}</span></div>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-900">
                      {record.cantidad}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-200/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        {record.estado}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <RoleGate allowedRoles={['administrador']}>
                          <button 
                            onClick={() => handleEdit(record)}
                            className="p-1.5 text-gray-400 hover:text-primary bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all"
                            title="Editar registro"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </RoleGate>
                        <RoleGate allowedRoles={['administrador']}>
                          <button 
                            onClick={() => handleDelete(record.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </RoleGate>
                        {isConductor && (
                          <button className="px-3 py-1 text-xs font-bold text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors">
                            Firmar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  ))
                )
                }
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-200 bg-gray-50/50 text-xs text-gray-500 flex justify-between items-center">
            <span>Mostrando {filteredRecords.length} registros</span>
            <div className="flex gap-1">
              <button className="px-3 py-1 border border-gray-200 rounded-md bg-white text-gray-400 cursor-not-allowed">Anterior</button>
              <button className="px-3 py-1 border border-primary bg-primary text-white rounded-md">1</button>
              <button className="px-3 py-1 border border-gray-200 rounded-md bg-white hover:bg-gray-50 text-gray-700">Siguiente</button>
            </div>
          </div>
        </div>
      )}

      <ExcelUploadModal
        open={isExcelOpen}
        onClose={() => setIsExcelOpen(false)}
        onImported={handleExcelImported}
      />

    </div>
  );
}
