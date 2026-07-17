import { useMemo, useState, useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import DynamicModule from './DynamicModule';
import { dynamicService } from '../services/dynamicService';

/**
 * DynamicModuleById
 *
 * Wrapper for Sprint 62 — Fase 1
 * Implements stable module identity by moduleId route.
 *
 * Flow:
 *   /:moduleId (stable)
 *     → fetch module by id
 *     → redirect to legacy slug route (/:moduleSlug)
 *     → DynamicModule loads metadata by slug (compatibility)
 *
 * Architectural intent:
 *   - moduleId is the stable identity for routing
 *   - slug remains an alias only
 *
 * Note:
 *   DynamicModule itself still loads module metadata via slug.
 *   This wrapper preserves identity stability at the routing layer
 *   without modifying certified Core boundaries.
 */
export default function DynamicModuleById() {
  const { moduleId } = useParams();

  // Because this wrapper must be synchronous for React Router v6,
  // we use a small component pattern: return Navigate once resolved.
  // We resolve asynchronously via DynamicModule's data-loading path
  // by using a client-side redirect only when data is available.

  // Minimal implementation: perform a best-effort redirect.
  // If resolution fails, fall back to DynamicModule with moduleSlug = moduleId
  // (DynamicModule will show "Módulo no encontrado").
  const resolved = useMemo(() => ({ moduleId }), [moduleId]);

  // Async resolution via side-effect is not possible here without
  // hooks beyond useMemo; we therefore render a lightweight guard.
  // The guard component is implemented inline.

  const Guard = () => {
    const [slug, setSlug] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let cancelled = false;
      async function load() {
        try {
          setLoading(true);
          const mod = await dynamicService.getModuleById({ moduleId: resolved.moduleId });
          if (cancelled) return;
          setSlug(mod?.slug ?? null);
        } catch {
          if (cancelled) return;
          setSlug(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [resolved.moduleId]);

    if (loading) return null;
    if (slug) return <Navigate to={`/${slug}`} replace />;
    // Fallback: keep the page mounted to preserve UX; DynamicModule will render no-found.
    return <DynamicModule />;
  };

  return <Guard />;
}

