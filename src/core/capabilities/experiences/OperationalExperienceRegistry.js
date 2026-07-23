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
 * @property {object} documentContract — { canonicalFields, synonyms, fieldNormalizers }
 * @property {object} validationRules  — future
 * @property {object} auditRules       — future
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
    documentContract: descriptor.documentContract ?? { canonicalFields: [], synonyms: {}, fieldNormalizers: {} },
    validationRules: descriptor.validationRules ?? {},
    auditRules: descriptor.auditRules ?? {},
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
    documentContract: exp.documentContract,
    validationRules: exp.validationRules,
    auditRules: exp.auditRules,
    exportRules: exp.exportRules,
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
  defaultOrder: 1,
  resolveComponent: () => import('../../../modules/experiences/dispatches/DispatchesExperience.jsx'),
});

export const OperationalExperienceRegistry = {
  registerExperience,
  listExperiences,
  getExperience,
  getExperienceContract,
  resolveComponent,
};

export { registerExperience, listExperiences, getExperience, getExperienceContract, resolveComponent };
