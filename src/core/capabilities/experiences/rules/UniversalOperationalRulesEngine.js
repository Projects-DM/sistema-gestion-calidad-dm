import { validateRecord } from './ValidationProcessor.js';
import { checkBusinessRules } from './BusinessRulesProcessor.js';
import { checkCompliance } from './ComplianceProcessor.js';
import { applyAutomations } from './AutomationProcessor.js';
import { computeVisibility } from './VisibilityProcessor.js';

const CRITICAL_FIELDS = new Set(['cliente', 'producto', 'cantidad']);

export function evaluateRecord(record, contract) {
  const validationRules = contract?.validationRules || {};
  const businessRules = contract?.businessRules || [];
  const complianceRules = contract?.complianceRules || [];

  const rawValidationErrors = validateRecord(record, validationRules);
  const businessErrors = checkBusinessRules(record, businessRules);
  const rawComplianceIssues = checkCompliance(record, complianceRules);

  const criticalErrors = rawValidationErrors.filter(e => CRITICAL_FIELDS.has(e.field));
  const complementaryWarnings = [
    ...rawValidationErrors.filter(e => !CRITICAL_FIELDS.has(e.field)),
    ...rawComplianceIssues,
  ];

  return {
    isValid: criticalErrors.length === 0,
    isImportable: criticalErrors.length === 0,
    criticalErrors,
    validationErrors: rawValidationErrors,
    businessErrors,
    complianceIssues: complementaryWarnings,
    allErrors: criticalErrors,
  };
}

export function applyFormAutomations(data, contract) {
  return applyAutomations(data, contract?.automationRules || []);
}

export function getFormVisibility(data, contract) {
  return computeVisibility(data, contract?.visibilityRules || []);
}

export const UniversalOperationalRulesEngine = {
  evaluateRecord,
  applyFormAutomations,
  getFormVisibility,
};