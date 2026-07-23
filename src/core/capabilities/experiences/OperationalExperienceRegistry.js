/**
 * OperationalExperienceRegistry
 *
 * Sprint 79 — SSOT registry for Operational Experiences.
 * Sprint 92 — Universal Normalization Contract: canonicalFields + synonyms + fieldNormalizers.
 *
 * Operational Experiences are reusable, pluggable feature sets that any
 * module can enable via the 'operational-experiences' capability.
 *
 * Contract:
 *   listExperiences()                          => OperationalExperienceDescriptor[]
 *   getExperience(key)                         => OperationalExperienceDescriptor | null
 *   resolveComponent(key)                      => React.Component | null
 *   getExperienceNormalizationContract(key)    => NormalizationContract | null
 *
 * Rules:
 * - No Runtime/React/Supabase coupling in registry definitions
 * - No module-specific logic
 * - Experiences are registered at module load time
 * - Component resolution is lazy (dynamic import compatible)
 * - Normalization contract is consumed by Universal Operational Data Normalizer
 */

import { toYmd, toHm, toNumber } from '../../../services/import/operationalDataExtractionLayer.js';

const registry = new Map();

/**
 * @typedef {object} OperationalExperienceDescriptor
 * @property {string} experienceKey    — unique identifier (e.g., 'dispatches')
 * @property {string} displayName      — human-readable name
 * @property {string} description      — short description
 * @property {string} icon             — Lucide icon name
 * @property {number} defaultOrder     — default display order within the tab
 * @property {string} category         — grouping category
 * @property {Function} resolveComponent — lazy component resolver () => Promise<{ default: React.Component }>
 * @property {string[]} canonicalFields — canonical field names for document normalization
 * @property {object} synonyms          — field -> synonym[] map for header detection
 * @property {object} fieldNormalizers  — field -> (value) => normalized value map
 */

function registerExperience(descriptor) {
  if (!descriptor?.experienceKey) {
    throw new Error('OperationalExperienceRegistry.registerExperience: experienceKey is required');
  }
  registry.set(descriptor.experienceKey, Object.freeze({
    experienceKey: descriptor.experienceKey,
    displayName: descriptor.displayName,
    description: descriptor.description,
    icon: descriptor.icon,
    defaultOrder: descriptor.defaultOrder ?? 99,
    category: descriptor.category ?? 'general',
    resolveComponent: descriptor.resolveComponent,
    canonicalFields: descriptor.canonicalFields ?? [],
    synonyms: descriptor.synonyms ?? {},
    fieldNormalizers: descriptor.fieldNormalizers ?? {},
  }));
}

function listExperiences() {
  return Array.from(registry.values()).sort((a, b) => (a.defaultOrder ?? 99) - (b.defaultOrder ?? 99));
}

function getExperience(experienceKey) {
  return registry.get(experienceKey) ?? null;
}

async function resolveComponent(experienceKey) {
  const exp = registry.get(experienceKey);
  if (!exp?.resolveComponent) return null;
  const mod = await exp.resolveComponent();
  return mod?.default ?? mod ?? null;
}

function getExperienceNormalizationContract(experienceKey) {
  const exp = registry.get(experienceKey);
  if (!exp) return null;
  return {
    canonicalFields: exp.canonicalFields,
    synonyms: exp.synonyms,
    fieldNormalizers: exp.fieldNormalizers,
  };
}

// ---------------------------------------------------------------------------
// Certified Operational Experiences
// ---------------------------------------------------------------------------

registerExperience({
  experienceKey: 'dispatches',
  displayName: 'Despachos',
  description: 'Registro, historial, reportes y búsqueda de despachos del módulo.',
  icon: 'Truck',
  defaultOrder: 1,
  category: 'operations',
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
  resolveComponent: () => import('../../../modules/experiences/dispatches/DispatchesExperience.jsx'),
});

export const OperationalExperienceRegistry = {
  registerExperience,
  listExperiences,
  getExperience,
  resolveComponent,
  getExperienceNormalizationContract,
};

export { registerExperience, listExperiences, getExperience, resolveComponent, getExperienceNormalizationContract };
