/**
 * RuntimeExposureBoundary
 *
 * Sprint 169 — Protects the runtime from visibility-driven execution.
 *
 * Path: Runtime Visibility → Future Capability Consumption. Runtime
 * visibility NEVER triggers execution.
 */

export const RUNTIME_EXPOSURE_BOUNDARY = Object.freeze({
  key: 'runtime-exposure-boundary',
  name: 'Alert Runtime Exposure Boundary',
  protectedPath: Object.freeze([
    'Runtime Visibility',
    'Future Capability Consumption',
  ]),
  forbiddenPath: Object.freeze([
    'Visibility',
    'Execution',
  ]),
});

export default RUNTIME_EXPOSURE_BOUNDARY;
