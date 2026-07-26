export function computeCompletionScore(record, contract) {
  if (!record || !contract) return { score: 0, total: 0, filled: 0, missing: [], warnings: [], errors: [] };

  const canonicalFields = contract.documentContract?.canonicalFields || [];
  const validationRules = contract.validationRules || {};
  const businessRules = contract.businessRules || [];
  const total = canonicalFields.length;
  let filled = 0;
  const missing = [];
  const warnings = [];
  const errors = [];

  for (const field of canonicalFields) {
    const val = record[field];
    const hasValue = val !== undefined && val !== null && String(val).trim() !== '';
    if (hasValue) {
      filled++;
    } else {
      if (validationRules[field]?.required) {
        errors.push({ field, message: `${field} es requerido y está vacío` });
      } else {
        missing.push({ field, message: `${field} está vacío (opcional)` });
      }
    }
  }

  for (const rule of businessRules) {
    const fieldVal = String(record[rule.field] ?? '').trim();
    if (fieldVal) {
      for (const dep of rule.requires) {
        if (!String(record[dep] ?? '').trim()) {
          warnings.push({ field: rule.field, message: `${rule.field} informado pero ${dep} está vacío` });
        }
      }
    }
  }

  for (const [field, rules] of Object.entries(validationRules)) {
    const val = record[field];
    if (rules.min !== undefined) {
      const num = Number(val);
      if (!isNaN(num) && num < rules.min) {
        errors.push({ field, message: `${field} (${num}) es menor al mínimo (${rules.min})` });
      }
    }
    if (rules.max !== undefined) {
      const num = Number(val);
      if (!isNaN(num) && num > rules.max) {
        errors.push({ field, message: `${field} (${num}) excede el máximo (${rules.max})` });
      }
    }
  }

  const score = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { score, total, filled, missing, warnings, errors };
}

export function detectDuplicates(records, fields) {
  if (!records?.length || !fields?.length) return [];

  const groups = new Map();
  for (const record of records) {
    const key = fields.map(f => String(record[f] ?? '').trim().toLowerCase()).join('||');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  return Array.from(groups.values())
    .filter(group => group.length > 1)
    .map(group => ({
      ids: group.map(r => r.id),
      count: group.length,
      records: group,
    }));
}

export function detectInconsistencies(record, contract) {
  if (!record || !contract) return [];

  const issues = [];
  const canonicalFields = contract.documentContract?.canonicalFields || [];
  const filledFields = canonicalFields.filter(f => {
    const val = record[f];
    return val !== undefined && val !== null && String(val).trim() !== '';
  });

  if (filledFields.length === 0) return [];

  if (record.cliente && !record.producto) {
    issues.push({ field: 'producto', type: 'inconsistent', message: 'Cliente informado pero producto vacío' });
  }
  if (record.producto && !record.lote) {
    issues.push({ field: 'lote', type: 'inconsistent', message: 'Producto informado pero lote vacío' });
  }
  if (record.placa && !record.conductor) {
    issues.push({ field: 'conductor', type: 'inconsistent', message: 'Placa informada pero conductor vacío' });
  }

  const complianceRules = contract.complianceRules || [];
  for (const rule of complianceRules) {
    const val = record[rule.field];
    if (val === undefined || val === null || String(val).trim() === '') continue;
    const compareValue = rule.valueField ? Number(record[rule.valueField]) : rule.value;
    const num = Number(val);
    if (!isNaN(num) && !isNaN(Number(compareValue))) {
      if (rule.operator === 'greaterThan' && num <= compareValue) continue;
      if (rule.operator === 'lessThan' && num >= compareValue) continue;
      issues.push({ field: rule.field, type: 'compliance', message: rule.message, severity: rule.severity });
    }
  }

  return issues;
}

export function getReadinessState(record, contract) {
  const { score, errors } = computeCompletionScore(record, contract);
  const inconsistencies = detectInconsistencies(record, contract);

  // Sprint 132.1 — CERTIFIED: solo los 5 estados persistentes son evaluados aquí.
  // 'closed' y 'listo' eran sinónimos huérfanos — eliminados. Solo 'cerrado' y 'approved' son reales.
  if (record.estado === 'cerrado') return 'closed';
  if (record.estado === 'approved') return 'approved';
  if (record.estado === 'ready') return 'ready';
  if (inconsistencies.length > 0) return 'inconsistent';
  if (errors.length > 0) return 'pending_completion';
  if (score < 100) return 'draft';
  return 'validated';
}

export function canApprove(record, contract) {
  const state = getReadinessState(record, contract);
  return state === 'ready' || state === 'validated';
}

export function canClose(record, contract) {
  const state = getReadinessState(record, contract);
  return state === 'approved';
}

export function canReopen(record, contract) {
  return record.estado === 'cerrado' || record.estado === 'approved';
}
