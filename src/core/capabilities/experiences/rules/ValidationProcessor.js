export function validateRecord(record, validationRules) {
  if (!validationRules || !record) return [];
  const errors = [];
  for (const [field, rules] of Object.entries(validationRules)) {
    const value = record[field];
    if (rules.required) {
      const v = String(value ?? '').trim();
      if (!v) {
        errors.push({ field, message: `${field} es obligatorio` });
        continue;
      }
    }
    if (rules.min !== undefined) {
      const n = Number(value);
      if (!isNaN(n) && n < rules.min) {
        errors.push({ field, message: `${field} mínimo es ${rules.min}`, value: n });
      }
    }
    if (rules.max !== undefined) {
      const n = Number(value);
      if (!isNaN(n) && n > rules.max) {
        errors.push({ field, message: `${field} máximo es ${rules.max}`, value: n });
      }
    }
    if (rules.format === 'date' && value) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
        errors.push({ field, message: `${field} debe ser fecha (YYYY-MM-DD)` });
      }
    }
    if (rules.format === 'time' && value) {
      if (!/^\d{2}:\d{2}$/.test(String(value))) {
        errors.push({ field, message: `${field} debe ser hora (HH:mm)` });
      }
    }
    if (rules.format === 'number' && value) {
      if (!/^-?\d+(\.\d+)?$/.test(String(value))) {
        errors.push({ field, message: `${field} debe ser numérico` });
      }
    }
    if (rules.pattern && value) {
      if (!new RegExp(rules.pattern).test(String(value))) {
        errors.push({ field, message: rules.patternMessage || `${field} no coincide con el formato esperado` });
      }
    }
  }
  return errors;
}