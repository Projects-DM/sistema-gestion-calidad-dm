/**
 * OperationalBoundary
 *
 * Sprint 174 — Protects Core governance from capability-driven
 * bypass.
 *
 * Path: Capability Pipeline → Existing Core Execution.
 * Capability NEVER bypasses Core governance.
 */

export const OPERATIONAL_BOUNDARY = Object.freeze({
  key: 'operational-boundary',
  name: 'Alert Operational Boundary',
  protectedPath: Object.freeze([
    'Capability Pipeline',
    'Existing Core Execution',
  ]),
  forbiddenPath: Object.freeze([
    'Capability',
    'Bypass Core Governance',
  ]),
});

export default OPERATIONAL_BOUNDARY;
