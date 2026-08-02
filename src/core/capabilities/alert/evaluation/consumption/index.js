/**
 * Alert Consumption Layer
 *
 * Sprint 200 — The official evaluation→consumption adapter boundary.
 *
 * Input is ALWAYS the single contract { descriptor, evaluation }. Output is
 * the Consumption DTO (Dashboard, Workspace, Forms, Records, Repository).
 *
 * Layer ONLY. Never executes, never computes time, never recalcules.
 */

export { AlertConsumptionContract, CONSUMPTION_KEYS, CONSUMER_FIELDS, ALERT_CONSUMPTION_VERSION } from './AlertConsumptionContract.js';
export {
  buildConsumptionEntry,
  mapEvaluationToConsumption,
  mapEvaluationsToDashboardMetrics,
  mapEvaluationToWorkspaceCard,
  resolveConsumptionVisual,
  CONSUMPTION_VISUALS,
} from './AlertConsumptionMapper.js';
