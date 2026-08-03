/**
 * Alert Runtime Wiring
 *
 * Sprint 202 — Runtime Configuration Wiring Integration (LEVEL 5, wiring only).
 * Sprint 202.R — Boundary certified: INTEGRATION (transport) layer.
 * Sprint 202.R2 — Architecture Freeze: the whole runtime-wiring/ folder is frozen.
 *
 * Connects the Operational Experience (persisted metadata) to the Runtime
 * (consumption) EXCLUSIVELY through shared metadata, WITHOUT modifying any
 * certified layer:
 *
 *   - Operational Experience components (Application / Port / Adapter /
 *     Mapper / Validation / Panel / Form) — frozen.
 *   - Runtime / Evaluation / Consumption / Dashboard / Workspace — frozen.
 *
 * This module provides the THREE new wiring components and exposes
 * `runtimeConfigurationProvider` as the single official runtime configuration
 * source:
 *
 *   1. AlertRuntimeConfigurationProvider   → official configuration transport
 *   2. AlertRuntimeConfigurationBridge     → experience → runtime input entry
 *   3. RuntimeConfigurationSynchronization → provenance → runtime context
 *
 * Integration Layer ONLY. It TRANSPORTS Runtime INPUT and NEVER produces
 * Runtime OUTPUT (never an AlertEvaluation, Descriptor, Strategy or Policy).
 *
 * No parallel Runtime, no EventBus/Context/Provider, no polling, no
 * scheduling, no cache, no duplicated state, no direct DB reads from the
 * Runtime. All future extensions (Configuration Cache, Configuration
 * Replication, Offline Runtime, Multi Runtime, Distributed Runtime) must
 * connect to runtime-wiring and the Runtime — never modify the Runtime.
 */

export {
  runtimeConfigurationProvider,
  provideRuntimeConfiguration,
  hashRuntimeConfiguration,
  RUNTIME_CONFIGURATION_VERSION,
} from './AlertRuntimeConfigurationProvider.js';

export {
  alertRuntimeConfigurationBridge,
  buildRuntimeConfigurationEntry,
  RUNTIME_CONFIGURATION_BRIDGE_VERSION,
} from './AlertRuntimeConfigurationBridge.js';

export {
  runtimeConfigurationSynchronization,
  synchronizeRuntimeConfiguration,
  RUNTIME_CONFIGURATION_SYNC_VERSION,
} from './RuntimeConfigurationSynchronization.js';

/**
 * Public wiring surface consumed by the Runtime.
 *
 * `runtimeConfigurationProvider` is the ONLY entry the Runtime uses to obtain
 * an official configuration; it never reads metadata/storage keys itself.
 */
export const RUNTIME_WIRING = Object.freeze({
  key: 'runtime-configuration-wiring',
  name: 'Alert Runtime Configuration Wiring',
  version: '202.R2',
  capabilityKey: 'alerts',
  layer: 'integration',
  wiringOnly: true,
  transportOnly: true,
  producesRuntimeInput: true,
  producesRuntimeOutput: false,
  modifiesCertifiedLayers: false,
  frozen: true,
  components: Object.freeze([
    'runtime-configuration-provider',
    'alert-runtime-configuration-bridge',
    'runtime-configuration-synchronization',
  ]),
});

export default RUNTIME_WIRING;