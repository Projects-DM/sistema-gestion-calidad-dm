/**
 * AlertConfigurationPersistenceAdapter
 *
 * Sprint 201.R — The SINGLE, OFFICIAL implementation of the
 * AlertConfigurationPersistencePort for the Alert Configuration OPERATIONAL
 * EXPERIENCE.
 *
 * Layer: Infrastructure. This Adapter is the ONLY component allowed to:
 *   - know `dynamicService` / `documentRepositoriesService`,
 *   - decide how a resourceReference maps to a storage backend,
 *   - hold the storage keys (`alert_config`).
 *
 * It implements the Port contract (loadConfiguration / saveConfiguration).
 * The resource→backend resolution is delegated to a REGISTRY of capability
 * handlers (open/closed): adding a new configurable resource (Equipos,
 * Activos, Procesos, ...) means registering a handler HERE, with NO change to
 * the UI, the Panel, the Form or the ApplicationService.
 *
 * The Adapter NEVER:
 *   - contains business / evaluation logic,
 *   - imports the Resolver, the Engine or the ApplicationService,
 *   - is referenced by the UI (the UI only sees the ApplicationService).
 *
 * Adaptation ONLY. Never executes.
 */

import { dynamicService } from '../../services/dynamicService.js';
import { documentRepositoriesService } from '../../services/documentRepositoriesService.js';

/**
 * Structural discriminators used to recognize the backend owning a
 * reference. These are NOT `resource.type === "form"` strings — they are the
 * Adapter's internal capability detection, encapsulated and open/closed.
 */
const hasModuleId = (ref) =>
  !!ref && typeof ref === 'object' && ref.module_id !== undefined;
const hasRepositorySignature = (ref) =>
  !!ref &&
  typeof ref === 'object' &&
  ref.module_slug !== undefined &&
  ref.module_id === undefined;

/**
 * Capability handler: knows how to recognize + write its own backend.
 */
const makeHandler = (config) =>
  Object.freeze({
    key: config.key,
    canAccept: config.canAccept,
    async write(reference, configuration) {
      const id = reference.id ?? null;
      return config.write(id, configuration);
    },
  });

const FORM_HANDLER = makeHandler({
  key: 'forms',
  canAccept: hasModuleId,
write: (id, configuration) =>
    dynamicService.updateForm(id, { alert_config: configuration }),
});

const REPOSITORY_HANDLER = makeHandler({
  key: 'repository',
  canAccept: hasRepositorySignature,
  write: (id, configuration) =>
    documentRepositoriesService.updateRepository(id, { alert_config: configuration }),
});

/**
 * Registry, first-match-wins. Open/Closed: new resources → new handler here.
 */
const HANDLERS = Object.freeze([FORM_HANDLER, REPOSITORY_HANDLER]);

/**
 * Resolves the handler owning a resource reference. Only the Adapter may
 * call this. Returns null when no registered backend accepts the reference.
 */
export function resolveResourceHandler(reference) {
  if (!reference || typeof reference !== 'object') return null;
  for (const handler of HANDLERS) {
    if (handler.canAccept(reference)) return handler;
  }
  return null;
}

/**
 * AlertConfigurationPersistenceAdapter — singleton implementation of the
 * PersistencePort; the ONLY authorized consumer of infrastructure services.
 */
export const alertConfigurationPersistence = Object.freeze({
/**
   * Port operation — resolves a reference to its backend and reports whether
   * any registered backend owns it.
   *
   * Reads of the CURRENT config remain the AlertConfigurationResolver's sole
   * responsibility at the Application layer; the Adapter only recognizes and
   * routes a resource.
   *
   * @param {Object|string} resourceReference Reference object or id/slug.
   * @returns {Object} { accepted: boolean, reference, backend: string|null }
   */
  loadConfiguration(resourceReference) {
    const reference =
      resourceReference && typeof resourceReference === 'object'
        ? { ...resourceReference }
        : { id: resourceReference };
    const handler = resolveResourceHandler(reference);
    return Object.freeze({
      accepted: !!handler,
      backend: handler ? handler.key : null,
      reference: Object.freeze(reference),
    });
  },

  /**
   * Port operation — persists the CANONICAL configuration COLLECTION for a
   * resource. Resolves the backend exclusively, writes the field, returns the
   * copy.
   *
   * Hardening (Sprint 242): the official write path ONLY accepts the enveloped
   * collection `{ alertConfigurations: [...] }`. A bare canonical metadata
   * (legacy single save) is REJECTED here so no caller can clobber an existing
   * collection with a single alert.
   */
  async saveConfiguration(resourceReference, configuration) {
    const reference =
      resourceReference && typeof resourceReference === 'object'
        ? { ...resourceReference }
        : { id: resourceReference };
    if (!reference || (!reference.id && reference.id !== 0)) {
      throw new Error(
        'AlertConfigurationPersistenceAdapter: resourceId es obligatorio y debe ser válido.',
      );
    }
    if (!configuration || !Array.isArray(configuration.alertConfigurations)) {
      throw new Error(
        'AlertConfigurationPersistenceAdapter: el Write Path oficial exige el envelope ' +
          '{ alertConfigurations: [...] } (use saveCollection). Un write single no puede ' +
          'sobrescribir la colección existente.',
      );
    }
    const handler = resolveResourceHandler(reference);
    if (!handler) {
      throw new Error(
        'AlertConfigurationPersistenceAdapter: no hay backend configurado para el recurso.',
      );
    }
    const row = await handler.write(reference, configuration);
    if (!row || typeof row !== 'object') {
      throw new Error(
        'AlertConfigurationPersistenceAdapter: el recurso de destino no existe o 0 filas fueron actualizadas.',
      );
    }
    return Object.freeze({
      reference: Object.freeze(reference),
      configuration,
      backend: handler.key,
      row,
    });
  },
});

export const ALERT_CONFIGURATION_PERSISTENCE_ADAPTER = Object.freeze({
  key: 'alert-configuration-persistence-adapter',
  instance: alertConfigurationPersistence,
});

export default alertConfigurationPersistence;