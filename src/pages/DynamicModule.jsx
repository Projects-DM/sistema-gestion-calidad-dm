import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, FileText, Loader2, ListChecks, History } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { dynamicService } from '../services/dynamicService';
import DocumentModule from '../components/DocumentModule';
import DynamicRecordsView from '../components/DynamicRecordsView';
import ModuleDocumentViewer from '../modules/documentViewer/ModuleDocumentViewer';
import { documentRepositoriesService } from '../services/documentRepositoriesService';
import * as Icons from 'lucide-react';
import { canAccessRole } from '../core/authorization/AuthorizationResolver';
import { NavigationResolver } from '../core/navigation/NavigationResolver';


export default function DynamicModule() {

  const { moduleSlug } = useParams();
  const { rol } = useAuth();
  const navigate = useNavigate();
  
  const [modInfo, setModInfo] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('forms'); // 'forms' or 'records'

  const [repositoryAvailability, setRepositoryAvailability] = useState({
    resolved: false,
    available: false,
  });

  useEffect(() => {
    async function loadModuleAndForms() {
      try {
        setLoading(true);
        const moduleData = await dynamicService.getModuleBySlug(moduleSlug);
        setModInfo(moduleData);
        
        if (moduleData) {
          const formsData = await dynamicService.getFormsByModule(moduleData.id);
          setForms(formsData);
        }
      } catch (error) {
        console.error('Error loading module:', error);
      } finally {
        setLoading(false);
      }
    }
    loadModuleAndForms();
    // Reset tab when module changes
    setActiveTab('forms');
  }, [moduleSlug, navigate]);

  useEffect(() => {
    let mounted = true;

    async function resolveRepositoryAvailability() {
      try {
        setRepositoryAvailability({ resolved: false, available: false });

        // Capability availability source of truth: existing data-driven repositories.
        const repos = await documentRepositoriesService.getRepositories({ moduleSlug });
        const available = (repos || []).some((r) => r.is_active !== false);

        if (!mounted) return;
        setRepositoryAvailability({ resolved: true, available });

        // Keep UX identical: if no repository capability, force standard tab.
        if (!available && activeTab === 'repositorio') {
          setActiveTab('forms');
        }
      } catch (e) {
        console.error('Error resolving repository availability:', e);
        if (!mounted) return;
        setRepositoryAvailability({ resolved: true, available: false });
        if (activeTab === 'repositorio') setActiveTab('forms');
      }
    }

    resolveRepositoryAvailability();

    return () => {
      mounted = false;
    };
  }, [moduleSlug]);

  const filteredForms = forms.filter((f) => canAccessRole(f?.roles_allowed, rol));

  const isRepositorioTabAvailable = repositoryAvailability.available;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-gray-500">Cargando módulo...</p>
      </div>
    );
  }

  if (!modInfo) {
    return (
      <div className="p-8 text-center text-gray-500">
        Módulo no encontrado.
      </div>
    );
  }


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">




      
      {/* Header */}
      <div className="bg-primary rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium mb-4 uppercase tracking-widest">
              {modInfo.name}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Programa de {modInfo.name}</h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              {modInfo.description || `Gestión y control de ${modInfo.name.toLowerCase()}.`}
            </p>
          </div>

          <DocumentModule 
            module={modInfo.slug}
            title={`Programa de ${modInfo.name}`}
            description="Documento técnico normativo del proceso."
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-8">
        <button 
          onClick={() => setActiveTab('forms')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'forms' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2"><ListChecks className="w-4 h-4" /> Diligenciar Registros</div>
        </button>
        <button 
          onClick={() => setActiveTab('records')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'records' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2"><History className="w-4 h-4" /> Historial y Consultas</div>
        </button>
        <button
          onClick={() => setActiveTab('repositorio')}
          className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'repositorio' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          disabled={!isRepositorioTabAvailable}
        >
          <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Repositorio Documental</div>
        </button>
      </div>


      {/* Content */}
      {activeTab === 'forms' ? (

        <div>

          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">

            <div className="w-1.5 h-6 bg-accent rounded-full"></div>
            Formatos Disponibles
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredForms.map((form) => {
              const IconComponent = Icons[form.icon || 'FileText'] || Icons.FileText;
              
              return (
                <Link 
                  to={`/modulo/${moduleSlug}/${form.slug}`} 
                  key={form.id}
                  className="group flex flex-col bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                  
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform duration-300 bg-gray-50 text-primary border border-gray-100">
                    <IconComponent className="w-7 h-7" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{form.name}</h3>
                  <p className="text-sm text-gray-500 mb-6 flex-1">{form.description}</p>
                  
                  <div className="flex items-center text-sm font-bold text-primary group-hover:text-accent transition-colors mt-auto">
                    Ingresar
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
            
            {filteredForms.length === 0 && (
              <div className="col-span-full py-10 text-center text-gray-500">
                No hay formularios configurados para este módulo.
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'repositorio' ? (
        <div className="space-y-6">
        <ModuleDocumentViewer moduleSlug={moduleSlug} />
        </div>
      ) : (
        <DynamicRecordsView moduleId={modInfo.id} />
      )}
    </div>
  );
}
