/**
 * AlertWorkspaceActionDescriptor
 *
 * Sprint 187 — Operational Navigation Consolidation.
 *
 * The OFFICIAL contract between the Workspace and the existing engines.
 *
 * Describes navigation ONLY. Executes absolutely nothing, never
 * navigates, never imports Router, never consults engines.
 *
 * New documental contract:
 *   {
 *     "action": "go-to-document",
 *     "moduleId": "trazabilidad",
 *     "resourceId": "xxxx",
 *     "documentId": "xxxx",
 *     "tab": "repository"
 *   }
 */

export function buildActionDescriptor(alert, navigation) {
  if (!alert || !navigation || navigation.navigable !== true) {
    return Object.freeze({
      action: null,
      resourceType: null,
      moduleId: null,
      resourceId: null,
      documentId: null,
      tab: null,
      metadata: Object.freeze({}),
      reasons: ['not-navigable'],
    });
  }

  return Object.freeze({
    action: navigation.action,
    resourceType: navigation.resourceType,
    resourceId: navigation.resourceId,
    documentId: navigation.documentId,
    moduleId: navigation.moduleId,
    tab: navigation.tab,
    metadata: navigation.metadata || Object.freeze({}),
    reasons: [],
  });
}

export default buildActionDescriptor;
