/**
 * ControlledActivationService
 *
 * Sprint 167 — Processes a controlled activation request.
 *
 * Pipeline: Activation Request → Validation → Governance Check →
 * Enablement Decision. Pure and deterministic. NO runtime
 * registration, NO registry mutation, NO event activation.
 */

import { validateActivation } from './ActivationValidator.js';
import { decideActivation } from './ActivationDecision.js';

export function requestActivation(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      enabled: false,
      runtimeExposure: false,
      registryMutation: false,
      reasons: ['missing-request'],
    });
  }

  const validation = validateActivation(request);
  const decision = decideActivation(validation);

  return Object.freeze({
    ...decision,
    validation,
  });
}

export const ControlledActivationService = Object.freeze({
  name: 'Controlled Activation Service',
  process: requestActivation,
  execution: false,
  runtimeExposure: false,
  registryMutation: false,
});

export default ControlledActivationService;
