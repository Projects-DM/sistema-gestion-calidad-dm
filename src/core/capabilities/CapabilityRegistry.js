/**
 * CapabilityRegistry
 *
 * Service Registry del Core (Sprint 55)
 * - No ejecuta lógica
 * - No conoce módulos
 * - No conoce Runtime/Metadata
 * - Solo expone referencias a capacidades existentes
 */

import * as AuthorizationResolver from '../authorization/AuthorizationResolver';
import { NavigationResolver } from '../navigation/NavigationResolver';
import { resolveEngineComponent } from '../engine/EngineResolver';

// En este códigobase, Engine "capability" se consume como función resolver.
const engineCapability = {
  resolveEngineComponent,
};

const registry = new Map();

function register(name, capability) {
  if (!name) throw new Error('CapabilityRegistry.register(name, capability): name is required');
  registry.set(name, capability);
}

function getCapability(name) {
  return registry.get(name);
}

function hasCapability(name) {
  return registry.has(name);
}

function listCapabilities() {
  return Array.from(registry.keys());
}

// Registro inicial estático (capacidades certificadas)
register('authorization', AuthorizationResolver);
register('navigation', NavigationResolver);
register('engine', engineCapability);

export const CapabilityRegistry = {
  register,
  getCapability,
  hasCapability,
  listCapabilities,
};

export { register, getCapability, hasCapability, listCapabilities };

