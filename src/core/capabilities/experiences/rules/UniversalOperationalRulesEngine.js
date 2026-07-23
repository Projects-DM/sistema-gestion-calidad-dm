import { validateRecord } from './ValidationProcessor.js';
import { checkBusinessRules } from './BusinessRulesProcessor.js';
import { checkCompliance } from './ComplianceProcessor.js';
import { applyAutomations } from './AutomationProcessor.js';
import { computeVisibility } from './VisibilityProcessor.js';

export function evaluateRecord(record, contract) {
  const validationRules = contract?.validationRules || {};
  const businessRules = contract?.businessRules || [];
  const complianceRules = contract?.complianceRules || [];

  const validationErrors = validateRecord(record, validationRules);
  const businessErrors = checkBusinessRules(record, businessRules);
  const complianceIssues = checkCompliance(record, complianceRules);

  return {
    isValid: validationErrors.length === 0 && businessErrors.length === 0,
    validationErrors,
    businessErrors,
    complianceIssues,
    allErrors: [...validationErrors, ...businessErrors],
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