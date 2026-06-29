import { getSupabaseClient } from '../../../lib/supabase';

export const dashboardService = {
  /**
   * Obtiene la actividad reciente del SGC de forma optimizada.
   * @param {number} limit Límite de registros a retornar.
   * @returns {Promise<Array>} Listado de respuestas recientes.
   */
  async getRecentResponses(limit = 5) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_form_responses')
      .select(`
        id,
        status,
        created_at,
        sgc_forms (
          name, 
          engine_type
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Error fetching recent responses for dashboard:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Obtiene todos los registros necesarios para el procesamiento de KPIs
   * mediante una única consulta optimizada y completa.
   * @param {Object} filters Filtros opcionales para futura extensión (fechas, áreas, etc.).
   * @returns {Promise<Array>} Lista de registros con sus valores y tipos de campos.
   */
  async getRawResponses(filters = {}) {
    const supabase = getSupabaseClient();
    
    // Construimos la consulta base
    let query = supabase
      .from('sgc_form_responses')
      .select(`
        id,
        status,
        created_at,
        sgc_response_values (
          value_number,
          value_boolean,
          sgc_form_fields (
            field_type,
            options
          )
        )
      `);

    // Nota: Aquí se pueden aplicar filtros opcionales en el futuro.
    // Ejemplo: if (filters.startDate) query = query.gte('created_at', filters.startDate);

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching raw responses for dashboard KPIs:', error);
      throw error;
    }
    
    return data || [];
  }
};
export default dashboardService;
