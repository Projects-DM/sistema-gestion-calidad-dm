import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { dynamicService } from '../services/dynamicService';
import { ModuleAdministrationApplicationService } from '../core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js';
import { ModuleCapabilityPersistenceAdapter } from '../core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js';
import { createApplicationRequest } from '../core/applicationLayer/common/contracts/ApplicationRequest.js';
import WorkspaceFoundation from './WorkspaceFoundation';
import {
  Plus,
  LayoutList,
  Layers,
  Save,
  Loader2,
  ArrowLeft,
  Trash2,
  Edit,
  Settings,
  Upload,
  FileText,
  Bell
} from 'lucide-react';
import FormBuilder from '../components/FormBuilder';
import ImportAssistant from '../components/ImportAssistant';
import DocumentRepositoriesAdmin from '../components/documentRepositories/DocumentRepositoriesAdmin';
import AlertConfigurationPanel from '../modules/experiences/AlertConfigurationPanel.jsx';
import { formAlertConfigurationPersistence } from '../modules/experiences/alertConfigurationPersistence.js';

const persistenceProvider = new ModuleCapabilityPersistenceAdapter();
const appService = new ModuleAdministrationApplicationService({ persistenceProvider });

export default function Configuration() {

  const { rol } = useAuth();
  const [activeTab, setActiveTab] = useState('formularios');
  
  // State for modules and forms
  const [modules, setModules] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for Form Builder
  const [selectedForm, setSelectedForm] = useState(null);
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [newFormDef, setNewFormDef] = useState({
    module_id: '',
    name: '',
    slug: '',
    description: '',
    engine_type: 'BaseGeneric',
    roles_allowed: ['administrador', 'calidad', 'operativo']
  });

  const [isEditingForm, setIsEditingForm] = useState(false);
  const [editFormDef, setEditFormDef] = useState(null);

  const [alertConfigTarget, setAlertConfigTarget] = useState(null);

  const [showImport, setShowImport] = useState(false);
  const [importBuilderData, setImportBuilderData] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const modsResult = await appService.execute(
        createApplicationRequest({ operation: 'GET_MODULES' }),
        { actorId: null, actorRole: 'admin', source: 'configuration' }
      );
      const mods = modsResult.success !== false ? (modsResult.data || []) : [];
      setModules(mods.filter((m) => m.slug !== 'configuracion'));
      
      const formsResults = await Promise.all(
        mods.map(m =>
          dynamicService.getFormsByModule(m.id).then(modForms =>
            modForms.map(f => ({...f, module_name: m.name}))
          )
        )
      );
      setForms(formsResults.flat());
    } catch (error) {
      console.error('Error loading config data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFormDef = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Generate a slug if empty
      const slug = newFormDef.slug || newFormDef.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      // We will create the form via a generic upsert or directly through supabase.
      // Since dynamicService doesn't have createForm yet, we'll need to add it or do it here.
      const supabase = (await import('../lib/supabase')).getSupabaseClient();
      
      const { data, error } = await supabase.from('sgc_forms').insert({
        module_id: newFormDef.module_id,
        name: newFormDef.name,
        slug: slug,
        description: newFormDef.description,
        engine_type: newFormDef.engine_type,
        roles_allowed: newFormDef.roles_allowed
      }).select().single();

      if (error) throw error;
      
      alert('Formulario creado. Ahora configura los campos.');
      setIsCreatingForm(false);
      setSelectedForm(data);
      await loadInitialData();
    } catch (error) {
      alert('Error creando formulario: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId) => {
    try {
      const supabase = (await import('../lib/supabase')).getSupabaseClient();
      const { count, error: countError } = await supabase
        .from('sgc_form_fields')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', formId);
      if (countError) throw countError;
      if (count > 0) {
        alert(
          'No es posible eliminar este formulario.\n\n' +
          'Este formulario posee campos configurados.\n\n' +
          'Por políticas de integridad del sistema debe eliminar previamente ' +
          'todos los campos asociados antes de eliminar el formulario.'
        );
        return;
      }
      if (!window.confirm('¿Eliminar este formulario y todas sus respuestas?')) return;
      await supabase.from('sgc_forms').delete().eq('id', formId);
      await loadInitialData();
    } catch (error) {
      alert('Error eliminando: ' + error.message);
    }
  };

  const handleStartEditForm = (form) => {
    setIsCreatingForm(false);
    setIsEditingForm(true);
    setEditFormDef({
      id: form.id,
      module_id: form.module_id,
      name: form.name,
      slug: form.slug,
      description: form.description || '',
      engine_type: form.engine_type,
      roles_allowed: form.roles_allowed || ['administrador', 'calidad', 'operativo']
    });
  };

  const handleCancelEditForm = () => {
    setIsEditingForm(false);
    setEditFormDef(null);
  };

  const handleImportReady = (builderData) => {
    setShowImport(false);
    setImportBuilderData(builderData);
  };

  const handleImportComplete = (form) => {
    setImportBuilderData(null);
    if (form) {
      loadInitialData();
      setSelectedForm(form);
    }
  };

  const handleCancelImport = () => {
    setShowImport(false);
  };

  const handleUpdateFormDef = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const supabase = (await import('../lib/supabase')).getSupabaseClient();
      const { error } = await supabase.from('sgc_forms').update({
        module_id: editFormDef.module_id,
        name: editFormDef.name,
        slug: editFormDef.slug || editFormDef.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: editFormDef.description,
        engine_type: editFormDef.engine_type,
        roles_allowed: editFormDef.roles_allowed
      }).eq('id', editFormDef.id);

      if (error) throw error;
      handleCancelEditForm();
      await loadInitialData();
    } catch (error) {
      alert('Error actualizando formulario: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formsTableData = useMemo(() => forms, [forms]);

  const modulesOptions = useMemo(() => modules, [modules]);

  if (rol !== 'administrador') {
    return <div className="p-8 text-center text-red-500">Acceso denegado. Se requiere rol de administrador.</div>;
  }

  // Render the Field Builder in import mode
  if (importBuilderData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <button onClick={() => setImportBuilderData(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Constructor Visual: {importBuilderData.name}</h1>
            <p className="text-sm text-gray-500">Revisa y modifica los campos detectados antes de guardar.</p>
          </div>
        </div>
        <FormBuilder
          formDef={{ id: 'import' }}
          importMode={true}
          importFormDef={importBuilderData}
          onImportComplete={handleImportComplete}
        />
      </div>
    );
  }

  // Render the Alert Configuration panel view if a form is targeted
  if (alertConfigTarget) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <button onClick={() => setAlertConfigTarget(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alertas: {alertConfigTarget.name}</h1>
            <p className="text-sm text-gray-500">
              Configura la metadata de alertas de este formulario. Solo metadata — el motor evalúa la configuración.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <AlertConfigurationPanel
            resourceKind="dynamicForms"
            resource={alertConfigTarget}
            persistence={formAlertConfigurationPersistence}
          />
        </div>
      </div>
    );
  }

  // Render the Field Builder view if a form is selected
  if (selectedForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <button onClick={() => setSelectedForm(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Constructor Visual: {selectedForm.name}</h1>
            <p className="text-sm text-gray-500">Configura los campos dinámicos para este formulario.</p>
          </div>
        </div>
        
        <FormBuilder formDef={selectedForm} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-primary rounded-3xl p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-sm font-medium mb-4 uppercase">
            Panel Administrativo
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Configuración del Sistema</h1>
          <p className="text-slate-300">Gestión de módulos, formularios dinámicos y parámetros.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 gap-8">
        <button 
          onClick={() => setActiveTab('formularios')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'formularios' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2"><LayoutList className="w-4 h-4" /> Formularios Dinámicos</div>
        </button>
        <button 
          onClick={() => setActiveTab('documentos')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'documentos' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Repositorios Documentales</div>
        </button>
        <button 
          onClick={() => setActiveTab('modulos')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'modulos' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2"><Layers className="w-4 h-4" /> Módulos</div>
        </button>
      </div>


      {loading && !isCreatingForm && (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      )}

      {activeTab === 'formularios' && !loading && (
        <div className="space-y-6">
          {showImport ? (
            <ImportAssistant
              modules={modules}
              onReady={handleImportReady}
              onCancel={handleCancelImport}
            />
          ) : isEditingForm ? (
            <div className="bg-amber-50 p-6 md:p-8 rounded-2xl border border-amber-200 shadow-sm max-w-2xl mx-auto">
              <h2 className="text-xl font-bold mb-6">Editando Formulario</h2>
              <form onSubmit={handleUpdateFormDef} className="space-y-5">

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Módulo Destino *</label>
                  <select
                    required
                    value={editFormDef.module_id}
                    onChange={e => setEditFormDef({...editFormDef, module_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Selecciona un módulo...</option>
                    {modulesOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Formulario *</label>
                  <input
                    type="text" required
                    value={editFormDef.name}
                    onChange={e => setEditFormDef({...editFormDef, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Ej. Checklist Diario de Vehículos"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Identificador (slug)</label>
                  <input
                    type="text"
                    value={editFormDef.slug}
                    onChange={e => setEditFormDef({...editFormDef, slug: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Se genera automáticamente desde el nombre"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Motor Dinámico *</label>
                  <select
                    required
                    value={editFormDef.engine_type}
                    onChange={e => setEditFormDef({...editFormDef, engine_type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="BaseGeneric">CRUD Genérico (Textos, Opciones)</option>
                    <option value="BaseChecklist">Checklist (Cumple / No Cumple)</option>
                    <option value="BaseMediciones">Mediciones (Números, Tolerancias)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">El motor define cómo se visualizará y validará el formulario para el operario.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Descripción breve</label>
                  <input
                    type="text"
                    value={editFormDef.description}
                    onChange={e => setEditFormDef({...editFormDef, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button" onClick={handleCancelEditForm}
                    className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          ) : !isCreatingForm ? (
            <>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowImport(true)}
                  className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4" /> Importar Formulario
                </button>
                <button 
                  onClick={() => setIsCreatingForm(true)}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-light transition-colors"
                >
                  <Plus className="w-4 h-4" /> Nuevo Formulario
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">

                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Formulario</th>
                      <th className="px-6 py-4 font-semibold hidden md:table-cell">Módulo Asignado</th>
                      <th className="px-6 py-4 font-semibold hidden lg:table-cell">Motor Dinámico</th>
                      <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {formsTableData.map(form => (
                      <tr key={form.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 max-w-[260px]">
                          <p className="font-bold text-gray-900 truncate">{form.name}</p>
                          <p className="text-xs text-gray-500 truncate">{form.slug}</p>
                        </td>
                        <td className="px-6 py-4 max-w-[160px] hidden md:table-cell">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 truncate max-w-full">
                            {form.module_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                            {form.engine_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setAlertConfigTarget(form)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Configurar alertas del formulario"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStartEditForm(form)}
                              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar metadatos del formulario"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setSelectedForm(form)}
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Configurar Campos"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteForm(form.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {formsTableData.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                          No hay formularios configurados aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm max-w-2xl mx-auto">
              <h2 className="text-xl font-bold mb-6">Crear Nuevo Formulario</h2>
              <form onSubmit={handleSaveFormDef} className="space-y-5">
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Módulo Destino *</label>
                  <select 
                    required
                    value={newFormDef.module_id}
                    onChange={e => setNewFormDef({...newFormDef, module_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Selecciona un módulo...</option>
                    {modulesOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Formulario *</label>
                  <input 
                    type="text" required
                    value={newFormDef.name}
                    onChange={e => setNewFormDef({...newFormDef, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Ej. Checklist Diario de Vehículos"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Motor Dinámico *</label>
                  <select 
                    required
                    value={newFormDef.engine_type}
                    onChange={e => setNewFormDef({...newFormDef, engine_type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="BaseGeneric">CRUD Genérico (Textos, Opciones)</option>
                    <option value="BaseChecklist">Checklist (Cumple / No Cumple)</option>
                    <option value="BaseMediciones">Mediciones (Números, Tolerancias)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">El motor define cómo se visualizará y validará el formulario para el operario.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Descripción breve</label>
                  <input 
                    type="text" 
                    value={newFormDef.description}
                    onChange={e => setNewFormDef({...newFormDef, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button 
                    type="button" onClick={() => setIsCreatingForm(false)}
                    className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Crear y Configurar Campos
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documentos' && (
        <div className="space-y-6">
          <DocumentRepositoriesAdmin />
        </div>
      )}

      {activeTab === 'modulos' && (
        <div className="space-y-6">
          <WorkspaceFoundation />
        </div>
      )}


    </div>
  );
}
