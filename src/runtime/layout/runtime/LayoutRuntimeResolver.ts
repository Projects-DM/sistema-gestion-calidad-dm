/**
 * LayoutRuntimeResolver (Sprint 34)
 * Resolves layoutId -> LayoutDefinition via LayoutRegistry.
 * No React, no builders, no runtime orchestration.
 */

import type { LayoutDefinition } from "../contracts/LayoutContracts";

import type { LayoutId } from "../registry/LayoutRegistry";

import { getLayoutRegistry } from "../registry/LayoutRegistryProvider";

export type LayoutRuntimeResolver = {
  resolve: (layoutId: LayoutId) => LayoutDefinition | undefined;
  has: (layoutId: LayoutId) => boolean;
};

export const LayoutResolver: LayoutRuntimeResolver = {
  resolve(layoutId: LayoutId): LayoutDefinition | undefined {
    return getLayoutRegistry().get(layoutId);
  },

  has(layoutId: LayoutId): boolean {
    return getLayoutRegistry().has(layoutId);
  },
};

export default LayoutResolver;

