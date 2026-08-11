import { getSupabaseClient } from '../lib/supabase.js';

/**
 * Abstracción preparada para reemplazar el backend.
 * Implementación actual: Supabase.
 */

function getClientOrThrow() {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase no está configurado (.env).');
  return sb;
}

const mapRepositoryRow = (row) => {
  if (!row) return null;
  const mapped = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    module_slug: row.module_slug,
    icon_key: row.icon_key,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  // Sprint 197 — Alert Configuration metadata support.
  // The column may not exist yet; pass through only when present.
  if (row.alert_config !== undefined || row.alertConfiguration !== undefined) {
    mapped.alertConfiguration = row.alert_config ?? row.alertConfiguration ?? null;
  }
  return mapped;
};

const mapCategoryRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    repository_id: row.repository_id,
    category_key: row.category_key,
    name: row.name,
    description: row.description,
    icon_key: row.icon_key,
    sort_order: row.sort_order,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const documentRepositoriesService = {
  // =====================
  // Repositories
  // =====================
  async getRepositories({ moduleSlug } = {}) {
    const sb = getClientOrThrow();
    let query = sb
      .from('sgc_document_repositories')
      .select('*');

    if (moduleSlug) {
      query = query.eq('module_slug', moduleSlug);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRepositoryRow);
  },

  async getRepositoryById(repositoryId) {
    const sb = getClientOrThrow();
    const { data, error } = await sb
      .from('sgc_document_repositories')
      .select('*')
      .eq('id', repositoryId)
      .maybeSingle();

    if (error) throw error;
    return mapRepositoryRow(data);
  },

  async createRepository(payload) {
    const sb = getClientOrThrow();

    const repoPayload = {
      slug: payload.slug,
      name: payload.name,
      description: payload.description,
      module_slug: payload.module_slug,
      icon_key: payload.icon_key,
      is_active: payload.is_active ?? true,
    };

    const { data, error } = await sb
      .from('sgc_document_repositories')
      .insert(repoPayload)
      .select('*')
      .single();

    if (error) throw error;
    return mapRepositoryRow(data);
  },

  async updateRepository(repositoryId, payload) {
    if (!repositoryId) throw new Error('documentRepositoriesService.updateRepository: repositoryId is required');
    const sb = getClientOrThrow();

    const updatePayload = {
      slug: payload.slug,
      name: payload.name,
      description: payload.description,
      module_slug: payload.module_slug,
      icon_key: payload.icon_key,
      is_active: payload.is_active,
    };

    // Sprint 201 — Alert Configuration metadata passthrough.
    // The column may not exist yet; write only when explicitly provided.
    if (payload.alert_config !== undefined || payload.alertConfiguration !== undefined) {
      updatePayload.alert_config = payload.alert_config ?? payload.alertConfiguration;
    }

    const { data, error } = await sb
      .from('sgc_document_repositories')
      .update(updatePayload)
      .eq('id', repositoryId)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Document repository with ID "${repositoryId}" not found or update failed.`);
    return mapRepositoryRow(data);
  },

  async deleteRepository(repositoryId) {
    const sb = getClientOrThrow();

    const { error } = await sb
      .from('sgc_document_repositories')
      .delete()
      .eq('id', repositoryId);

    if (error) throw error;
    return true;
  },

  // =====================
  // Categories
  // =====================
  async getCategories(repositoryId) {
    const sb = getClientOrThrow();

    const { data, error } = await sb
      .from('sgc_document_repository_categories')
      .select('*')
      .eq('repository_id', repositoryId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapCategoryRow);
  },

  async getCategoryById(categoryId) {
    const sb = getClientOrThrow();

    const { data, error } = await sb
      .from('sgc_document_repository_categories')
      .select('*')
      .eq('id', categoryId)
      .maybeSingle();

    if (error) throw error;
    return mapCategoryRow(data);
  },

  async createCategory(repositoryId, payload) {
    const sb = getClientOrThrow();

    const categoryPayload = {
      repository_id: repositoryId,
      category_key: payload.category_key,
      name: payload.name,
      description: payload.description,
      icon_key: payload.icon_key,
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
    };

    const { data, error } = await sb
      .from('sgc_document_repository_categories')
      .insert(categoryPayload)
      .select('*')
      .single();

    if (error) throw error;
    return mapCategoryRow(data);
  },

  async updateCategory(categoryId, payload) {
    const sb = getClientOrThrow();

    const updatePayload = {
      category_key: payload.category_key,
      name: payload.name,
      description: payload.description,
      icon_key: payload.icon_key,
      sort_order: payload.sort_order,
      is_active: payload.is_active,
    };

    const { data, error } = await sb
      .from('sgc_document_repository_categories')
      .update(updatePayload)
      .eq('id', categoryId)
      .select('*')
      .single();

    if (error) throw error;
    return mapCategoryRow(data);
  },

  async deleteCategory(categoryId) {
    const sb = getClientOrThrow();

    const { error } = await sb
      .from('sgc_document_repository_categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;
    return true;
  },

  async reorderCategories({ repositoryId, orderedCategoryIds }) {
    // orderedCategoryIds: lista de category_id en el nuevo orden.
    // Actualiza sort_order 1..N siguiendo el orden entregado.
    const sb = getClientOrThrow();

    if (!Array.isArray(orderedCategoryIds)) {
      throw new Error('orderedCategoryIds debe ser un arreglo');
    }

    // Actualización en lote: se ejecuta en paralelo limitado por tamaño (sin implementar batching complejo).
    const updates = orderedCategoryIds.map((id, idx) => {
      const sort_order = idx;
      return sb
        .from('sgc_document_repository_categories')
        .update({ sort_order })
        .eq('id', id)
        .eq('repository_id', repositoryId);
    });

    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);
    if (firstError?.error) throw firstError.error;

    return true;
  },
};

