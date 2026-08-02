/**
 * AlertConfigurationApplicationService
 *
 * Sprint 201 — The ONLY orchestrator of the Alert Configuration
 * OPERATIONAL EXPERIENCE (admin UI).
 *
 * Responsibilities (orchestration ONLY, no business logic):
 *   1. LOAD   — reads the current configuration of a resource through the
 *               certified AlertConfigurationResolver (the ONLY authorized
 *               reader of resource metadata). Never reads storage keys.
 *   2. VALIDATE — runs AlertConfigurationValidation over the editable draft
 *               BEFORE persisting (negative periods, invalid priorities,
 *               incomplete configs, unknown units, incompatible policies).
 *   3. SAVE   — maps the draft to canonical metadata and delegates the WRITE
 *               to an injected persistence adapter (never Supabase directly).
 *
 * The Application Service NEVER:
 *   - interacts with the Runtime, the Engine or the Consumption Layer,
 *   - computes due dates / risk / alerts,
 *   - knows the storage key (`alert_config` / `alertConfiguration`),
 *   - decides whether the resource produces alerts.
 *
 * The `persistence` port is a plain adapter: `{ saveAlertConfiguration({ resourceKind, resourceId, metadata }) }`.
 * It is injected so the UI can reuse the existing services (dynamicService /
 * documentRepositoriesService) and the certification can use a mock.
 *
 * Orchestration ONLY. Never executes the Alert Capability.
 */

import { resolveResourceAlertConfiguration } from './AlertConfigurationResolver.js';
import { mapMetadataToFormState, mapFormStateToMetadata } from './AlertConfigurationMapper.js';
import { validateAlertConfiguration, validateAlertConfigurationForm } from './AlertConfigurationValidation.js';

export const OPERATIONAL_EXPERIENCE_VERSION = 1;

export class AlertConfigurationApplicationService {
  /**
   * @param {Object} options
   * @param {Object} [options.resolver] Resolver (certified default used).
   * @param {Object} [options.persistence] Persistence adapter port.
   */
  constructor({ resolver = resolveResourceAlertConfiguration, persistence = null } = {}) {
    this.resolver = resolver;
    this.persistence = persistence;
  }

  /**
   * Loads the CURRENT configuration of a resource as an editable draft.
   *
   * @param {Object} resource Form or Repository resource metadata.
   * @returns {{ source: string, resourceId: string|null, configuration: Object, formState: Object }}
   */
  load(resource) {
    const resolution = this.resolver(resource);
    return {
      source: resolution.source,
      resourceId: resolution.resourceId,
      configuration: resolution.configuration,
      formState: mapMetadataToFormState(resolution.configuration),
    };
  }

  /**
   * Validates an editable draft (field-level feedback for the UI).
   *
   * @param {Object} formState Editable draft.
   * @returns {{ valid: boolean, errors: Object<string,string[]> }}
   */
  validateForm(formState) {
    return validateAlertConfigurationForm(formState);
  }

  /**
   * Validates a canonical metadata object right before persisting.
   *
   * @param {Object} metadata Canonical metadata.
   * @returns {{ valid: boolean, errors: Object<string,string[]> }}
   */
  validateMetadata(metadata) {
    return validateAlertConfiguration(metadata);
  }

  /**
   * Saves the editable draft as canonical metadata via the persistence port.
   *
   * Orchestration: validate draft → map → validate metadata → persist.
   * Refuses to write when the draft is invalid.
   *
   * @param {Object} options
   * @param {string} options.resourceKind 'dynamicForms' | 'documentRepository'.
   * @param {string|number} options.resourceId Resource id.
   * @param {Object} options.formState Editable draft.
   * @param {Object} [options.persistence] Optional override persistence port.
   * @returns {Promise<{ success: boolean, metadata: Object|null, errors: Object<string,string[]>|null, persisted: Object|null }>}
   */
  async save({ resourceKind, resourceId, formState, persistence } = {}) {
    const port = persistence || this.persistence;
    if (!port || typeof port.saveAlertConfiguration !== 'function') {
      throw new Error(
        'AlertConfigurationApplicationService: se requiere un puerto de persistencia (saveAlertConfiguration).',
      );
    }

    const formValidation = validateAlertConfigurationForm(formState);
    if (!formValidation.valid) {
      return { success: false, metadata: null, errors: formValidation.errors, persisted: null };
    }

    const metadata = mapFormStateToMetadata(formState);

    const metadataValidation = validateAlertConfiguration(metadata);
    if (!metadataValidation.valid) {
      return { success: false, metadata: null, errors: metadataValidation.errors, persisted: null };
    }

    const persisted = await port.saveAlertConfiguration({
      resourceKind,
      resourceId,
      metadata,
    });

    return { success: true, metadata, errors: null, persisted };
  }
}

export default AlertConfigurationApplicationService;
