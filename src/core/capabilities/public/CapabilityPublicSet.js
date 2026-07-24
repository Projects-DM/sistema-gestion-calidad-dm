/**
 * CapabilityPublicSet
 *
 * The official public contract exposed by the Capability resolution layer
 * to the Runtime (DynamicModule).
 *
 * This is the ONLY artifact that DynamicModule is permitted to read.
 * DynamicModule never reads from services, persistence, or the resolver directly.
 *
 * Responsibilities:
 * - Provide a stable, query-friendly API over a resolved Capability Set
 * - Map resolved packages to tab descriptors for the Runtime Shell
 * - Be immutable after construction
 *
 * Rules:
 * - No business logic
 * - No module-specific conditions
 * - No imports from services, persistence, or React
 * - Pure data class — constructed once, read many times
 */

export class CapabilityPublicSet {
  /**
   * @param {object} params
   * @param {object}        params.resolvedSet   — structural output of ModuleCapabilityResolver.resolveCapabilitySet
   * @param {Array<object>} params.definitions   — full package definitions (from getPackageById),
   *                                               including UI metadata (capabilityKey, label, icon, order, uiRole)
   * @param {object}        [params.experiencesConfig] — optional experiences config from the adapter
   * @param {string[]}      params.experiencesConfig.enabledExperiences
   * @param {Array<object>} params.experiencesConfig.availableExperiences
   */
  constructor({ resolvedSet, definitions, experiencesConfig } = {}) {
    this._resolvedSet = resolvedSet ?? null;
    this._experiencesConfig = experiencesConfig ?? null;

    const validDefs = (definitions ?? []).filter(Boolean);

    // Index by capabilityKey for O(1) hasCapability / getCapability lookups
    this._byKey = new Map(
      validDefs
        .filter((d) => d.capabilityKey)
        .map((d) => [d.capabilityKey, d])
    );

    // Index by packageId — used internally for enrichment
    this._byPackageId = new Map(
      validDefs
        .filter((d) => d.packageId)
        .map((d) => [d.packageId, d])
    );
  }

  // ---------------------------------------------------------------------------
  // Query API — consumed by DynamicModule
  // ---------------------------------------------------------------------------

  /**
   * Returns true if a capability with the given key is present in this set.
   *
   * @param {string} capabilityKey
   * @returns {boolean}
   */
  hasCapability(capabilityKey) {
    return this._byKey.has(capabilityKey);
  }

  /**
   * Returns the full definition for a capability key, or null if absent.
   *
   * @param {string} capabilityKey
   * @returns {object|null}
   */
  getCapability(capabilityKey) {
    return this._byKey.get(capabilityKey) ?? null;
  }

  /**
   * Returns ordered tab descriptors for the Runtime Shell.
   *
   * Only capabilities with uiRole === 'tab' are included.
   * Tabs are sorted by `order` (ascending).
   *
   * Tab descriptor shape:
   *   {
   *     key:     string,   — capabilityKey (stable, used for activeTab state)
   *     label:   string,   — display label
   *     icon:    string,   — Lucide icon name
   *     order:   number,
   *     enabled: boolean,
   *   }
   *
   * @returns {Array<{key: string, label: string, icon: string, order: number, enabled: boolean}>}
   */
  getTabs() {
    return Array.from(this._byKey.values())
      .filter((d) => d.uiRole === 'tab')
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .map((d) => ({
        key:     d.capabilityKey,
        label:   d.label,
        icon:    d.icon,
        order:   d.order,
        enabled: true,
      }));
  }

  /**
   * Returns the tab descriptor for a single capability key, or null.
   *
   * @param {string} key — capabilityKey
   * @returns {{key: string, label: string, icon: string, order: number, enabled: boolean}|null}
   */
  getTab(key) {
    const d = this._byKey.get(key);
    if (!d || d.uiRole !== 'tab') return null;
    return {
      key:     d.capabilityKey,
      label:   d.label,
      icon:    d.icon,
      order:   d.order,
      enabled: true,
    };
  }

  /**
   * Returns the default (first) tab key, or null if no tabs are available.
   * Convenience method to avoid spread in DynamicModule.
   *
   * @returns {string|null}
   */
  getDefaultTabKey() {
    const tabs = this.getTabs();
    return tabs.length > 0 ? tabs[0].key : null;
  }

  /**
   * Returns the enabled operational experiences for the 'operational-experiences' capability.
   * If the capability is not present, returns an empty array.
   *
   * @returns {Array<{experienceKey: string, displayName: string, description: string, icon: string}>}
   */
  getEnabledExperiences() {
    if (!this._experiencesConfig) return [];

    const { enabledExperiences, availableExperiences } = this._experiencesConfig;
    if (!Array.isArray(enabledExperiences) || !Array.isArray(availableExperiences)) return [];

    return availableExperiences.filter((exp) => enabledExperiences.includes(exp.experienceKey));
  }

  // ---------------------------------------------------------------------------
  // Metadata
  // ---------------------------------------------------------------------------

  /**
   * The moduleId this Capability Public Set was resolved for.
   * @returns {string|null}
   */
  get moduleId() {
    return this._resolvedSet?.moduleId ?? null;
  }

  /**
   * The capabilitySetId assigned by the resolver.
   * @returns {string|null}
   */
  get capabilitySetId() {
    return this._resolvedSet?.capabilitySetId ?? null;
  }
}
