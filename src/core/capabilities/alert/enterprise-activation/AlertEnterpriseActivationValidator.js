/**
 * AlertEnterpriseActivationValidator
 *
 * Sprint 179 — Validates that Enterprise Activation is possible and
 * that the real runtime pipeline is ready to consume the capability.
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
  const packageReady = request.packageRegistered === true;
  const experienceReady = request.experienceRegistered === true;
  const pipelineReady = request.pipelineConsumption === true;

  if (!packageReady) reasons.push('capability-package-not-registered');
  if (!experienceReady) reasons.push('operational-experience-not-registered');
  if (!pipelineReady) reasons.push('runtime-pipeline-not-ready');

  return Object.freeze({
    capabilityKey: 'alerts',
    packageRegistered: packageReady,
    experienceRegistered: experienceReady,
    pipelineConsumption: pipelineReady,
    valid: reasons.length === 0,
    reasons,
  });
}

export default validateEnterpriseActivation;
