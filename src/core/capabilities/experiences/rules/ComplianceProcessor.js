export function checkCompliance(record, complianceRules) {
  if (!complianceRules?.length || !record) return [];
  const issues = [];
  for (const rule of complianceRules) {
    const value = record[rule.field];
    const strVal = String(value ?? '').trim();
    let triggered = false;
    let detail = '';
    const compareValue = rule.valueField ? Number(record[rule.valueField]) : rule.value;
    if (rule.operator === 'greaterThan' || rule.condition === 'greaterThan') {
      const n = Number(value);
      if (!isNaN(n) && n > compareValue) { triggered = true; detail = `${n} > ${compareValue}`; }
    }
    if (rule.operator === 'lessThan' || rule.condition === 'lessThan') {
      const n = Number(value);
      if (!isNaN(n) && n < compareValue) { triggered = true; detail = `${n} < ${compareValue}`; }
    }
    if (rule.operator === 'equals' || rule.condition === 'equals') {
      const eqValue = rule.valueField ? String(record[rule.valueField] ?? '') : String(rule.value ?? '');
      if (strVal === eqValue) { triggered = true; detail = `= ${eqValue}`; }
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