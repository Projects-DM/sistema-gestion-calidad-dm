/**
 * OperationalConfigurationBoundary
 *
 * Sprint 180 (iteración 2) — Protects runtime consumption from
 * configuration-driven execution.
 *
 * Path: Configuration → Runtime Consumption.
 * Configuration NEVER executes, automates or notifies.
 */

export const OPERATIONAL_CONFIGURATION_BOUNDARY = Object.freeze({
  key: 'operational-configuration-boundary',
  name: 'Alert Operational Configuration Boundary',
  protectedPath: Object.freeze([
    'Configuration',
    'Runtime Consumption',
  ]),
  forbiddenPath: Object.freeze([
    'Configuration',
    'Execution',
  ]),
});

export default OPERATIONAL_CONFIGURATION_BOUNDARY;
