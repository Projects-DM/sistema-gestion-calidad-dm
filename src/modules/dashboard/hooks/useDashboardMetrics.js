import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/dashboardService';
import { computeDashboardMetrics } from '../utils/dashboardCalculations';

/**
 * Custom Hook para gestionar el estado, la consulta y el cálculo de métricas de calidad en el Dashboard.
 * @param {Object} initialFilters Filtros por defecto.
 * @returns {Object} { metrics, recentActivity, loading, error, refresh }
 */
export function useDashboardMetrics(initialFilters = {}) {
  const [metrics, setMetrics] = useState({
    totalRecords: 0,
    todayRecords: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    critical: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentFilters, setCurrentFilters] = useState(initialFilters);

  const refresh = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    
    // Almacenar filtros locales si se proveen
    if (filters && Object.keys(filters).length > 0) {
      setCurrentFilters(prev => ({ ...prev, ...filters }));
    }

    try {
      // Consulta en paralelo para minimizar tiempos de espera
      const [rawResponses, recentResponses] = await Promise.all([
        dashboardService.getRawResponses(filters),
        dashboardService.getRecentResponses(5)
      ]);

      const computed = computeDashboardMetrics(rawResponses);
      setMetrics(computed);
      setRecentActivity(recentResponses);
    } catch (err) {
      console.error('Error loading useDashboardMetrics:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial al montar el hook
  useEffect(() => {
    refresh(currentFilters);
  }, [refresh]);

  return {
    metrics,
    recentActivity,
    loading,
    error,
    refresh
  };
}

export default useDashboardMetrics;
