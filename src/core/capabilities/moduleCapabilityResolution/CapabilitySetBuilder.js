/**
 * CapabilitySetBuilder
 *
 * Pure builder: constructs a normalized Capability Set from resolved packages
 * using explicit dependency resolution + normalization steps.
 *
 * No business logic.
 * No React/Runtime/UI/Supabase.
 */

import { resolveDependencies } from './DependencyResolutionEngine';
import { normalizeCapabilitySet } from './NormalizationEngine';
import { validateCapabilitySetStructurally } from './CapabilitySetStructuralValidation';

/**
 * @param {object} params
 * @param {Array<object>} params.packages Domain models or package-like objects
 * @param {Array<object>} params.assignments Assignment domain models
 * @param {object} params.options
 */
export async function buildCapabilitySet({ packages, assignments, options } = {}) {
  const resolved = await resolveDependencies({ packages, assignments, options });
  const normalized = normalizeCapabilitySet({ resolved, assignments, options });
  const validation = validateCapabilitySetStructurally({ capabilitySet: normalized });
  if (!validation.ok) throw new Error(validation.error);
  return normalized;
}

