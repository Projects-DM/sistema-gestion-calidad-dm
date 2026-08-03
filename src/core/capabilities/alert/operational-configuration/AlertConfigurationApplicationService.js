/**
 * AlertConfigurationApplicationService
 *
 * Sprint 201 — The ONLY orchestrator of the Alert Configuration
 * OPERATIONAL EXPERIENCE (admin UI).
 *
 * Sprint 201.R — Hardening. The application layer now depends ONLY on the
 * AlertConfigurationPersistencePort (contract), never on a concrete
 * infrastructure service. The resourceKind→backend selection lives in the
 * AlertConfigurationPersistenceAdapter.
 *
 * Responsibilities (orchestration ONLY, no business logic):
 *   1. LOAD   — reads the current configuration of a resource reference
 *               through the certified AlertConfigurationResolver (the ONLY
 *               authorized reader of resource metadata). Never reads storage
 *               keys.
 *   2. VALIDATE — runs AlertConfigurationValidation BEFORE persisting
 *               (negative periods, invalid priorities, incomplete configs,
 *               unknown units, incompatible policies).
 *   3. SAVE   — maps the draft to canonical metadata and delegates the WRITE
 *               through the PersistencePort (never to a concrete service).
 *
 * The Application Service NEVER:
 *   - imports infrastructure services (dynamic / document repositories),
 *   - knows the storage key (`alert_config` / `alertConfiguration`),
 *   - decides a resourceKind→backend mapping,
 *   - interacts with the Runtime, the Engine or the Consumption Layer,
 *   - computes due dates / risk / alerts.
 *
 * Orchestration ONLY. Never executes the Alert Capability.
 */

import { resolveResourceAlertConfiguration } from './AlertConfigurationResolver.js';
import { mapMetadataToFormState, mapFormStateToMetadata } from './AlertConfigurationMapper.js';
import { validateAlertConfiguration, validateAlertConfigurationForm } from './AlertConfigurationValidation.js';
import { hasAlertConfigurationPersistencePort } from './AlertConfigurationPersistencePort.js';

export const OPERATIONAL_EXPERIENCE_VERSION = 1;

export class AlertConfigurationApplicationService {
  /**
   * @param {Object} options
   * @param {Object} [options.resolver] Resolver (certified default used).
   * @param {Object} [options.persistence] PersistencePort (Port contract).
   */
  constructor({ resolver, persistence = null } = {}) {
    this.resolver = resolver || resolveResourceAlertConfiguration;
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
   * Loads the current configuration through the PORT (new Sprint 201.R
   * contract) while still producing the editable draft through the certified
   * Resolver. The port recognition is advisory — reads remain on the
   * Resolver.
   *
   * @param {Object} resource Raw resource metadata.
   * @returns {{ source: string, resourceId: string|null, configuration: Object, formState: Object, accepted: boolean, backend: string|null }}
   */
  loadConfiguration(resource) {
    const draft = this.load(resource);
    let acceptance = { accepted: false, backend: null };
    if (this.persistence && typeof this.persistence.loadConfiguration === 'function') {
      const res = this.persistence.loadConfiguration(resource) ?? {};
      acceptance = {
        accepted: res.accepted === true,
        backend: res.backend ?? null,
      };
    }
    return { ...draft, ...acceptance };
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
   * Saves a form draft as canonical metadata through the PersistencePort.
   *
   * Orchestration: validate draft → map → validate metadata → persist through
   * the PORT. Refuses to write when the draft is invalid.
   *
   * The UI passes a RESOURCE REFERENCE (not a resourceKind and not a concrete
   * service). The Port / Adapter resolves the storage backend internally.
   *
   * @param {Object} options
   * @param {Object} options.resource Resource reference (form / repository row).
   * @param {Object} options.formState Editable draft.
   * @param {Object} [options.persistence] Optional override port.
   * @returns {Promise<{ success: boolean, metadata: Object|null, errors: Object<string,string[]>|null, persisted: Object|null }>}
   */
  async saveConfiguration({ resource, formState, persistence } = {}) {
    const port = persistence || this.persistence;
    if (!hasAlertConfigurationPersistencePort(port)) {
      throw new Error(
        'AlertConfigurationApplicationService: se requiere un PersistencePort (loadConfiguration/saveConfiguration).',
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

    const persisted = await port.saveConfiguration(resource, metadata);

    return { success: true, metadata, errors: null, persisted };
  }

  /**
   * @deprecated Sprint 201 — backward compatibility surface. Persists through
   * the legacy `saveAlertConfiguration` port shape. Kept so the Sprint 201
   * certification (O5) and any legacy adapter continue to work; the operational
   * experience uses saveConfiguration (Sprint 201.R).
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