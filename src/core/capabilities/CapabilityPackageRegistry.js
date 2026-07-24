/**
 * CapabilityPackageRegistry
 *
 * Core SSOT registry for Capability Packages (public descriptors).
 *
 * Contract:
 *   listPackages() => CapabilityPackageDescriptor[]
 *
 * Rules (SPRINT 62.5):
 * - ONLY public information (no persistency/ids/contracts/assignments)
 * - No Runtime/React/Supabase coupling
 * - No module-specific logic
 */

const registry = new Map();

/**
 * @typedef {object} CapabilityPackageDescriptor
 * @property {string} packageKey
 * @property {string} displayName
 * @property {string} description
 * @property {string} category
 * @property {string} icon
 * @property {number} defaultOrder
 * @property {Array<string>} dependencies
 * @property {string} visibility
 * @property {boolean} enabledByDefault
 */

/**
 * @param {object} descriptor
 */
function registerPackage(descriptor) {
  if (!descriptor?.packageKey) {
    throw new Error('CapabilityPackageRegistry.registerPackage: packageKey is required');
  }
  registry.set(descriptor.packageKey, Object.freeze({
    packageKey: descriptor.packageKey,
    displayName: descriptor.displayName,
    description: descriptor.description,
    category: descriptor.category,
    icon: descriptor.icon,
    defaultOrder: descriptor.defaultOrder,
    dependencies: descriptor.dependencies || [],
    visibility: descriptor.visibility,
    enabledByDefault: Boolean(descriptor.enabledByDefault),
  }));
}

function listPackages() {
  return Array.from(registry.values()).sort((a, b) => (a.defaultOrder ?? 99) - (b.defaultOrder ?? 99));
}

function getPackage(packageKey) {
  return registry.get(packageKey) ?? null;
}

// ---------------------------------------------------------------------------
// Certified Standard Shell packages (public descriptors)
// ---------------------------------------------------------------------------

registerPackage({
  packageKey: 'forms',
  displayName: 'Diligenciar Registros',
  description: 'Gestión operativa de formularios dinámicos asociados al módulo.',
  category: 'forms',
  icon: 'ListChecks',
  defaultOrder: 1,
  dependencies: [],
  visibility: 'public',
  enabledByDefault: true,
});

registerPackage({
  packageKey: 'records',
  displayName: 'Historial y Consultas',
  description: 'Consulta histórica y herramientas de búsqueda para el módulo.',
  category: 'records',
  icon: 'History',
  defaultOrder: 2,
  dependencies: [],
  visibility: 'public',
  enabledByDefault: true,
});

registerPackage({
  packageKey: 'repository',
  displayName: 'Repositorio Documental',
  description: 'Gestión documental asociada al módulo (si existe repositorio activo).',
  category: 'repository',
  icon: 'FileText',
  defaultOrder: 3,
  dependencies: [],
  visibility: 'public',
  enabledByDefault: true,
});

registerPackage({
  packageKey: 'operational-experiences',
  displayName: 'Experiencias Operacionales',
  description: 'Funcionalidades operacionales especializadas reutilizables (Despachos, OCR, AI, etc.).',
  category: 'operational-experiences',
  icon: 'Zap',
  defaultOrder: 4,
  dependencies: [],
  visibility: 'public',
  enabledByDefault: true,
});

export const CapabilityPackageRegistry = {
  registerPackage,
  listPackages,
  getPackage,
};

export { registerPackage, listPackages, getPackage };

