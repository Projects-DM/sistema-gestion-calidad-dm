/**
 * AlertRuleDescriptor
 *
 * Sprint 180 (iteración 2) — Defines an operational alert rule.
 *
 * Descriptor ONLY. Describes the rule; never evaluates it.
 */

import { resolvePriority } from './AlertPriorityPolicy.js';
import { AlertConfigurationContract } from './AlertConfigurationContract.js';

export function buildAlertRuleDescriptor(rule) {
  if (!rule || !rule.source || !rule.condition) {
    return Object.freeze({
      valid: false,
      reasons: ['missing-rule-fields'],
    });
  }

  if (!AlertConfigurationContract.supportedSources.includes(rule.source)) {
    return Object.freeze({
      source: rule.source,
      valid: false,
      reasons: ['unsupported-source'],
    });
  }

  const condition = rule.condition;
  const fieldValid = typeof condition.field === 'string' && condition.field.length > 0;
  const operatorValid = typeof condition.operator === 'string' && condition.operator.length > 0;
  const valueValid = condition.value !== undefined && condition.value !== null;

  if (!fieldValid || !operatorValid || !valueValid) {
    return Object.freeze({
      source: rule.source,
      valid: false,
      reasons: ['invalid-condition'],
    });
  }

  const priority = resolvePriority(rule.priority);

  return Object.freeze({
    source: rule.source,
    formId: rule.formId || rule.recordType || rule.documentType || null,
    condition: Object.freeze({
      field: condition.field,
      operator: condition.operator,
      value: condition.value,
    }),
    priority: priority.level,
    priorityLabel: priority.label,
    message: rule.message || 'Condición operacional detectada',
    active: rule.active !== false,
    valid: true,
    reasons: [],
  });
}

export default buildAlertRuleDescriptor;
