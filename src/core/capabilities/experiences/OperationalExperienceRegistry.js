/**
 * OperationalExperienceRegistry
 *
 * Sprint 79 — SSOT registry for Operational Experiences.
 * Sprint 95 — Operational Experience Contract SSOT Certification.
 *
 * ONE EXPERIENCE = ONE CONTRACT = ONE SOURCE OF TRUTH.
 *
 * The pipeline (Universal Normalizer, Import Engine, Runtime, etc.)
 * never knows the experience domain — it only consumes the contract.
 *
 * API:
 *   listExperiences()                        => OperationalExperienceDescriptor[]
 *   getExperience(key)                       => OperationalExperienceDescriptor | null
 *   getExperienceContract(key)               => OperationalExperienceContract | null
 *   resolveComponent(key)                    => React.Component | null
 *
 * Rules:
 * - No Runtime/React/Supabase coupling in registry definitions
 * - No module-specific logic
 * - Experiences are registered at module load time
 * - Component resolution is lazy (dynamic import compatible)
 * - Contract is consumed by Universal Operational Data Normalizer
 */

import { toYmd, toHm, toNumber } from '../../../services/import/operationalDataExtractionLayer.js';
import { getFlowOrchestrator } from './OperationalFlowOrchestrator.js';

const registry = new Map();

getFlowOrchestrator();

/**
 * @typedef {object} OperationalExperienceDescriptor
 * @property {string} experienceKey    — unique identifier (e.g., 'dispatches')
 * @property {object} metadata         — { name, description, icon, version }
 * @property {object} capabilities     — { supportsImport, supportsExport, supportsAudit, supportsDashboard }
 * @property {object} ui               — { tableFields, fieldDisplay, fieldMapping }
 * @property {object} persistence      — { tableName, prefix, fieldMapping }
 * @property {object} documentContract — { canonicalFields, synonyms, fieldNormalizers }
 * @property {object} validationRules  — { field: { required, min, max, format, pattern } }
 * @property {object} businessRules    — [{ field, requires: [] }]
 * @property {object} complianceRules  — [{ field, operator, value, severity }]
 * @property {object} automationRules  — [{ field, action, value }]
 * @property {object} visibilityRules  — [{ field, showWhen }]
 * @property {object} auditRules       — { trackCompliance, trackImports, trackExports, trackRuleExecutions, trackVisibilityChanges }
 * @property {object} dashboardRules   — { enabled, trackTotals, trackCompliance, trackAuditMetrics, groupBy, trendBy, highlight }
 * @property {object} exportRules      — future
 * @property {number} defaultOrder     — default display order within the tab
 * @property {Function} resolveComponent — lazy component resolver () => Promise<{ default: React.Component }>
 */

function registerExperience(descriptor) {
  if (!descriptor?.experienceKey) {
    throw new Error('OperationalExperienceRegistry.registerExperience: experienceKey is required');
  }
  registry.set(descriptor.experienceKey, Object.freeze({
    experienceKey: descriptor.experienceKey,
    metadata: descriptor.metadata ?? {},
    capabilities: descriptor.capabilities ?? {},
    ui: descriptor.ui ?? {},
    persistence: descriptor.persistence ?? {},
    documentContract: descriptor.documentContract ?? { canonicalFields: [], synonyms: {}, fieldNormalizers: {} },
    validationRules: descriptor.validationRules ?? {},
    businessRules: descriptor.businessRules ?? [],
    complianceRules: descriptor.complianceRules ?? [],
    automationRules: descriptor.automationRules ?? [],
    visibilityRules: descriptor.visibilityRules ?? [],
    auditRules: descriptor.auditRules ?? {
      trackCompliance: true,
      trackImports: true,
      trackExports: true,
      trackRuleExecutions: true,
      trackVisibilityChanges: false,
    },
    dashboardRules: descriptor.dashboardRules ?? {
      enabled: true,
      trackTotals: true,
      trackCompliance: true,
      trackAuditMetrics: true,
      groupBy: [],
      trendBy: [],
      highlight: [],
    },
    exportRules: descriptor.exportRules ?? {},
    defaultOrder: descriptor.defaultOrder ?? 99,
    resolveComponent: descriptor.resolveComponent,
  }));
}

function listExperiences() {
  return Array.from(registry.values()).sort((a, b) => (a.defaultOrder ?? 99) - (b.defaultOrder ?? 99));
}

function getExperience(experienceKey) {
  return registry.get(experienceKey) ?? null;
}

function getExperienceContract(experienceKey) {
  const exp = registry.get(experienceKey);
  if (!exp) return null;
  return {
    metadata: exp.metadata,
    capabilities: exp.capabilities,
    ui: exp.ui,
    persistence: exp.persistence,
    documentContract: exp.documentContract,
    validationRules: exp.validationRules,
    businessRules: exp.businessRules,
    complianceRules: exp.complianceRules,
    automationRules: exp.automationRules,
    visibilityRules: exp.visibilityRules,
    auditRules: exp.auditRules,
    dashboardRules: exp.dashboardRules,
    exportRules: exp.exportRules,
    experienceKey: exp.experienceKey,
  };
}

async function resolveComponent(experienceKey) {
  const exp = registry.get(experienceKey);
  if (!exp?.resolveComponent) return null;
  const mod = await exp.resolveComponent();
  return mod?.default ?? mod ?? null;
}

// ---------------------------------------------------------------------------
// Certified Operational Experiences
// ---------------------------------------------------------------------------

registerExperience({
  experienceKey: 'dispatches',
  metadata: {
    name: 'Despachos',
    description: 'Registro, historial, reportes y búsqueda de despachos del módulo.',
    icon: 'Truck',
    version: '2.0',
  },
  capabilities: {
    supportsImport: true,
    supportsExport: true,
    supportsAudit: true,
    supportsDashboard: true,
    supportsHumanValidation: true,
  },
  ui: {
    tableFields: ['fecha', 'hora', 'cliente', 'producto', 'lote', 'cantidad', 'estado'],
    fieldDisplay: {
      fecha: { label: 'Fecha Despacho' },
      hora: { label: 'Hora' },
      cliente: { label: 'Cliente / Razón Social' },
      producto: { label: 'Producto' },
      lote: { label: 'Lote' },
      cantidad: { label: 'Cant. Bolsas' },
      peso: { label: 'Peso (Kg)' },
      destino: { label: 'Destino' },
      placa: { label: 'Placa' },
      conductor: { label: 'Conductor' },
      estado: { label: 'Estado', options: ['pendiente', 'en_proceso', 'completado', 'draft', 'validated', 'ready', 'cerrado'] },
      observaciones: { label: 'Observaciones' },
    },
  },
  persistence: {
    tableName: 'despachos',
    prefix: 'DESP',
    fieldMapping: {
      cantidad: 'cantidad_bolsas',
    },
  },
  documentContract: {
    canonicalFields: [
      'fecha', 'hora', 'cliente', 'producto', 'lote',
      'cantidad', 'peso', 'destino', 'placa', 'conductor', 'estado', 'observaciones',
    ],
    synonyms: {
      fecha: ['fecha', 'fec', 'date', 'fecha despacho', 'fecha de despacho', 'f despacho', 'f', 'doc_date', 'posting_date'],
      hora: ['hora', 'hr', 'time', 'hora despacho', 'hora salida', 'hora_carga', 'sale_time'],
      cliente: ['cliente', 'clientes', 'razon social', 'razon', 'cliente nombre', 'nombre cliente', 'tercero', 'nit', 'comprador', 'customer', 'sold_to', 'ship_to', 'kunnr'],
      producto: ['producto', 'descripcion', 'desc', 'articulo', 'item', 'referencia', 'material', 'matnr', 'material_code', 'sku', 'product_code'],
      lote: ['lote', 'lote prod', 'numero lote', 'batch', 'charg', 'batch_number', 'lote_sap'],
      cantidad: ['cantidad', 'cant', 'cant bolsas', 'cantidad bolsas', 'unidades', 'uds', 'qty', 'cant bultos', 'bolsas', 'quantity', 'menge', 'lfimg'],
      peso: ['peso', 'kilos', 'kilo', 'kg', 'kilogramos', 'peso total', 'weight', 'brtgew', 'ntgew'],
      destino: ['destino', 'direccion', 'dir', 'ciudad', 'bodega', 'punto entrega', 'punto de entrega', 'sede', 'delivery_addr', 'plant', 'werks'],
      placa: ['placa', 'vehiculo', 'vehiculo placa', 'camion', 'tracto', 'placa vehiculo', 'vehicle', 'license_plate'],
      conductor: ['conductor', 'chofer', 'driver', 'transportista', 'nombre conductor', 'driver_name'],
      estado: ['estado', 'status', 'estado despacho', 'state', 'delivery_status'],
      observaciones: ['observaciones', 'obs', 'nota', 'notas', 'comentarios', 'observacion', 'note', 'remarks', 'text'],
    },
    fieldNormalizers: {
      fecha: toYmd,
      hora: toHm,
      cantidad: toNumber,
      peso: toNumber,
    },
  },
  validationRules: {
    cliente: { required: true },
    producto: { required: true },
    fecha: { required: true },
    cantidad: { required: true, min: 1 },
  },
  businessRules: [
    { field: 'producto', requires: ['lote'] },
    { field: 'cliente', requires: ['producto'] },
    { field: 'conductor', requires: ['placa'] },
  ],
  complianceRules: [
    { field: 'cantidad', operator: 'greaterThan', value: 200, severity: 'info', message: 'Despacho mayor a 200 bolsas — verificar capacidad' },
    { field: 'peso', operator: 'greaterThan', value: 5000, severity: 'info', message: 'Peso superior a 5000 kg — verificar límite vehículo' },
    { field: 'estado', operator: 'equals', value: 'pendiente', severity: 'info', message: 'Despacho pendiente de procesar' },
  ],
  automationRules: [
    { field: 'fecha', action: 'setCurrentDate' },
    { field: 'hora', action: 'setCurrentTime' },
    { field: 'estado', action: 'setDefault', value: 'pendiente' },
  ],
  visibilityRules: [
    { field: 'observaciones', showWhen: { producto: 'notEmpty' } },
    { field: 'conductor', showWhen: { placa: 'notEmpty' } },
  ],
  dashboardRules: {
    enabled: true,
    trackTotals: true,
    trackCompliance: true,
    trackAuditMetrics: true,
    groupBy: ['cliente', 'producto', 'estado'],
    trendBy: ['fecha'],
    highlight: ['cliente', 'producto', 'cantidad', 'estado'],
  },
  defaultOrder: 1,
  resolveComponent: () => import('../../../modules/experiences/UniversalOperationalRuntime.jsx'),
});

registerExperience({
  experienceKey: 'inventarios',
  metadata: {
    name: 'Inventarios',
    description: 'Control de inventarios, existencias, stock mínimo/máximo y alertas operacionales.',
    icon: 'Package',
    version: '1.0',
  },
  capabilities: {
    supportsImport: true,
    supportsExport: true,
    supportsAudit: true,
    supportsDashboard: true,
    supportsHumanValidation: true,
  },
  ui: {
    tableFields: ['fecha', 'producto', 'lote', 'cantidad_actual', 'stock_minimo', 'ubicacion', 'estado'],
    fieldDisplay: {
      fecha: { label: 'Fecha' },
      producto: { label: 'Producto' },
      lote: { label: 'Lote' },
      cantidad_inicial: { label: 'Cant. Inicial' },
      cantidad_actual: { label: 'Existencia Actual' },
      stock_minimo: { label: 'Stock Mínimo' },
      stock_maximo: { label: 'Stock Máximo' },
      ubicacion: { label: 'Ubicación / Bodega' },
      estado: { label: 'Estado' },
      responsable: { label: 'Responsable' },
      observaciones: { label: 'Observaciones' },
    },
  },
  persistence: {
    tableName: 'inventarios',
    prefix: 'INV',
    fieldMapping: {},
  },
  documentContract: {
    canonicalFields: [
      'fecha', 'producto', 'lote', 'cantidad_inicial', 'cantidad_actual',
      'stock_minimo', 'stock_maximo', 'ubicacion', 'estado', 'responsable', 'observaciones',
    ],
    synonyms: {
      fecha: ['fecha', 'fec', 'date', 'fecha inventario', 'fec inv'],
      producto: ['producto', 'descripcion', 'desc', 'articulo', 'item', 'referencia', 'material'],
      lote: ['lote', 'batch', 'numero lote', 'lote prod'],
      cantidad_inicial: ['cantidad inicial', 'inicial', 'stock inicial', 'inv inicial', 'cant inicio'],
      cantidad_actual: ['cantidad actual', 'actual', 'stock actual', 'existencia', 'saldo', 'inventario actual', 'cant actual', 'exist'],
      stock_minimo: ['cantidad minima', 'stock minimo', 'minimo', 'min stock', 'stock min', 'cant minima', 'nivel minimo'],
      stock_maximo: ['cantidad maxima', 'stock maximo', 'maximo', 'max stock', 'stock max', 'cant maxima', 'nivel maximo'],
      ubicacion: ['ubicacion', 'bodega', 'almacen', 'deposito', 'zona', 'lugar', 'ubic'],
      estado: ['estado', 'status', 'condicion', 'estado producto'],
      responsable: ['responsable', 'encargado', 'responsable inv', 'usuario'],
      observaciones: ['observaciones', 'obs', 'notas', 'comentarios', 'observacion', 'nota'],
    },
    fieldNormalizers: {
      fecha: toYmd,
      cantidad_inicial: toNumber,
      cantidad_actual: toNumber,
      stock_minimo: toNumber,
      stock_maximo: toNumber,
    },
  },
  validationRules: {
    producto: { required: true },
    cantidad_actual: { required: true, min: 0 },
    stock_minimo: { min: 0 },
    stock_maximo: { min: 0 },
  },
  businessRules: [
    { field: 'stock_minimo', requires: ['cantidad_actual'] },
    { field: 'stock_maximo', requires: ['cantidad_actual'] },
    { field: 'lote', requires: ['producto'] },
  ],
  complianceRules: [
    {
      field: 'cantidad_actual',
      operator: 'lessThan',
      valueField: 'stock_minimo',
      severity: 'warning',
      message: 'Stock por debajo del mínimo — programar reabastecimiento',
    },
    {
      field: 'cantidad_actual',
      operator: 'greaterThan',
      valueField: 'stock_maximo',
      severity: 'info',
      message: 'Stock excede el máximo — verificar capacidad de almacenamiento',
    },
    {
      field: 'estado',
      operator: 'equals',
      value: 'en_cuarentena',
      severity: 'critical',
      message: 'Producto en cuarentena — requiere liberación por calidad',
    },
  ],
  automationRules: [
    { field: 'fecha', action: 'setCurrentDate' },
    { field: 'estado', action: 'setDefault', value: 'aprobado' },
  ],
  visibilityRules: [
    { field: 'observaciones', showWhen: { producto: 'notEmpty' } },
    { field: 'stock_maximo', showWhen: { stock_minimo: 'notEmpty' } },
    { field: 'responsable', showWhen: { producto: 'notEmpty' } },
  ],
  dashboardRules: {
    enabled: true,
    trackTotals: true,
    trackCompliance: true,
    trackAuditMetrics: true,
    groupBy: ['producto', 'ubicacion', 'estado'],
    trendBy: ['fecha'],
    highlight: ['producto', 'cantidad_actual', 'estado'],
  },
  defaultOrder: 2,
  resolveComponent: () => import('../../../modules/experiences/UniversalOperationalRuntime.jsx'),
});

registerExperience({
  experienceKey: 'produccion',
  metadata: {
    name: 'Producción',
    description: 'Registro de órdenes de producción, lotes, rendimiento y control de calidad en línea.',
    icon: 'Factory',
    version: '1.0',
  },
  capabilities: {
    supportsImport: true,
    supportsExport: true,
    supportsAudit: true,
    supportsDashboard: true,
    supportsHumanValidation: true,
  },
  ui: {
    tableFields: ['fecha', 'producto', 'lote', 'cantidad_programada', 'cantidad_producida', 'linea_produccion', 'turno', 'estado'],
    fieldDisplay: {
      fecha: { label: 'Fecha Producción' },
      producto: { label: 'Producto' },
      lote: { label: 'Lote' },
      cantidad_programada: { label: 'Cant. Programada' },
      cantidad_producida: { label: 'Cant. Producida' },
      linea_produccion: { label: 'Línea / Máquina' },
      turno: { label: 'Turno' },
      hora_inicio: { label: 'Hora Inicio' },
      hora_fin: { label: 'Hora Fin' },
      responsable: { label: 'Operador / Responsable' },
      estado: { label: 'Estado' },
      observaciones: { label: 'Observaciones' },
    },
  },
  persistence: {
    tableName: 'produccion',
    prefix: 'PROD',
    fieldMapping: {},
  },
  documentContract: {
    canonicalFields: [
      'fecha', 'producto', 'lote', 'cantidad_programada', 'cantidad_producida',
      'linea_produccion', 'turno', 'hora_inicio', 'hora_fin', 'responsable', 'estado', 'observaciones',
    ],
    synonyms: {
      fecha: ['fecha', 'fec', 'date', 'fecha prod', 'fecha produccion', 'f prod'],
      producto: ['producto', 'descripcion', 'desc', 'articulo', 'item', 'referencia', 'material'],
      lote: ['lote', 'batch', 'numero lote', 'lote prod', 'lote produccion'],
      cantidad_programada: ['cantidad programada', 'programado', 'plan', 'meta', 'objetivo', 'qty plan', 'cant plan', 'c programada'],
      cantidad_producida: ['cantidad producida', 'producido', 'real', 'cantidad real', 'produccion', 'producida', 'total prod', 'c producida'],
      linea_produccion: ['linea produccion', 'linea', 'line', 'linea prod', 'maquina', 'equipo', 'celda', 'linea produccion'],
      turno: ['turno', 'shift', 'jornada', 'turno produccion'],
      hora_inicio: ['hora inicio', 'inicio', 'start', 'hora ini', 'hora inicial', 'hora inicio prod', 'hora arranque'],
      hora_fin: ['hora fin', 'fin', 'end', 'hora final', 'hora termino', 'hora fin prod', 'hora parada'],
      responsable: ['responsable', 'encargado', 'operador', 'supervisor', 'operario', 'nombre operador'],
      estado: ['estado', 'status', 'estado orden', 'estado produccion'],
      observaciones: ['observaciones', 'obs', 'notas', 'comentarios', 'observacion', 'nota', 'incidencia'],
    },
    fieldNormalizers: {
      fecha: toYmd,
      hora_inicio: toHm,
      hora_fin: toHm,
      cantidad_programada: toNumber,
      cantidad_producida: toNumber,
    },
  },
  validationRules: {
    producto: { required: true },
    fecha: { required: true },
    cantidad_producida: { required: true, min: 0 },
    cantidad_programada: { min: 0 },
  },
  businessRules: [
    { field: 'cantidad_producida', requires: ['fecha'] },
    { field: 'hora_fin', requires: ['hora_inicio'] },
    { field: 'lote', requires: ['producto'] },
  ],
  complianceRules: [
    {
      field: 'cantidad_producida',
      operator: 'lessThan',
      valueField: 'cantidad_programada',
      severity: 'warning',
      message: 'Producción por debajo de lo programado — verificar eficiencia',
    },
    {
      field: 'cantidad_producida',
      operator: 'greaterThan',
      valueField: 'cantidad_programada',
      severity: 'info',
      message: 'Sobreproducción detectada — verificar programación',
    },
    {
      field: 'estado',
      operator: 'equals',
      value: 'rechazado',
      severity: 'critical',
      message: 'Lote rechazado por control de calidad',
    },
    {
      field: 'hora_fin',
      operator: 'isEmpty',
      severity: 'info',
      message: 'Orden sin hora de finalización registrada',
    },
  ],
  automationRules: [
    { field: 'fecha', action: 'setCurrentDate' },
    { field: 'hora_inicio', action: 'setCurrentTime' },
    { field: 'estado', action: 'setDefault', value: 'en_proceso' },
  ],
  visibilityRules: [
    { field: 'observaciones', showWhen: { producto: 'notEmpty' } },
    { field: 'hora_fin', showWhen: { hora_inicio: 'notEmpty' } },
    { field: 'turno', showWhen: { linea_produccion: 'notEmpty' } },
  ],
  dashboardRules: {
    enabled: true,
    trackTotals: true,
    trackCompliance: true,
    trackAuditMetrics: true,
    groupBy: ['producto', 'linea_produccion', 'turno', 'estado'],
    trendBy: ['fecha'],
    highlight: ['producto', 'cantidad_producida', 'estado'],
  },
  defaultOrder: 3,
  resolveComponent: () => import('../../../modules/experiences/UniversalOperationalRuntime.jsx'),
});

registerExperience({
  experienceKey: 'recepcion',
  metadata: {
    name: 'Recepción',
    description: 'Recepción de materias primas, proveedores, temperatura, lotes y control de calidad.',
    icon: 'PackageCheck',
    version: '1.0',
  },
  capabilities: {
    supportsImport: true,
    supportsExport: true,
    supportsAudit: true,
    supportsDashboard: true,
    supportsHumanValidation: true,
  },
  ui: {
    tableFields: ['fecha', 'hora', 'proveedor', 'producto', 'lote', 'cantidad', 'temperatura', 'estado_recepcion'],
    fieldDisplay: {
      fecha: { label: 'Fecha Recepción' },
      hora: { label: 'Hora' },
      proveedor: { label: 'Proveedor' },
      producto: { label: 'Producto / Materia Prima' },
      lote: { label: 'Lote' },
      cantidad: { label: 'Cantidad' },
      temperatura: { label: 'Temperatura (°C)' },
      fecha_vencimiento: { label: 'Fecha Vencimiento' },
      estado_recepcion: { label: 'Estado Recepción' },
      responsable: { label: 'Responsable' },
      observaciones: { label: 'Observaciones' },
      ubicacion: { label: 'Ubicación / Bodega' },
    },
  },
  persistence: {
    tableName: 'recepciones',
    prefix: 'REC',
    fieldMapping: {},
  },
  documentContract: {
    canonicalFields: [
      'fecha', 'hora', 'proveedor', 'producto', 'lote', 'cantidad',
      'temperatura', 'fecha_vencimiento', 'estado_recepcion', 'responsable', 'observaciones', 'ubicacion',
    ],
    synonyms: {
      fecha: ['fecha', 'fec', 'date', 'fecha recepcion', 'fecha rec', 'f rec'],
      hora: ['hora', 'hr', 'time', 'hora recepcion', 'hora rec'],
      proveedor: ['proveedor', 'prov', 'supplier', 'vendedor', 'remitente', 'nombre proveedor', 'razon social'],
      producto: ['producto', 'descripcion', 'desc', 'articulo', 'item', 'referencia', 'material', 'materia prima', 'mp', 'insumo'],
      lote: ['lote', 'batch', 'numero lote', 'lote proveedor', 'lote rec', 'lote prod'],
      cantidad: ['cantidad', 'cant', 'qty', 'unidades', 'uds', 'kilos', 'kg', 'total', 'cant recibida', 'recibido'],
      temperatura: ['temperatura', 'temp', 't°', 'temperatura ingreso', 'temp recepcion', 'temperatura producto', 't ingreso'],
      fecha_vencimiento: ['fecha vencimiento', 'vencimiento', 'vto', 'fecha caducidad', 'caducidad', 'exp', 'fecha exp', 'f vencimiento'],
      estado_recepcion: ['estado recepcion', 'estado', 'status', 'estado rec', 'condicion', 'resultado'],
      responsable: ['responsable', 'encargado', 'recibio', 'recepcionista', 'quien recibe', 'usuario'],
      observaciones: ['observaciones', 'obs', 'notas', 'comentarios', 'observacion', 'nota', 'incidencia', 'novedad'],
      ubicacion: ['ubicacion', 'bodega', 'almacen', 'deposito', 'zona', 'lugar', 'destino'],
    },
    fieldNormalizers: {
      fecha: toYmd,
      hora: toHm,
      cantidad: toNumber,
      temperatura: toNumber,
      fecha_vencimiento: toYmd,
    },
  },
  validationRules: {
    producto: { required: true },
    proveedor: { required: true },
    cantidad: { required: true, min: 1 },
    temperatura: { required: true },
    fecha: { required: true },
  },
  businessRules: [
    { field: 'lote', requires: ['producto'] },
    { field: 'fecha_vencimiento', requires: ['producto'] },
    { field: 'responsable', requires: ['fecha'] },
  ],
  complianceRules: [
    {
      field: 'temperatura',
      operator: 'greaterThan',
      value: 4,
      severity: 'warning',
      message: 'Temperatura superior al límite recomendado.',
    },
    {
      field: 'estado_recepcion',
      operator: 'equals',
      value: 'rechazado',
      severity: 'critical',
      message: 'Recepción rechazada.',
    },
    {
      field: 'fecha_vencimiento',
      operator: 'isEmpty',
      severity: 'info',
      message: 'No se registró fecha de vencimiento.',
    },
  ],
  automationRules: [
    { field: 'fecha', action: 'setCurrentDate' },
    { field: 'hora', action: 'setCurrentTime' },
    { field: 'estado_recepcion', action: 'setDefault', value: 'pendiente' },
  ],
  visibilityRules: [
    { field: 'observaciones', showWhen: { producto: 'notEmpty' } },
    { field: 'responsable', showWhen: { fecha: 'notEmpty' } },
  ],
  dashboardRules: {
    enabled: true,
    trackTotals: true,
    trackCompliance: true,
    trackAuditMetrics: true,
    groupBy: ['proveedor', 'producto', 'estado_recepcion'],
    trendBy: ['fecha'],
    highlight: ['producto', 'proveedor', 'temperatura'],
  },
  defaultOrder: 4,
  resolveComponent: () => import('../../../modules/experiences/UniversalOperationalRuntime.jsx'),
});

export const OperationalExperienceRegistry = {
  registerExperience,
  listExperiences,
  getExperience,
  getExperienceContract,
  resolveComponent,
};

export { registerExperience, listExperiences, getExperience, getExperienceContract, resolveComponent };
