/**
 * AlertCapabilityRendererContract
 *
 * Sprint 174 — Declares the dynamic rendering contract of the
 * Alert Capability.
 *
 * Rendering declaration ONLY. Renders no UI, executes no alerts.
 */

export const ALERT_RENDERER_VERSION = '1';

export const AlertCapabilityRendererContract = Object.freeze({
  contractKey: 'alert.renderer',
  name: 'Alert Capability Renderer Contract',
  version: ALERT_RENDERER_VERSION,
  capabilityKey: 'alerts',
  renderMode: 'dynamic',
  supportedTargets: Object.freeze(['forms', 'records', 'documents']),
  executionEnabled: false,
  representation: Object.freeze({
    rendererIdentity: Object.freeze({ type: 'string', required: true, description: 'Renderer contract identity' }),
    capabilityReference: Object.freeze({ type: 'string', required: true, description: 'Capability key reference' }),
    moduleReference: Object.freeze({ type: 'string', required: true, description: 'Assigning module reference' }),
    renderTarget: Object.freeze({ type: 'string', required: true, description: 'forms | records | documents' }),
  }),
});

export default AlertCapabilityRendererContract;
