export function checkBusinessRules(record, businessRules) {
  if (!businessRules?.length || !record) return [];
  const errors = [];
  for (const rule of businessRules) {
    const val = String(record[rule.field] ?? '').trim();
    if (!val) continue;
    for (const required of rule.requires) {
      const reqVal = String(record[required] ?? '').trim();
      if (!reqVal) {
        errors.push({ field: rule.field, message: `${rule.field} requiere ${required}` });
      }
    }
  }
  return errors;
}