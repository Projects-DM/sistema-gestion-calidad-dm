/**
 * OperationalExperienceRegistry
 *
 * Sprint 79 — SSOT registry for Operational Experiences.
 *
 * Operational Experiences are reusable, pluggable feature sets that any
 * module can enable via the 'operational-experiences' capability.
 *
 * Contract:
 *   listExperiences()       => OperationalExperienceDescriptor[]
 *   getExperience(key)      => OperationalExperienceDescriptor | null
 *   resolveComponent(key)   => React.Component | null
 *
 * Rules:
 * - No Runtime/React/Supabase coupling in registry definitions
 * - No module-specific logic
 * - Experiences are registered at module load time
 * - Component resolution is lazy (dynamic import compatible)
 */

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
  resolveComponent: () => import('../../../modules/experiences/dispatches/DispatchesExperience.jsx'),
});

export const OperationalExperienceRegistry = {
  registerExperience,
  listExperiences,
  getExperience,
  resolveComponent,
};

export { registerExperience, listExperiences, getExperience, resolveComponent };
