/**
 * Alert Runtime Compatibility
 *
 * Sprint 154 — Runtime consumption boundary.
 *
 * CERTIFIED STRUCTURE ONLY. Declares how the Alert Capability can be
 * consumed by the SGC-DM Runtime. No execution, no events, no
 * automation.
 */

export { RUNTIME_COMPATIBILITY } from './RuntimeCompatibility.js';
export {
  CapabilityRuntimeContract,
  CAPABILITY_RUNTIME_VERSION,
} from './CapabilityRuntimeContract.js';

export const ALERT_RUNTIME = Object.freeze({
  key: 'runtime',
  name: 'Alert Runtime Compatibility',
  boundary: 'Runtime consumption boundary only',
});

export default ALERT_RUNTIME;
