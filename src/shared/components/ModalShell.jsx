import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * ModalShell — Contenedor estandar de overlays de Presentation Layer (Sprint 250).
 *
 * Sprint 250 — UNIFIED MODAL CONTAINER. Centraliza el overlay que antes vivia
 * de forma local dentro de DocumentRepositoriesAdmin, para que Formularios
 * Dinamicos y Repositorios Documentales compartan EXACTAMENTE el mismo
 * contenedor de paneles dedicados. Presentation-only.
 *
 * Responsabilidades (delegacion total al consumidor):
 *   - Overlay fijo con fondo difuminado.
 *   - Cierre por tecla Escape.
 *   - Cierre al hacer click sobre el area oscura (solo el overlay).
 *   - Cabecera (titulo + icono opcional) y cuerpo scrolleable.
 *
 * NO puede: consultar servicios, consumir hooks de negocio, importar Runtime,
 * engines, persistencia, metadata ni logica funcional. Dentro de children el
 * consumidor renderiza los paneles dedicados (FormBuilder, AlertConfigurationPanel,
 * formularios de metadatos, asistentes, etc.).
 *
 * Props:
 *   - open       bool — si esta abierto
 *   - title      string
 *   - icon       (componente lucide)
 *   - onClose    callback
 *   - saving     bool — desactiva el boton cerrar (opcional)
 *   - children   contenido del panel
 */
export default function ModalShell({ open, title, icon, onClose, children, saving }) {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const Icon = icon;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />

      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 bg-primary text-white flex items-center justify-between flex-none">
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" />
            <h3 className="font-bold text-lg">{title}</h3>
          </div>
          <button
            type="button"
            className="p-2 hover:bg-white/10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}