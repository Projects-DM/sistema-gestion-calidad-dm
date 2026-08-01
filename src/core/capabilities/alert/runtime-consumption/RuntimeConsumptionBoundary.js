/**
 * RuntimeConsumptionBoundary
 *
 * Sprint 180 — Protects existing engines from capability-driven
 * parallel systems.
 *
 * Path: Capability → Consumption → Existing Engines.
 * Capability NEVER creates a new parallel system.
 */

export const RUNTIME_CONSUMPTION_BOUNDARY = Object.freeze({
  key: 'runtime-consumption-boundary',
  name: 'Alert Runtime Consumption Boundary',
  protectedPath: Object.freeze([
    'Capability',
    'Consumption',
    'Existing Engines',
  ]),
  forbiddenPath: Object.freeze([
    'Capability',
    'New Parallel System',
  ]),
});

export default RUNTIME_CONSUMPTION_BOUNDARY;
