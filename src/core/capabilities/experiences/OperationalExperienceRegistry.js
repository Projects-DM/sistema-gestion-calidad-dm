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

const registry = new Map();

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
    tableFields: ['fecha', 'hora', 'cliente', 'producto', 'lote', 'cantidad'],
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
      'cantidad', 'peso', 'destino', 'placa', 'conductor', 'observaciones',
    ],
    synonyms: {
      fecha: ['fecha', 'fec', 'fecha despacho', 'fecha de despacho', 'f despacho', 'f'],
      hora: ['hora', 'hr', 'time', 'hora despacho'],
      cliente: ['cliente', 'clientes', 'razon social', 'razon', 'cliente nombre', 'nombre cliente', 'tercero', 'nit', 'comprador'],
      producto: ['producto', 'descripcion', 'desc', 'articulo', 'item', 'referencia', 'material'],
      lote: ['lote', 'lote prod', 'numero lote', 'batch'],
      cantidad: ['cantidad', 'cant', 'cant bolsas', 'cantidad bolsas', 'unidades', 'uds', 'qty', 'cant bultos', 'bolsas'],
      peso: ['peso', 'kilos', 'kilo', 'kg', 'kilogramos', 'peso total'],
      destino: ['destino', 'direccion', 'dir', 'ciudad', 'bodega', 'punto entrega', 'punto de entrega', 'sede'],
      placa: ['placa', 'vehiculo', 'vehiculo placa', 'camion', 'tracto', 'placa vehiculo'],
      conductor: ['conductor', 'chofer', 'driver', 'transportista', 'nombre conductor'],
      observaciones: ['observaciones', 'obs', 'nota', 'notas', 'comentarios', 'observacion'],
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
    cantidad: { min: 1 },
  },
  businessRules: [
    { field: 'producto', requires: ['lote'] },
    { field: 'cliente', requires: ['producto'] },
  ],
  complianceRules: [
    { field: 'cantidad', operator: 'greaterThan', value: 200, severity: 'info', message: 'Despacho mayor a 200 bolsas — verificar capacidad' },
  ],
  automationRules: [
    { field: 'fecha', action: 'setCurrentDate' },
    { field: 'hora', action: 'setCurrentTime' },
  ],
  visibilityRules: [
    { field: 'observaciones', showWhen: { producto: 'notEmpty' } },
  ],
  dashboardRules: {
    enabled: true,
    trackTotals: true,
    trackCompliance: true,
    trackAuditMetrics: true,
    groupBy: ['cliente', 'producto'],
    trendBy: ['fecha'],
    highlight: ['cliente', 'producto', 'cantidad'],
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

export const OperationalExperienceRegistry = {
  registerExperience,
  listExperiences,
  getExperience,
  getExperienceContract,
  resolveComponent,
};

export { registerExperience, listExperiences, getExperience, getExperienceContract, resolveComponent };
