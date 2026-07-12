/**
 * CapabilityCatalogRepository (Contract)
 *
 * Pure interface-like contract.
 * No Supabase/Runtime dependencies.
 */

export const CapabilityCatalogRepository = {
  /**
   * @param {object} params
   * @param {string} params.catalogId
   */
  async getById(_params) {
    throw new Error('CapabilityCatalogRepository.getById not implemented');
  },

  /**
   * @param {object} params
   * @param {string} params.domain
   */
  async listByDomain(_params) {
    throw new Error('CapabilityCatalogRepository.listByDomain not implemented');
  },

  async listAll() {
    throw new Error('CapabilityCatalogRepository.listAll not implemented');
  },
};

