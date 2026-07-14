/**
 * ModuleChangeBus
 *
 * Sprint 67D — Lightweight event bus for module publication synchronization.
 *
 * Provides a decoupled notification mechanism so that module mutations
 * (CREATE, UPDATE, DELETE, STATE_CHANGE, VISIBILITY_CHANGE) in any admin
 * component automatically trigger a re-fetch in Sidebar and Dashboard
 * without tight coupling.
 *
 * Pattern: CustomEvent on window
 * - Producers: ModuleManager, CreateModuleWizard, ModuleEditPanel
 * - Consumers: DashboardLayout, Dashboard
 *
 * Events dispatched:
 *   'sgc-modules-changed' — detail: { type: string }
 *
 * Types: 'create' | 'update' | 'delete' | 'state-change' | 'visibility-change'
 */

const EVENT_NAME = 'sgc-modules-changed';

/**
 * Dispatch a module change notification.
 * Safe to call from any context (even outside React).
 *
 * @param {string} type — One of: 'create', 'update', 'delete', 'state-change', 'visibility-change'
 */
export function dispatchModuleChange(type = 'update') {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { type } }));
}

/**
 * Listen for module change notifications.
 * Returns an unsubscribe function.
 *
 * @param {function} handler — Called with { type } when modules change
 * @returns {function} Unsubscribe function
 */
export function onModuleChange(handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
