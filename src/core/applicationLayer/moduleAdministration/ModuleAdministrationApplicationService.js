/**
 * ModuleAdministrationApplicationService
 *
 * Single official boundary between the UI (React) and Core.
 * All module administration operations flow through this service.
 *
 * SSOT Principles:
 * - UI never knows about dynamicService, Supabase, or persistence
 * - Core never knows about React
 * - Validations → ApplicationResult(success=false)
 * - Unexpected errors → throw ApplicationError
 * - Both mechanisms NEVER coexist for the same error
 *
 * Transitional Notes:
 * - Read operations delegate to dynamicService (will migrate to repositories)
 * - Write operations use Supabase directly (encapsulated here)
 * - Capability operations delegate to CapabilityAssignmentService
 */

import { createApplicationResult, createApplicationFailure } from '../common/contracts/ApplicationResult.js';
import { ApplicationError, ApplicationErrorCode } from '../common/contracts/ApplicationError.js';
import { ModuleAdministrationOperation, ModuleAdministrationQuery, isWriteOperation, isReadOperation, isValidOperation } from './contracts/ModuleAdministrationOperation.js';
import { dynamicService } from '../../../services/dynamicService.js';
import { getSupabaseClient } from '../../../lib/supabase.js';

/**
 * Valid lifecycle state transitions.
 * Key = current state, Value = array of allowed target states.
 */
const VALID_STATE_TRANSITIONS = Object.freeze({
  draft: ['configurable'],
  configurable: ['operational', 'archived'],
  operational: ['deprecated'],
  deprecated: ['archived', 'configurable'],
  archived: ['draft'],
});

/**
 * Valid module lifecycle states.
 */
const MODULE_STATES = Object.freeze(['draft', 'configurable', 'operational', 'deprecated', 'archived']);

/**
 * ModuleAdministrationApplicationService
 *
 * @class
 */
export class ModuleAdministrationApplicationService {
  /**
   * @param {object} [deps]
   * @param {object} [deps.persistenceProvider] - CapabilityPersistenceProvider for capability operations
   */
  constructor({ persistenceProvider } = {}) {
    this.persistenceProvider = persistenceProvider || null;
  }

  /**
   * Execute a module administration operation.
   *
   * @param {object} request - ApplicationRequest (must include operation, optionally payload, target, actor)
   * @param {object} context - ApplicationContext (must include actorId, actorRole at minimum)
   * @returns {Promise<ApplicationResult>} Operation result
   * @throws {ApplicationError} For unexpected infrastructure/system errors
   */
  async execute(request, context) {
    // --- 1. Validate request contract ---
    if (!request) {
      throw new ApplicationError(
        ApplicationErrorCode.INVALID_REQUEST,
        'request is required',
        { field: 'request' }
      );
    }
    if (!request.operation) {
      throw new ApplicationError(
        ApplicationErrorCode.INVALID_REQUEST,
        'request.operation is required',
        { field: 'operation' }
      );
    }
    if (!context) {
      throw new ApplicationError(
        ApplicationErrorCode.INVALID_REQUEST,
        'context is required',
        { field: 'context' }
      );
    }
    if (!isValidOperation(request.operation)) {
      throw new ApplicationError(
        ApplicationErrorCode.UNKNOWN_OPERATION,
        `Unknown operation: ${request.operation}`,
        { operation: request.operation, validOperations: Object.values({ ...ModuleAdministrationOperation, ...ModuleAdministrationQuery }) }
      );
    }

    // --- 2. Authorization check ---
    const authResult = this._checkAuthorization(request, context);
    if (!authResult.success) {
      return authResult;
    }

    // --- 3. Route to handler ---
    try {
      switch (request.operation) {
        // Queries (read-only)
        case ModuleAdministrationQuery.GET_MODULES:
          return await this._handleGetModules(request, context);
        case ModuleAdministrationQuery.GET_MODULE:
          return await this._handleGetModule(request, context);
        case ModuleAdministrationQuery.GET_MODULE_CONFIGURATION:
          return await this._handleGetModuleConfiguration(request, context);

        // Write operations
        case ModuleAdministrationOperation.CREATE_MODULE:
          return await this._handleCreateModule(request, context);
        case ModuleAdministrationOperation.UPDATE_MODULE_METADATA:
          return await this._handleUpdateModuleMetadata(request, context);
        case ModuleAdministrationOperation.UPDATE_MODULE_VISUAL_CONFIG:
          return await this._handleUpdateModuleVisualConfig(request, context);
        case ModuleAdministrationOperation.ASSIGN_CAPABILITIES:
          return await this._handleAssignCapabilities(request, context);
        case ModuleAdministrationOperation.REMOVE_CAPABILITIES:
          return await this._handleRemoveCapabilities(request, context);
        case ModuleAdministrationOperation.CHANGE_MODULE_STATE:
          return await this._handleChangeModuleState(request, context);
        case ModuleAdministrationOperation.DELETE_MODULE:
          return await this._handleDeleteModule(request, context);

        default:
          throw new ApplicationError(
            ApplicationErrorCode.UNKNOWN_OPERATION,
            `No handler for operation: ${request.operation}`,
            { operation: request.operation }
          );
      }
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new ApplicationError(
        ApplicationErrorCode.INFRASTRUCTURE_ERROR,
        `Unexpected error during ${request.operation}`,
        { operation: request.operation, originalMessage: error.message },
        error
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Authorization
  // ---------------------------------------------------------------------------

  /**
   * Basic authorization check.
   * Write operations require admin role.
   * @private
   */
  _checkAuthorization(request, context) {
    if (isWriteOperation(request.operation)) {
      const role = context.actorRole || request.actor?.role;
      if (role && role !== 'admin' && role !== 'super_admin') {
        return createApplicationFailure({
          code: ApplicationErrorCode.UNAUTHORIZED,
          message: 'You do not have permission to perform this operation',
          metadata: { requiredRole: 'admin', currentRole: role },
        });
      }
    }
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Query Handlers
  // ---------------------------------------------------------------------------

  /**
   * GET_MODULES — Return list of all active modules.
   * @private
   */
  async _handleGetModules(request, context) {
    const modules = await dynamicService.getModules();
    return createApplicationResult({
      data: modules,
      correlationId: request.correlationId,
    });
  }

  /**
   * GET_MODULE — Return a single module by ID.
   * @private
   */
  async _handleGetModule(request, context) {
    const moduleId = request.target || request.payload?.moduleId;
    if (!moduleId) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'moduleId is required (provide via request.target or request.payload.moduleId)',
        metadata: { operation: request.operation },
      });
    }

    const module = await dynamicService.getModuleById({ moduleId });
    return createApplicationResult({
      data: module,
      correlationId: request.correlationId,
    });
  }

  /**
   * GET_MODULE_CONFIGURATION — Return module with its forms and fields.
   * @private
   */
  async _handleGetModuleConfiguration(request, context) {
    const moduleId = request.target || request.payload?.moduleId;
    if (!moduleId) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'moduleId is required (provide via request.target or request.payload.moduleId)',
        metadata: { operation: request.operation },
      });
    }

    const [module, forms] = await Promise.all([
      dynamicService.getModuleById({ moduleId }),
      dynamicService.getFormsByModule(moduleId),
    ]);

    // Fetch fields for each form in parallel
    const formsWithFields = await Promise.all(
      forms.map(async (form) => {
        const fields = await dynamicService.getFormFields(form.id);
        return { ...form, fields };
      })
    );

    return createApplicationResult({
      data: { ...module, forms: formsWithFields },
      correlationId: request.correlationId,
    });
  }

  // ---------------------------------------------------------------------------
  // Write Handlers
  // ---------------------------------------------------------------------------

  /**
   * CREATE_MODULE — Create a new module in Draft state.
   * @private
   */
  async _handleCreateModule(request, context) {
    const payload = request.payload || {};

    // Validation
    const validation = this._validateCreateModule(payload);
    if (!validation.success) {
      return validation;
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_modules')
      .insert({
        name: payload.name.trim(),
        slug: payload.slug.trim().toLowerCase(),
        description: payload.description || null,
        is_active: true,
        state: 'draft',
        icon: payload.icon || 'Layers',
        order_index: payload.order_index || 0,
        visible: payload.visible !== undefined ? payload.visible : true,
        created_by: context.actorId || null,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return createApplicationFailure({
          code: 'MODULE_ALREADY_EXISTS',
          message: `A module with slug "${payload.slug}" already exists`,
          data: { slug: payload.slug },
        });
      }
      throw new ApplicationError(
        ApplicationErrorCode.INFRASTRUCTURE_ERROR,
        'Failed to create module in database',
        { supabaseError: error.message, code: error.code },
        error
      );
    }

    return createApplicationResult({
      data,
      correlationId: request.correlationId,
    });
  }

  /**
   * UPDATE_MODULE_METADATA — Update module name, slug, description.
   * @private
   */
  async _handleUpdateModuleMetadata(request, context) {
    const moduleId = request.target || request.payload?.moduleId;
    const payload = request.payload || {};

    if (!moduleId) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'moduleId is required (provide via request.target or request.payload.moduleId)',
        metadata: { operation: request.operation },
      });
    }

    const validation = this._validateUpdateModuleMetadata(payload);
    if (!validation.success) {
      return validation;
    }

    const result = await dynamicService.updateModule({
      id: moduleId,
      name: payload.name,
      slug: payload.slug,
    });

    if (!result.success) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: result.error,
        metadata: { operation: request.operation, moduleId },
      });
    }

    // Update description if provided
    if (payload.description !== undefined) {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('sgc_modules')
        .update({ description: payload.description })
        .eq('id', moduleId);

      if (error) {
        throw new ApplicationError(
          ApplicationErrorCode.INFRASTRUCTURE_ERROR,
          'Failed to update module description',
          { supabaseError: error.message, moduleId },
          error
        );
      }
    }

    return createApplicationResult({
      data: result.updatedModule || { id: moduleId },
      correlationId: request.correlationId,
    });
  }

  /**
   * UPDATE_MODULE_VISUAL_CONFIG — Update icon, order_index, visible.
   * @private
   */
  async _handleUpdateModuleVisualConfig(request, context) {
    const moduleId = request.target || request.payload?.moduleId;
    const payload = request.payload || {};

    if (!moduleId) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'moduleId is required (provide via request.target or request.payload.moduleId)',
        metadata: { operation: request.operation },
      });
    }

    const validation = this._validateUpdateVisualConfig(payload);
    if (!validation.success) {
      return validation;
    }

    const updateFields = {};
    if (payload.icon !== undefined) updateFields.icon = payload.icon;
    if (payload.order_index !== undefined) updateFields.order_index = payload.order_index;
    if (payload.visible !== undefined) updateFields.visible = payload.visible;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_modules')
      .update(updateFields)
      .eq('id', moduleId)
      .select('*')
      .single();

    if (error) {
      throw new ApplicationError(
        ApplicationErrorCode.INFRASTRUCTURE_ERROR,
        'Failed to update module visual configuration',
        { supabaseError: error.message, moduleId },
        error
      );
    }

    return createApplicationResult({
      data,
      correlationId: request.correlationId,
    });
  }

  /**
   * ASSIGN_CAPABILITIES — Replace all capability assignments for a module.
   * Delegates to CapabilityAssignmentService via operational pipeline.
   * @private
   */
  async _handleAssignCapabilities(request, context) {
    const moduleId = request.target || request.payload?.moduleId;
    const payload = request.payload || {};

    if (!moduleId) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'moduleId is required (provide via request.target or request.payload.moduleId)',
        metadata: { operation: request.operation },
      });
    }

    if (!Array.isArray(payload.assignments)) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'payload.assignments must be an array',
        metadata: { operation: request.operation, moduleId },
      });
    }

    if (!this.persistenceProvider) {
      throw new ApplicationError(
        ApplicationErrorCode.INTERNAL_ERROR,
        'CapabilityAssignmentService is not available (persistenceProvider not injected)',
        { operation: request.operation, moduleId }
      );
    }

    const { CapabilityAssignmentService } = await import('../../../operationalLayer/capabilityAssignment/CapabilityAssignmentService.js');
    const capabilityService = new CapabilityAssignmentService({
      persistenceProvider: this.persistenceProvider,
    });

    const operationalResult = await capabilityService.replaceModuleCapabilityAssignments({
      moduleId,
      assignments: payload.assignments,
    });

    return createApplicationResult({
      data: operationalResult,
      correlationId: request.correlationId,
    });
  }

  /**
   * REMOVE_CAPABILITIES — Remove all capability assignments from a module.
   * Delegates to CapabilityAssignmentService with empty assignments.
   * @private
   */
  async _handleRemoveCapabilities(request, context) {
    const moduleId = request.target || request.payload?.moduleId;

    if (!moduleId) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'moduleId is required (provide via request.target or request.payload.moduleId)',
        metadata: { operation: request.operation },
      });
    }

    // Reuse assign with empty array
    return this._handleAssignCapabilities(
      { ...request, operation: ModuleAdministrationOperation.ASSIGN_CAPABILITIES, payload: { moduleId, assignments: [] } },
      context
    );
  }

  /**
   * CHANGE_MODULE_STATE — Transition module to a new lifecycle state.
   * @private
   */
  async _handleChangeModuleState(request, context) {
    const moduleId = request.target || request.payload?.moduleId;
    const payload = request.payload || {};
    const newState = payload.newState;

    if (!moduleId) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'moduleId is required (provide via request.target or request.payload.moduleId)',
        metadata: { operation: request.operation },
      });
    }

    if (!newState) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'payload.newState is required',
        metadata: { operation: request.operation, moduleId },
      });
    }

    if (!MODULE_STATES.includes(newState)) {
      return createApplicationFailure({
        code: 'INVALID_STATE',
        message: `Invalid state: "${newState}". Valid states: ${MODULE_STATES.join(', ')}`,
        metadata: { operation: request.operation, moduleId, validStates: MODULE_STATES },
      });
    }

    // Fetch current module to validate transition
    const currentModule = await dynamicService.getModuleById({ moduleId });
    const currentState = currentModule.state || 'draft';

    if (currentState === newState) {
      return createApplicationFailure({
        code: 'ALREADY_IN_STATE',
        message: `Module is already in state "${newState}"`,
        metadata: { operation: request.operation, moduleId, currentState },
      });
    }

    const allowedTransitions = VALID_STATE_TRANSITIONS[currentState];
    if (!allowedTransitions || !allowedTransitions.includes(newState)) {
      return createApplicationFailure({
        code: 'INVALID_STATE_TRANSITION',
        message: `Cannot transition from "${currentState}" to "${newState}". Allowed: ${(allowedTransitions || []).join(', ') || 'none'}`,
        metadata: { operation: request.operation, moduleId, currentState, newState, allowedTransitions: allowedTransitions || [] },
      });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_modules')
      .update({ state: newState })
      .eq('id', moduleId)
      .select('*')
      .single();

    if (error) {
      throw new ApplicationError(
        ApplicationErrorCode.INFRASTRUCTURE_ERROR,
        'Failed to update module state',
        { supabaseError: error.message, moduleId, currentState, newState },
        error
      );
    }

    return createApplicationResult({
      data,
      correlationId: request.correlationId,
    });
  }

  /**
   * DELETE_MODULE — Permanently delete a module (hard delete).
   * @private
   */
  async _handleDeleteModule(request, context) {
    const moduleId = request.target || request.payload?.moduleId;

    if (!moduleId) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'moduleId is required (provide via request.target or request.payload.moduleId)',
        metadata: { operation: request.operation },
      });
    }

    const supabase = getSupabaseClient();

    // Check module exists
    const { data: existing, error: fetchError } = await supabase
      .from('sgc_modules')
      .select('id, state')
      .eq('id', moduleId)
      .single();

    if (fetchError || !existing) {
      return createApplicationFailure({
        code: ApplicationErrorCode.ENTITY_NOT_FOUND,
        message: `Module with id "${moduleId}" not found`,
        metadata: { operation: request.operation, moduleId },
      });
    }

    // Business rule: cannot delete operational modules
    if (existing.state === 'operational') {
      return createApplicationFailure({
        code: 'MODULE_IN_USE',
        message: 'Cannot delete an operational module. Change state to deprecated first.',
        metadata: { operation: request.operation, moduleId, currentState: existing.state },
      });
    }

    const { error } = await supabase
      .from('sgc_modules')
      .delete()
      .eq('id', moduleId);

    if (error) {
      throw new ApplicationError(
        ApplicationErrorCode.INFRASTRUCTURE_ERROR,
        'Failed to delete module',
        { supabaseError: error.message, moduleId },
        error
      );
    }

    return createApplicationResult({
      data: { id: moduleId, deleted: true },
      correlationId: request.correlationId,
    });
  }

  // ---------------------------------------------------------------------------
  // Validation Helpers
  // ---------------------------------------------------------------------------

  /**
   * @private
   */
  _validateCreateModule(payload) {
    if (!payload.name || String(payload.name).trim().length < 3) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'Module name is required and must be at least 3 characters',
        metadata: { field: 'name', provided: payload.name },
      });
    }
    if (!payload.slug || String(payload.slug).trim().length === 0) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'Module slug is required',
        metadata: { field: 'slug', provided: payload.slug },
      });
    }
    if (!/^[a-z0-9-]+$/.test(String(payload.slug).trim().toLowerCase())) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'Module slug must contain only lowercase letters, numbers, and hyphens',
        metadata: { field: 'slug', provided: payload.slug },
      });
    }
    return { success: true };
  }

  /**
   * @private
   */
  _validateUpdateModuleMetadata(payload) {
    if (payload.name !== undefined && String(payload.name).trim().length < 3) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'Module name must be at least 3 characters',
        metadata: { field: 'name', provided: payload.name },
      });
    }
    if (payload.slug !== undefined) {
      if (String(payload.slug).trim().length === 0) {
        return createApplicationFailure({
          code: ApplicationErrorCode.VALIDATION_FAILED,
          message: 'Module slug cannot be empty',
          metadata: { field: 'slug', provided: payload.slug },
        });
      }
      if (!/^[a-z0-9-]+$/.test(String(payload.slug).trim().toLowerCase())) {
        return createApplicationFailure({
          code: ApplicationErrorCode.VALIDATION_FAILED,
          message: 'Module slug must contain only lowercase letters, numbers, and hyphens',
          metadata: { field: 'slug', provided: payload.slug },
        });
      }
    }
    return { success: true };
  }

  /**
   * @private
   */
  _validateUpdateVisualConfig(payload) {
    if (payload.order_index !== undefined && (typeof payload.order_index !== 'number' || payload.order_index < 0)) {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'order_index must be a non-negative number',
        metadata: { field: 'order_index', provided: payload.order_index },
      });
    }
    if (payload.visible !== undefined && typeof payload.visible !== 'boolean') {
      return createApplicationFailure({
        code: ApplicationErrorCode.VALIDATION_FAILED,
        message: 'visible must be a boolean',
        metadata: { field: 'visible', provided: payload.visible },
      });
    }
    return { success: true };
  }
}
