const flowRegistry = new Map();

export function registerBusinessFlow(flowContract) {
  if (!flowContract?.flowKey) {
    throw new Error('OperationalBusinessFlowRegistry: flowKey is required');
  }
  flowRegistry.set(flowContract.flowKey, Object.freeze({
    flowKey: flowContract.flowKey,
    description: flowContract.description ?? '',
    triggerEvent: flowContract.triggerEvent,
    steps: flowContract.steps ?? [],
  }));
}

export function getFlow(flowKey) {
  return flowRegistry.get(flowKey) ?? null;
}

export function getFlowsByTriggerEvent(eventType) {
  return Array.from(flowRegistry.values()).filter(f => f.triggerEvent === eventType);
}

export function listFlows() {
  return Array.from(flowRegistry.values());
}

export const OperationalBusinessFlowRegistry = {
  registerBusinessFlow,
  getFlow,
  getFlowsByTriggerEvent,
  listFlows,
};
