import { createContext, useContext, useMemo, useState } from 'react';

/**
 * DashboardSearchContext — Infraestructura de Presentation Layer (Sprint 216).
 *
 * Resuelve la frontera de ownership entre:
 *   - DashboardLayout (dueno del Search Input del topbar) y
 *   - Dashboard.jsx   (dueno del indice de busqueda y de los resultados).
 *
 * Responsabilidad EXCLUSIVA: transportar el estado de busqueda.
 *   - compartir el texto de busqueda (`query`)
 *   - compartir la accion de actualizacion (`setQuery`)
 *   - notificar cambios entre Layout y Dashboard.
 *
 * NO puede: construir indices, consultar servicios, consultar Runtime,
 * almacenar resultados ni ejecutar busquedas. Solo transporta estado.
 */

const DashboardSearchContext = createContext(null);

/**
 * Provee el canal de comunicacion de busqueda. Debe envolver tanto el Search
 * Input (Layout) como la pagina Dashboard (Outlet).
 */
export function DashboardSearchProvider({ children }) {
  const [query, setQuery] = useState('');

  const value = useMemo(() => ({ query, setQuery }), [query]);

  return (
    <DashboardSearchContext.Provider value={value}>
      {children}
    </DashboardSearchContext.Provider>
  );
}

/**
 * Consume el canal de busqueda.
 * @returns {{ query: string, setQuery: (v: string) => void }}
 */
export function useDashboardSearch() {
  const ctx = useContext(DashboardSearchContext);
  if (!ctx) {
    throw new Error('useDashboardSearch must be used within a DashboardSearchProvider');
  }
  return ctx;
}

export { DashboardSearchContext };
export default DashboardSearchProvider;