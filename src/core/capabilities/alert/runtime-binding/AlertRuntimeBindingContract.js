/**
 * AlertRuntimeBindingContract
 *
 * Sprint 178 — Declares how the Alert Capability can enter the
 * existing Runtime.
 *
 * Binding declaration ONLY. Never evaluates alerts, processes rules
 * or generates events.
 */

export const RUNTIME_BINDING_VERSION = '1';

export const AlertRuntimeBindingContract = Object.freeze({
  contractKey: 'alert.runtime-binding',
  name: 'Alert Runtime Binding Contract',
  version: RUNTIME_BINDING_VERSION,
  capabilityKey: 'alerts',
  runtimeMode: 'controlled',
  supportedContexts: Object.freeze([
    'dynamicForms',
    'dynamicRecords',
    'documentRepository',
  ]),
  executionEnabled: false,
  representation: Object.freeze({
    bindingIdentity: Object.freeze({ type: 'string', required: true, description: 'Binding contract identity' }),
    capabilityReference: Object.freeze({ type: 'string', required: true, description: 'Capability key reference' }),
    moduleReference: Object.freeze({ type: 'string', required: true, description: 'Module runtime reference' }),
    runtimeContext: Object.freeze({ type: 'string', required: true, description: 'Target runtime context' }),
  }),
});

export default AlertRuntimeBindingContract;
