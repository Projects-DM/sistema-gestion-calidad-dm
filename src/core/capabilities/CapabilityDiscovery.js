/**
 * CapabilityDiscovery
 *
 * Discovery facade del Core (Sprint 56)
 * - No conoce Runtime
 * - No conoce UI/React
 * - No conoce Metadata/Negocio
 * - Delegación pura al CapabilityRegistry
 */

import { CapabilityRegistry } from './CapabilityRegistry';

function discover(name) {
  return CapabilityRegistry.getCapability(name);
}

function exists(name) {
  return CapabilityRegistry.hasCapability(name);
}

function list() {
  return CapabilityRegistry.listCapabilities();
}

export const CapabilityDiscovery = {
  discover,
  exists,
  list,
};

export { discover, exists, list };

