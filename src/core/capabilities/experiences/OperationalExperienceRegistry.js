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
 * @property {object} auditRules       — future
 * @property {object} auditRules       — { trackCompliance, trackImports, trackExports, trackRuleExecutions, trackVisibilityChanges }
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
  defaultOrder: 1,
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
