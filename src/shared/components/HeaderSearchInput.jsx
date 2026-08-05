import { Search } from 'lucide-react';
import { useDashboardSearch } from './DashboardSearchContext';

/**
 * HeaderSearchInput — Consumidor oficial del Dashboard Search Context (Sprint 218).
 *
 * Presentation ONLY. Es el UNICO consumidor del Search Context (ademas del
 * Dashboard). Refleja unicamente el estado del contexto (query/setQuery).
 *
 * NO conoce Runtime, Dashboard, indices, modulos, metricas, resultados ni
 * filtros. Satisfaces la jerarquia React: el DashboardSearchProvider es su
 * ancestro (montado por DashboardLayout), por lo que el ciclo es valido:
 *
 *   Provider -> HeaderSearchInput -> useDashboardSearch()
 */
export function HeaderSearchInput() {
  const { query, setQuery } = useDashboardSearch();

  return (
    <div className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2 border border-gray-200 focus-within:border-primary/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10 transition-all w-80">
      <Search className="w-4 h-4 text-gray-400 mr-2" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar módulo, registro, lote..."
        className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
      />
    </div>
  );
}

export default HeaderSearchInput;