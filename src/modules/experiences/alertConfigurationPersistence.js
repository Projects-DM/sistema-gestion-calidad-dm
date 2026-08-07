/**
 * AlertConfigurationPersistence
 *
 * Sprint 201 — Persistence PORT adapters for the Alert Configuration
 * operational experience. Each adapter reuses an EXISTING service to write
 * the canonical metadata into the RESOURCE row as `alert_config`.
 *
 * These are transport-only adapters: they receive the ALREADY-validated
 * canonical metadata from the Application Service and delegate the write.
 * They never compute, never evaluate and never touch the Runtime / Engine.
 *
 * The repository mapping (Sprint 197) reads `alert_config` back as
 * `alertConfiguration` — the write here closes that loop.
 *
 * Sprint 242 — LEGACY SINGLE-WRITE SURFACE (compatibility ONLY, never UI).
 * These adapters persist ONE canonical metadata directly into `alert_config`
 * WITHOUT the `{ alertConfigurations: [...] }` envelope and, if used against a
 * resource that already holds a collection, REPLACES it. The ONLY authorized
 * write path is the official adapter (`AlertConfigurationPersistenceAdapter.js`)
 * through `saveCollection`. These adapters are retained solely so the legacy
 * `AlertConfigurationApplicationService.save` and past certifications keep
 * resolving; the UI must never forward them.
 */

import { dynamicService } from '../../services/dynamicService.js';
import { documentRepositoriesService } from '../../services/documentRepositoriesService.js';

/**
 * Persistence port for dynamic FORMS.
 * Writes the canonical metadata into the `sgc_forms.alert_config` column.
 */
export const formAlertConfigurationPersistence = Object.freeze({
  async saveAlertConfiguration({ resourceKind, resourceId, metadata }) {
    if (resourceKind !== 'dynamicForms') {
      throw new Error('formAlertConfigurationPersistence: solo aplica a dynamicForms.');
    }
    const updated = await dynamicService.updateForm(resourceId, { alert_config: metadata });
    return { resourceKind, resourceId, row: updated };
  },
});

/**
 * Persistence port for document REPOSITORIES.
 * Writes the canonical metadata into the `sgc_document_repositories.alert_config` column.
 */
export const repositoryAlertConfigurationPersistence = Object.freeze({
  async saveAlertConfiguration({ resourceKind, resourceId, metadata }) {
    if (resourceKind !== 'documentRepository') {
      throw new Error('repositoryAlertConfigurationPersistence: solo aplica a documentRepository.');
    }
    const updated = await documentRepositoriesService.updateRepository(resourceId, {
      alert_config: metadata,
    });
    return { resourceKind, resourceId, row: updated };
  },
});

export default formAlertConfigurationPersistence;
