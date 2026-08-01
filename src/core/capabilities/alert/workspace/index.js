/**
 * Alert Operational Workspace
 *
 * Sprint 181 (iteración 2) — Alert Monitoring as an Operational
 * Workspace: shows active alerts, their context, and navigates to the
 * existing resource. Never administers data, never executes rules,
 * never owns a CRUD.
 */

import { AlertWorkspaceContract, WORKSPACE_VERSION } from './AlertWorkspaceContract.js';
import { resolveAlertWorkspace } from './AlertWorkspaceResolver.js';
import { resolveAlertNavigation, NAVIGATION_TARGETS } from './AlertNavigationResolver.js';
import { buildActionDescriptor } from './AlertWorkspaceActionDescriptor.js';
import { buildAlertWorkspaceCard } from './AlertWorkspaceBuilder.js';
import { buildOperationalGrouping } from './AlertOperationalGrouping.js';
import { WORKSPACE_BOUNDARY } from './WorkspaceBoundary.js';

export { AlertWorkspaceContract, WORKSPACE_VERSION } from './AlertWorkspaceContract.js';
export { resolveAlertWorkspace } from './AlertWorkspaceResolver.js';
export { resolveAlertNavigation, NAVIGATION_TARGETS } from './AlertNavigationResolver.js';
export { buildActionDescriptor } from './AlertWorkspaceActionDescriptor.js';
export { buildAlertWorkspaceCard } from './AlertWorkspaceBuilder.js';
export { buildOperationalGrouping } from './AlertOperationalGrouping.js';
export { WORKSPACE_BOUNDARY } from './WorkspaceBoundary.js';

export function requestWorkspace(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      workspace: null,
      executionEnabled: false,
      executionBlocked: false,
      reasons: ['missing-workspace-context'],
    });
  }

  if (request.capability !== 'alerts' && request.capabilityKey !== 'alerts') {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      workspace: null,
      module: request.moduleId || request.module || null,
      executionEnabled: false,
      executionBlocked: request.executionRequested === true,
      reasons: ['capability-not-assigned'],
    });
  }

  if (request.moduleAssigned === false) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      workspace: null,
      module: request.moduleId || request.module || null,
      executionEnabled: false,
      executionBlocked: request.executionRequested === true,
      blocked: request.executionRequested === true,
      reasons: ['capability-not-assigned'],
    });
  }

  const executionRequested = request.executionRequested === true || request.execute === true;
  const resolution = resolveAlertWorkspace(request);

  if (!resolution.resolved) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      workspace: null,
      module: request.moduleId || request.module || null,
      executionEnabled: false,
      executionBlocked: executionRequested,
      blocked: executionRequested,
      reasons: resolution.reasons,
    });
  }

  const workspace = Object.freeze({
    workspaceType: AlertWorkspaceContract.workspaceType,
    navigationEnabled: AlertWorkspaceContract.navigationEnabled,
    moduleId: resolution.moduleId,
    empty: resolution.empty,
    alerts: resolution.alerts,
    cards: resolution.cards,
    groups: resolution.groups,
    summary: Object.freeze({
      total: resolution.cards.length,
      critical: resolution.cards.filter((c) => c.priority === 'critical').length,
      high: resolution.cards.filter((c) => c.priority === 'high').length,
      medium: resolution.cards.filter((c) => c.priority === 'medium').length,
      low: resolution.cards.filter((c) => c.priority === 'low').length,
      forms: resolution.cards.filter((c) => c.source === 'dynamicForms').length,
      records: resolution.cards.filter((c) => c.source === 'dynamicRecords').length,
      documents: resolution.cards.filter((c) => c.source === 'documentRepository').length,
    }),
  });

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: executionRequested ? 'rejected' : 'ready',
    workspace,
    executionEnabled: false,
    executionBlocked: executionRequested,
    blocked: executionRequested,
    reasons: executionRequested ? ['execution-not-allowed'] : [],
    boundary: WORKSPACE_BOUNDARY,
    contract: AlertWorkspaceContract,
  });
}

export const ALERT_WORKSPACE = Object.freeze({
  key: 'workspace',
  name: 'Alert Operational Workspace',
  execution: false,
});

export default ALERT_WORKSPACE;
