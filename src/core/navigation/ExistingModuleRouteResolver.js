/**
 * ExistingModuleRouteResolver
 *
 * Sprint 188 — Route Resolution & Existing Navigation Binding Certification.
 *
 * The ONLY official answer to "what is the canonical route for this module?".
 *
 * The Workspace NEVER builds routes manually (no `/modulo/${slug}`
 * interpolation). Instead it ASKS this resolver, which derives the
 * `canonicalRoute` EXCLUSIVELY from the routes registered in the certified
 * Router (ExistingRouteRegistry → src/App.jsx).
 *
 * Responsibilities per identity:
 *   - moduleId   → stable identity of the module (never a route)
 *   - moduleSlug → URL segment used by the existing Router
 *   - routePath  → registered pattern (e.g. `:moduleSlug`, `modulo/:moduleSlug/:formSlug`)
 *   - canonicalRoute → the concrete path built from the registered pattern
 *
 * NEVER imports React Router, NEVER navigates, NEVER creates routes.
 * Pure decision layer: descriptor → resolver → canonicalRoute.
 */

import { EXISTING_ROUTE_REGISTRY } from './ExistingRouteRegistry.js';

export function resolveModuleRoute({ moduleSlug, moduleId } = {}) {
  const slug = moduleSlug || null;

  if (!slug) {
    return Object.freeze({
      resolved: false,
      routeName: null,
      pattern: null,
      target: null,
      canonicalRoute: null,
      identity: moduleId ? { moduleId } : null,
      reasons: ['missing-module-slug'],
    });
  }

  const route = EXISTING_ROUTE_REGISTRY.module;

  return Object.freeze({
    resolved: true,
    routeName: route.name,
    pattern: route.pattern,
    target: route.target,
    canonicalRoute: route.build(slug),
    identity: moduleId ? { moduleId } : null,
    reasons: [],
  });
}

export function resolveFormRoute({ moduleSlug, formSlug, moduleId } = {}) {
  if (!moduleSlug || !formSlug) {
    return Object.freeze({
      resolved: false,
      routeName: null,
      pattern: null,
      target: null,
      canonicalRoute: null,
      identity: moduleId ? { moduleId } : null,
      reasons: ['missing-module-slug-or-form-slug'],
    });
  }

  const route = EXISTING_ROUTE_REGISTRY.form;

  return Object.freeze({
    resolved: true,
    routeName: route.name,
    pattern: route.pattern,
    target: route.target,
    canonicalRoute: route.build(moduleSlug, formSlug),
    identity: moduleId ? { moduleId } : null,
    reasons: [],
  });
}

export function resolveActionRoute(action, { moduleSlug, moduleId, resourceId, alertId, occurrenceId } = {}) {
  if (!action) {
    return Object.freeze({
      resolved: false,
      action,
      canonicalRoute: null,
      reasons: ['missing-action'],
    });
  }

  if (action === 'open-form') {
    const form = resolveFormRoute({ moduleSlug, formSlug: resourceId, moduleId });
    // Sprint 280 — F2. Optional alert context travels as navigation metadata.
    // The canonical route NEVER changes: `/modulo/:moduleSlug/:formSlug`.
    // No mandatory URL params are introduced; normal `open-form` without
    // identity remains fully valid.
    const alertContext =
      alertId && occurrenceId
        ? Object.freeze({ alertId, occurrenceId })
        : null;
    return Object.freeze({ resolved: form.resolved, action, ...form, alertContext, reasons: form.reasons });
  }

  if (action === 'open-record' || action === 'go-to-document') {
    const module = resolveModuleRoute({ moduleSlug, moduleId });
    return Object.freeze({ resolved: module.resolved, action, ...module, reasons: module.reasons });
  }

  return Object.freeze({
    resolved: false,
    action,
    canonicalRoute: null,
    reasons: ['unsupported-action'],
  });
}

export const ExistingModuleRouteResolver = Object.freeze({
  resolveModuleRoute,
  resolveFormRoute,
  resolveActionRoute,
});

export default ExistingModuleRouteResolver;
