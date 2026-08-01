/**
 * AlertExperienceExposureContract
 *
 * Sprint 177 — Declares how the Alert Capability appears within the
 * administrative ecosystem.
 *
 * Exposure declaration ONLY. Never evaluates, executes or generates.
 */

export const EXPERIENCE_EXPOSURE_VERSION = '1';

export const AlertExperienceExposureContract = Object.freeze({
  contractKey: 'alert.experience-exposure',
  name: 'Alert Experience Exposure Contract',
  version: EXPERIENCE_EXPOSURE_VERSION,
  capabilityKey: 'alerts',
  experienceKey: 'alert-monitoring',
  label: 'Alert Monitoring',
  category: 'operational-control',
  exposureTarget: 'module-configuration',
  visible: true,
  assignable: true,
  targets: Object.freeze(['dynamicForms', 'dynamicRecords', 'documentRepository']),
  representation: Object.freeze({
    exposureIdentity: Object.freeze({ type: 'string', required: true, description: 'Exposure contract identity' }),
    capabilityReference: Object.freeze({ type: 'string', required: true, description: 'Capability key reference' }),
    experienceReference: Object.freeze({ type: 'string', required: true, description: 'Experience key reference' }),
    moduleReference: Object.freeze({ type: 'string', required: true, description: 'Target module reference' }),
  }),
});

export default AlertExperienceExposureContract;
