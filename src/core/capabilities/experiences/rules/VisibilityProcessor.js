function evaluateCondition(record, condition) {
  if (typeof condition === 'string') {
    const operators = {
      notEmpty: (v) => String(v ?? '').trim() !== '',
      isEmpty: (v) => String(v ?? '').trim() === '',
      truthy: (v) => !!v,
    };
    return operators[condition] ? operators[condition](null) : true;
  }
  if (typeof condition === 'object' && condition !== null) {
    for (const [field, expr] of Object.entries(condition)) {
      const val = record[field];
      if (typeof expr === 'string') {
        if (expr === 'notEmpty' && String(val ?? '').trim() === '') return false;
        if (expr === 'isEmpty' && String(val ?? '').trim() !== '') return false;
        if (expr === 'truthy' && !val) return false;
      }
      if (typeof expr === 'object' && expr !== null) {
        if (expr.operator === 'greaterThan' && Number(val) <= expr.value) return false;
        if (expr.operator === 'lessThan' && Number(val) >= expr.value) return false;
        if (expr.operator === 'equals' && String(val) !== String(expr.value)) return false;
        if (expr.operator === 'notEmpty' && String(val ?? '').trim() === '') return false;
        if (expr.operator === 'isEmpty' && String(val ?? '').trim() !== '') return false;
      }
    }
    return true;
  }
  return true;
}

export function computeVisibility(record, visibilityRules) {
  if (!visibilityRules?.length) return {};
  const visibility = {};
  for (const rule of visibilityRules) {
    visibility[rule.field] = evaluateCondition(record, rule.showWhen);
  }
  return visibility;
}