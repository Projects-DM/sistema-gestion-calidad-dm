import { OperationalEventBus } from './OperationalEventBus.js';
import { getFlowsByTriggerEvent } from './OperationalBusinessFlowRegistry.js';
import { OperationalAuditService } from '../../../services/operationalAuditService.js';

export class OperationalFlowOrchestrator {
  constructor() {
    this._unsubscribers = [];
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return;
    this._unsubscribers.push(
      OperationalEventBus.subscribe('*', this._onAnyEvent.bind(this))
    );
    this._initialized = true;
  }

  _onAnyEvent(payload) {
    const flows = getFlowsByTriggerEvent(payload.eventType);
    if (!flows?.length) return;
    for (const flow of flows) {
      this._executeFlow(flow, payload);
    }
  }

  async _executeFlow(flow, triggerPayload) {
    for (const step of flow.steps) {
      if (step.consume !== triggerPayload.eventType) continue;
      const eventPayload = {
        eventType: step.publish,
        sourceExperience: triggerPayload.experienceKey,
        recordId: triggerPayload.recordId,
        flowKey: flow.flowKey,
        step: step.publish,
        timestamp: new Date().toISOString(),
      };
      OperationalEventBus.publish(step.publish, eventPayload);
      OperationalAuditService.auditFlowStep({
        experienceKey: triggerPayload.experienceKey,
        flowKey: flow.flowKey,
        step: step.publish,
        eventData: eventPayload,
      });
    }
  }

  destroy() {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    this._initialized = false;
  }
}

let _instance = null;
export function getFlowOrchestrator() {
  if (!_instance) {
    _instance = new OperationalFlowOrchestrator();
    _instance.initialize();
  }
  return _instance;
}
