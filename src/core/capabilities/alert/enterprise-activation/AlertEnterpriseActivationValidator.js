/**
 * AlertEnterpriseActivationValidator
 *
 * Sprint 179 / Audit-1 (SSOT) — Validates that Enterprise Activation is
 * possible and that the real runtime pipeline is ready to consume the
 * capability.
 *
 * Sprint 180-R / Audit-1: the capability is EXPERIENCE-ONLY. Activation
 * requires ONLY the operational experience to be registered and the
 * pipeline to be ready. No capability package is required (the `alerts`
 * package is intentionally not registered to keep a single configuration
 * entry via Experiencias Operacionales → Alert Monitoring).
 *
 * Validation ONLY. Never registers, never executes.
 */

export function validateEnterpriseActivation(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      valid: false,
      reasons: ['missing-activation-context'],
    });
  }

  if (request.capability !== 'alerts') {
    return Object.freeze({
      capabilityKey: 'alerts',
      valid: false,
      reasons: ['capability-not-registered'],
    });
  }

  if (request.executionRequested === true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      valid: false,
      reasons: ['execution-not-allowed'],
    });
  }

  const reasons = [];
  const experienceReady = request.experienceRegistered === true;
  const pipelineReady = request.pipelineConsumption === true;

  if (!experienceReady) reasons.push('operational-experience-not-registered');
  if (!pipelineReady) reasons.push('runtime-pipeline-not-ready');

  return Object.freeze({
    capabilityKey: 'alerts',
    experienceRegistered: experienceReady,
    pipelineConsumption: pipelineReady,
    valid: reasons.length === 0,
    reasons,
  });
}

export default validateEnterpriseActivation;
