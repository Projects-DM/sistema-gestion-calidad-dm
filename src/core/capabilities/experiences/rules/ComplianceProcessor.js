export function checkCompliance(record, complianceRules) {
  if (!complianceRules?.length || !record) return [];
  const issues = [];
  for (const rule of complianceRules) {
    const value = record[rule.field];
    const strVal = String(value ?? '').trim();
    let triggered = false;
    let detail = '';
    if (rule.operator === 'greaterThan' || rule.condition === 'greaterThan') {
      const n = Number(value);
      if (!isNaN(n) && n > rule.value) { triggered = true; detail = `${n} > ${rule.value}`; }
    }
    if (rule.operator === 'lessThan' || rule.condition === 'lessThan') {
      const n = Number(value);
      if (!isNaN(n) && n < rule.value) { triggered = true; detail = `${n} < ${rule.value}`; }
    }
    if (rule.operator === 'equals' || rule.condition === 'equals') {
      if (strVal === String(rule.value ?? '')) { triggered = true; detail = `= ${rule.value}`; }
    }
    if (rule.operator === 'notEmpty' || rule.condition === 'notEmpty') {
      if (strVal !== '') { triggered = true; detail = 'no vacío'; }
    }
    if (rule.operator === 'isEmpty' || rule.condition === 'isEmpty') {
      if (strVal === '') { triggered = true; detail = 'vacío'; }
    }
    if (triggered) {
      issues.push({
        field: rule.field,
        message: rule.message || `${rule.field} no cumple condición (${detail})`,
        severity: rule.severity || 'warning',
        value,
        detail,
      });
    }
  }
  return issues;
}