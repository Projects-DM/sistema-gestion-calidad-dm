/**
 * PlatformDependencyContract
 *
 * Sprint 165 — Declares allowed platform dependencies, dependency
 * ownership and evolution rules.
 *
 * Governs platform coupling. Does NOT instantiate dependencies.
 */

export const PLATFORM_DEPENDENCY_VERSION = '1';

export const PlatformDependencyContract = Object.freeze({
  contractKey: 'alert.platform-dependency',
  name: 'Platform Dependency Contract',
  version: PLATFORM_DEPENDENCY_VERSION,
  capabilityKey: 'alerts',
  allowed: Object.freeze([
    'Capability Registry',
    'Runtime Contracts',
    'Governance Services',
    'Authorization Infrastructure',
  ]),
  forbidden: Object.freeze([
    'Database Schema',
    'Infrastructure Providers',
    'UI Components',
    'External APIs',
  ]),
  evolutionRules: Object.freeze([
    'Capability v1 → v2 evolves without breaking existing contracts',
    'Every platform dependency keeps an owner',
  ]),
});

export default PlatformDependencyContract;
