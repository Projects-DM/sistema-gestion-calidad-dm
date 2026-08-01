/**
 * AlertWorkspaceActionDescriptor
 *
 * Sprint 181 (iteración 2) — Describes a navigation action. Describes
 * ONLY, never executes.
 */

export function buildActionDescriptor(alert, navigation) {
  if (!alert || !navigation || navigation.navigable !== true) {
    return Object.freeze({
      action: null,
      target: null,
      reasons: ['not-navigable'],
    });
  }

  const target = Object.freeze({
    moduleId: alert.moduleId || alert.module || null,
    source: alert.source,
    resourceKey: alert.formId || alert.recordType || alert.documentType || alert.documentId || null,
    recordId: alert.recordId || null,
  });

  return Object.freeze({
    action: navigation.action,
    target,
    engine: navigation.target,
    label: navigation.label,
    reasons: [],
  });
}

export default buildActionDescriptor;
