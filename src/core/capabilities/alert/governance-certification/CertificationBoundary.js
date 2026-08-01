/**
 * CertificationBoundary
 *
 * Sprint 166 — Protects the certified architecture from premature
 * runtime execution.
 *
 * Path: Certified Architecture → Future Implementation → Controlled
 * Evolution. Certification NEVER enables runtime execution.
 */

export const CERTIFICATION_BOUNDARY = Object.freeze({
  key: 'certification-boundary',
  name: 'Alert Certification Boundary',
  protectedPath: Object.freeze([
    'Certified Architecture',
    'Future Implementation',
    'Controlled Evolution',
  ]),
  forbiddenPath: Object.freeze([
    'Certification',
    'Runtime Execution',
  ]),
});

export default CERTIFICATION_BOUNDARY;
