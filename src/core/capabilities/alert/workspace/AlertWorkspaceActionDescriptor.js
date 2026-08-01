/**
 * AlertWorkspaceActionDescriptor
 *
 * Sprint 182-R — The OFFICIAL contract between the Workspace and the
 * existing engines.
 *
 * Describes navigation ONLY. Executes absolutely nothing, never
 * navigates, never imports Router, never consults engines.
 */

export function buildActionDescriptor(alert, navigation) {
  if (!alert || !navigation || navigation.navigable !== true) {
    return Object.freeze({
      action: null,
      resourceType: null,
      resourceId: null,
      moduleId: null,
      metadata: Object.freeze({}),
      reasons: ['not-navigable'],
    });
  }

  return Object.freeze({
    action: navigation.action,
    resourceType: navigation.resourceType,
    resourceId: navigation.resourceId,
    moduleId: navigation.moduleId,
    metadata: navigation.metadata || Object.freeze({}),
    reasons: [],
  });
}

export default buildActionDescriptor;
