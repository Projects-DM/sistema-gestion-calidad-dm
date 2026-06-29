/**
 * Utilidades de cálculo puro para el Dashboard de Calidad de System U Core.
 * Este módulo no contiene efectos secundarios, dependencias de frameworks ni de Supabase.
 */

/**
 * Determina si una medición numérica está fuera de los límites de tolerancia definidos.
 * @param {number|null} value Valor numérico registrado.
 * @param {Object} options Opciones del campo que contienen los límites min y max.
 * @returns {boolean} True si el valor está fuera de los límites.
 */
export function isMeasurementCritical(value, options) {
  if (value === null || value === undefined || !options) {
    return false;
  }
  const min = options.min;
  const max = options.max;
  
  if (min !== undefined && value < min) return true;
  if (max !== undefined && value > max) return true;
  
  return false;
}

/**
 * Determina si una respuesta del SGC contiene alguna alerta crítica.
 * @param {Object} response Registro de respuesta crudo de Supabase.
 * @returns {boolean} True si el registro es considerado crítico.
 */
export function isResponseCritical(response) {
  if (!response || !response.sgc_response_values) {
    return false;
  }

  return response.sgc_response_values.some(val => {
    const field = val.sgc_form_fields;
    if (!field) return false;
    
    // Sólo consideramos alertas críticas los valores numéricos fuera de rango
    if (field.field_type === 'number' && val.value_number !== null) {
      return isMeasurementCritical(val.value_number, field.options);
    }
    
    return false;
  });
}

/**
 * Transforma un listado de respuestas del SGC en métricas agregadas operativas.
 * @param {Array} responses Respuestas obtenidas del servicio de datos.
 * @returns {Object} Objeto con las métricas calculadas.
 */
export function computeDashboardMetrics(responses) {
  if (!Array.isArray(responses)) {
    return {
      totalRecords: 0,
      todayRecords: 0,
      pendingReview: 0,
      approved: 0,
      rejected: 0,
      critical: 0
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalRecords = responses.length;
  let todayRecords = 0;
  let pendingReview = 0;
  let approved = 0;
  let rejected = 0;
  let critical = 0;

  responses.forEach(res => {
    // 1. Calcular registros de hoy
    if (res.created_at) {
      const resDate = new Date(res.created_at);
      if (resDate >= today) {
        todayRecords++;
      }
    }

    // 2. Mapear estados operacionales
    if (res.status === 'pendiente_revision') {
      pendingReview++;
    } else if (res.status === 'aprobado') {
      approved++;
    } else if (res.status === 'rechazado') {
      rejected++;
    }

    // 3. Evaluar alertas críticas
    if (isResponseCritical(res)) {
      critical++;
    }
  });

  return {
    totalRecords,
    todayRecords,
    pendingReview,
    approved,
    rejected,
    critical
  };
}
