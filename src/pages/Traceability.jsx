import { useState, useEffect } from 'react';
import { Truck, History, FileBarChart, Search, ChevronRight, Route as RouteIcon, ShieldCheck, FileText, Loader2, ClipboardList } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import DocumentModule from '../components/DocumentModule';
import { dynamicService } from '../services/dynamicService';
import { canAccessRole } from '../core/authorization/AuthorizationResolver';
import { NavigationResolver } from '../core/navigation/NavigationResolver';




const submodules = [

  {
    id: 1,
    path: '/trazabilidad/despachos',
    name: 'Despachos',
    icon: Truck,
    color: 'bg-accent text-white',
    desc: 'Registro diario de vehículos, productos y conductores.',
    action: 'Registrar Despacho',
    roles: ['administrador', 'calidad', 'operativo', 'consulta', 'conductor']
  },
  {
    id: 2,
    path: '/trazabilidad/despachos',
    name: 'Historial',
    icon: History,
    color: 'bg-white text-gray-700 border border-gray-200',
    desc: 'Consulta cronológica de todos los despachos realizados.',
    action: 'Ver Historial',
    roles: ['administrador', 'calidad', 'operativo', 'consulta']
  },
  {
    id: 3,
    path: '/trazabilidad/despachos',
    name: 'Reportes',
    icon: FileBarChart,
    color: 'bg-white text-gray-700 border border-gray-200',
    desc: 'Análisis, estadísticas y exportación de datos en PDF/Excel.',
    action: 'Generar Reporte',
    roles: ['administrador', 'calidad', 'operativo']
  },
  {
    id: 4,
    path: '/trazabilidad/despachos',
    name: 'Buscar Registros',
    icon: Search,
    color: 'bg-white text-gray-700 border border-gray-200',
    desc: 'Búsqueda avanzada por lote, fecha, cliente o vehículo.',
    action: 'Buscar',
    roles: ['administrador', 'calidad', 'operativo', 'consulta']
  },
  {
    id: 5,
    path: '/trazabilidad/certificados',
    name: 'Certificados de Calidad',
    icon: ShieldCheck,
    color: 'bg-white text-gray-700 border border-gray-200',
    desc: 'Gestión de certificaciones y registros de calidad externos.',
    action: 'Ver Certificados',
    roles: ['administrador', 'calidad', 'operativo', 'consulta']
  },
  {
    id: 6,
    path: '/trazabilidad/fichas-tecnicas',
    name: 'Fichas Técnicas',
    icon: FileText,
    color: 'bg-white text-gray-700 border border-gray-200',
    desc: 'Repositorio oficial de fichas técnicas de productos y equipos.',
    action: 'Ver Fichas',
    roles: ['administrador', 'calidad', 'operativo', 'consulta']
  },
];

export default function Traceability() {


  const { rol } = useAuth();
  const [dynamicForms, setDynamicForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(true);

  const filteredSubmodules = submodules.filter((sub) => canAccessRole(sub?.roles, rol));



  useEffect(() => {
    async function loadDynamicForms() {
      try {
        setFormsLoading(true);
        const moduleData = await dynamicService.getModuleBySlug('trazabilidad');
        if (moduleData) {
          const formsData = await dynamicService.getFormsByModule(moduleData.id);
          const filtered = formsData.filter((f) => canAccessRole(f?.roles_allowed, rol));



          setDynamicForms(filtered);
        }
      } catch (error) {
        console.error('Error cargando formularios dinámicos de Trazabilidad:', error);
      } finally {
        setFormsLoading(false);
      }
    }
    loadDynamicForms();
  }, [rol]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="bg-primary rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium mb-4">
              <RouteIcon className="w-4 h-4 text-accent" />
              TRAZABILIDAD
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Programa de Trazabilidad</h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Gestione el rastreo de productos a lo largo de toda la cadena de distribución. Registre, controle y audite cada etapa del proceso de despacho.
            </p>
          </div>

          <DocumentModule
            module="trazabilidad"
            title="Programa de Trazabilidad"
            description="Documento técnico normativo del proceso de trazabilidad y recall."
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-accent rounded-full"></div>
          Submódulos Disponibles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredSubmodules.map((sub) => (
            <Link
              to={sub.path}
              key={sub.id}
              className={`group flex flex-col bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform duration-300 ${sub.color}`}>
                <sub.icon className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{sub.name}</h3>
              <p className="text-sm text-gray-500 mb-6 flex-1">{sub.desc}</p>

              <div className="flex items-center text-sm font-bold text-primary group-hover:text-accent transition-colors mt-auto">
                {sub.action}
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Runtime Documental Extension (REMOVIDO) */}

      {/* Dynamic Forms Section — solo formularios dinámicos de Trazabilidad */}


      {!formsLoading && dynamicForms.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
            <ClipboardList className="w-5 h-5 text-primary" />
            Formatos Disponibles
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dynamicForms.map((form) => {
              const IconComponent = Icons[form.icon || 'FileText'] || Icons.FileText;
              return (
                <Link
                  to={`/modulo/trazabilidad/${form.slug}`}
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
          </div>
        </div>
      )}

    </div>
  );
}
