/**
 * Alert Operational Workspace
 *
 * Sprint 182 — Alert Monitoring as an Operational Workspace: shows
 * active alerts, their context, and navigates to the existing
 * resource. Never administers data, never executes rules, never
 * owns a CRUD.
 */

import { AlertWorkspaceContract, WORKSPACE_VERSION } from './AlertWorkspaceContract.js';
import { resolveAlertWorkspace } from './AlertWorkspaceResolver.js';
import { resolveAlertNavigation, NAVIGATION_SPECS } from './AlertNavigationResolver.js';
import { buildActionDescriptor } from './AlertWorkspaceActionDescriptor.js';
import { buildAlertWorkspaceCard } from './AlertWorkspaceBuilder.js';
import { buildAlertWorkspaceViewModel } from './AlertWorkspaceViewModel.js';
import { applyAlertGroupingPolicy, groupAlertsByPriority, groupAlertsBySource } from './AlertGroupingPolicy.js';
import { WORKSPACE_BOUNDARY } from './WorkspaceBoundary.js';

export { AlertWorkspaceContract, WORKSPACE_VERSION } from './AlertWorkspaceContract.js';
export { resolveAlertWorkspace } from './AlertWorkspaceResolver.js';
export { resolveAlertNavigation, NAVIGATION_SPECS } from './AlertNavigationResolver.js';
export { buildActionDescriptor } from './AlertWorkspaceActionDescriptor.js';
export { buildAlertWorkspaceCard } from './AlertWorkspaceBuilder.js';
export { buildAlertWorkspaceViewModel } from './AlertWorkspaceViewModel.js';
export { applyAlertGroupingPolicy, groupAlertsByPriority, groupAlertsBySource } from './AlertGroupingPolicy.js';
export { WORKSPACE_BOUNDARY } from './WorkspaceBoundary.js';

export function requestWorkspace(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      viewModel: null,
      executionEnabled: false,
      executionBlocked: false,
      reasons: ['missing-workspace-context'],
    });
  }

  if (request.capability !== 'alerts' && request.capabilityKey !== 'alerts') {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      viewModel: null,
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
      viewModel: null,
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
      viewModel: null,
      module: request.moduleId || request.module || null,
      executionEnabled: false,
      executionBlocked: executionRequested,
      blocked: executionRequested,
      reasons: resolution.reasons,
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: executionRequested ? 'rejected' : 'ready',
    workspace: resolution.viewModel,
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
