/**
 * useCapabilityPublicSet
 *
 * React hook — Runtime integration point.
 *
 * Orchestrates the full Capability resolution pipeline and exposes
 * the Capability Public Set to the Runtime (DynamicModule).
 *
 * Pipeline:
 *   CapabilityPublicSetAdapter (provider)
 *         ↓
 *   ModuleCapabilityResolver
 *         ↓
 *   CapabilityPublicSet  ← the ONLY artifact returned to the caller
 *
 * Sprint 62 migration:
 *   To migrate from the adapter to the real CapabilityPersistenceProvider,
 *   change ONLY the provider instantiation line inside this hook:
 *
 *     // Sprint 61 (current)
 *     const provider = new CapabilityPublicSetAdapter({ moduleSlug });
 *
 *     // Sprint 62+
 *     const provider = new CapabilityPersistenceProvider({ repositories });
 *
 *   DynamicModule, ModuleCapabilityResolver, and CapabilityPublicSet
 *   require ZERO changes.
 *
 * Rules:
 * - No business logic
 * - No module-specific conditions
 * - No direct coupling between DynamicModule and any service
 * - Returns only { capabilityPublicSet, loading, error }
 */

import { useState, useEffect } from 'react';
import { ModuleCapabilityResolver } from '../ModuleCapabilityResolver';
import { CapabilityPublicSetAdapter } from './CapabilityPublicSetAdapter';
import { CapabilityPublicSet } from './CapabilityPublicSet';

/**
 * Resolves the Capability Public Set for a module.
 *
 * @param {object} params
 * @param {string}      params.moduleSlug — module URL slug (used by the adapter internally)
 * @param {string|null} params.moduleId   — module DB identifier (used by the resolver)
 *
 * @returns {{
 *   capabilityPublicSet: CapabilityPublicSet | null,
 *   loading: boolean,
 *   error: Error | null,
 * }}
 */
export function useCapabilityPublicSet({ moduleSlug, moduleId } = {}) {
  const [capabilityPublicSet, setCapabilityPublicSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Wait until both identifiers are available.
    // moduleSlug is available immediately from the URL params.
    // moduleId becomes available after the module data is fetched.
    if (!moduleSlug || !moduleId) {
      setCapabilityPublicSet(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function resolvePublicSet() {
      setLoading(true);
      setCapabilityPublicSet(null);
      setError(null);

      try {
        // ---------------------------------------------------------------
        // SPRINT 61: CapabilityPublicSetAdapter (transitional provider)
        // SPRINT 62: new CapabilityPersistenceProvider({ repositories })
        // ---------------------------------------------------------------
        const provider = new CapabilityPublicSetAdapter({ moduleSlug });

        const resolver = new ModuleCapabilityResolver({ persistenceProvider: provider });

        // Step 1: Run the resolver pipeline.
        // Produces a normalized structural Capability Set (packageIds + assignments).
        // The NormalizationEngine intentionally produces a metadata-agnostic output,
        // so the resolved packages contain only structural fields (packageId, definitionId, etc.).
        const resolvedSet = await resolver.resolveCapabilitySet({ moduleId: String(moduleId) });

        if (cancelled) return;

        // Step 2: Enrich with full package definitions.
        // We re-query the provider via the same interface to obtain UI metadata
        // (capabilityKey, label, icon, order, uiRole) that the NormalizationEngine
        // intentionally strips. This is valid because the provider is stateless
        // and returns deterministic results for the same packageId.
        const definitions = await Promise.all(
          (resolvedSet.packages ?? []).map((p) =>
            provider.getPackageById({ packageId: p.packageId })
          )
        );

        if (cancelled) return;

        // Step 3: Build the CapabilityPublicSet.
        // This is the ONLY artifact returned to DynamicModule.
        const publicSet = new CapabilityPublicSet({
          resolvedSet,
          definitions: definitions.filter(Boolean),
        });

        setCapabilityPublicSet(publicSet);
      } catch (err) {
        if (!cancelled) {
          console.error('useCapabilityPublicSet: resolution failed', err);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    resolvePublicSet();

    return () => {
      cancelled = true;
    };
  }, [moduleSlug, moduleId]);

  return { capabilityPublicSet, loading, error };
}
