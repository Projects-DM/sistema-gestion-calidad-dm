/**
 * ControlledRegistryService
 *
 * Sprint 168 — Processes a controlled registry registration request.
 *
 * Pipeline: Approved Activation → Registry Request → Validation →
 * Registration Decision. Pure and deterministic. NO registry insert,
 * NO resolver mutation, NO runtime exposure.
 */

import { validateRegistryRegistration } from './RegistryRegistrationValidator.js';
import { decideRegistryRegistration } from './RegistryDecision.js';

export function requestRegistryRegistration(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      registered: false,
      runtimeExposure: false,
      resolverMutation: false,
      reasons: ['missing-request'],
    });
  }

  const validation = validateRegistryRegistration(request);
  const decision = decideRegistryRegistration(validation);

  return Object.freeze({
    ...decision,
    validation,
  });
}

export const ControlledRegistryService = Object.freeze({
  name: 'Controlled Registry Service',
  process: requestRegistryRegistration,
  registryMutation: false,
  runtimeExposure: false,
});

export default ControlledRegistryService;
