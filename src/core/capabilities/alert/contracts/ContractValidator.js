/**
 * ContractValidator
 *
 * Sprint 152 — Contract First validation boundary.
 *
 * Validates the STRUCTURE of a payload against a certified contract:
 * required fields and type compatibility.
 *
 * Contains NO business rules, NO runtime, NO persistence.
 */

function matchesType(value, type) {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    default:
      return true;
  }
}

/**
 * Validates a payload against a contract's representation definition.
 * @param {object} payload  — data to validate
 * @param {object} contract — certified contract (representation shape)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateContract(payload, contract) {
  const errors = [];
  const representation = contract?.representation;

  if (!representation) {
    return { valid: false, errors: ['Contract has no representation definition'] };
  }

  for (const [field, definition] of Object.entries(representation)) {
    const hasValue = payload?.[field] !== undefined && payload?.[field] !== null;
    if (definition.required && !hasValue) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }
    if (hasValue && definition.type && !matchesType(payload[field], definition.type)) {
      errors.push(`Invalid type for field ${field}: expected ${definition.type}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export const ContractValidator = Object.freeze({
  validateContract,
});

export default ContractValidator;
