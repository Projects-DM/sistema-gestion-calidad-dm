import { Beaker, Package, Factory, Briefcase, Settings } from 'lucide-react';
import DocumentManager from '../components/DocumentManager';

const CATEGORIES = [
  { id: 'quimicos', name: 'Productos Químicos', icon: Beaker, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'empaque', name: 'Material de Empaque', icon: Package, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'materia_prima', name: 'Materia Prima', icon: Factory, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'insumos', name: 'Insumos', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'equipos', name: 'Equipos', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-50' },
];

export default function TechnicalSheets() {
  return (
    <DocumentManager 
      module="fichas_tecnicas"
      title="Fichas Técnicas"
      subtitle="Repositorio oficial de fichas técnicas de productos y equipos."
      backPath="/trazabilidad"
      backLabel="Volver a Trazabilidad"
      categories={CATEGORIES}
    />
  );
}
