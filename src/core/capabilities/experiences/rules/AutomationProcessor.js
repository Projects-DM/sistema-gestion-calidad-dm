import { format } from 'date-fns';

export function applyAutomations(data, automationRules) {
  if (!automationRules?.length) return data;
  const result = { ...data };
  for (const rule of automationRules) {
    const currentVal = String(result[rule.field] ?? '').trim();
    if (rule.action === 'setCurrentDate' && !currentVal) {
      result[rule.field] = format(new Date(), 'yyyy-MM-dd');
    }
    if (rule.action === 'setCurrentTime' && !currentVal) {
      result[rule.field] = format(new Date(), 'HH:mm');
    }
    if (rule.action === 'setDefault' && !currentVal) {
      result[rule.field] = rule.value;
    }
  }
  return result;
}