import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * CollapsiblePanel — Infraestructura visual de Presentation Layer (Sprint 213).
 *
 * Componente puramente visual, reutilizable en toda la plataforma (Configuracion,
 * Gestion Documental, Inventarios, Auditorias, Calidad, Formularios, Reportes).
 *
 * Responsabilidad exclusiva:
 *   - Expandir / contraer
 *   - Renderizar Header (titulo + icono opcional + chevron)
 *   - Renderizar Contenido (children)
 *
 * NO puede: consultar servicios, consumir hooks de negocio, importar Runtime,
 * importar dashboard services, mantener estados funcionales ni realizar calculos.
 * No pertenece al dominio Dashboard; pertenece a la infraestructura visual.
 *
 * @param {Object}   props
 * @param {string}   props.title       Titulo del panel.
 * @param {Function} props.icon        Componente lucide opcional para el header.
 * @param {boolean}  [props.defaultOpen=true] Estado inicial del panel (modo no controlado).
 * @param {boolean}  [props.expanded]  Estado controlado (si se provee, gobierno externo).
 * @param {Function} [props.onExpandedChange] Callback (next) cuando el estado controlado cambia.
 * @param {number|string} [props.badge]       Badge opcional junto al titulo.
 * @param {string}   [props.accent='bg-primary'] Clase tailwind del acento.
 * @param {import('react').ReactNode} props.children Contenido expandible.
 */
export function CollapsiblePanel({
  title,
  icon: Icon,
  defaultOpen = true,
  expanded,
  onExpandedChange,
  badge,
  accent = 'bg-primary',
  children,
}) {
  // Modo no controlado (independiente por panel) preservado: Sprint 213/214/215.
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = expanded !== undefined ? expanded : internalOpen;

  const toggle = () => {
    if (expanded !== undefined) {
      onExpandedChange?.(!open);
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left hover:bg-gray-50 transition-colors group"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className={`w-1.5 h-6 rounded-full shrink-0 ${accent}`} />
          {Icon && <Icon className="w-5 h-5 text-gray-600 shrink-0" />}
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{title}</h2>
          {badge != null && (
            <span className="hidden sm:inline-flex text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </span>
        {open ? (
          <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
        )}
      </button>
      {open && <div className="px-4 sm:px-5 pb-5">{children}</div>}
    </section>
  );
}

export default CollapsiblePanel;