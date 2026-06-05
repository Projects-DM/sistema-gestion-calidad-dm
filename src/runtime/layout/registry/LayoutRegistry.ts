/**
 * LayoutRegistry (Sprint 34)
 * Metadata-driven registry for LayoutDefinition resolution.
 * Contracts only — no orchestration and no side effects.
 */

import type { LayoutDefinition } from "../contracts/LayoutContracts";

export type LayoutId = string;

export type LayoutRegistry = {
  register: (layout: LayoutDefinition) => void;
  get: (layoutId: LayoutId) => LayoutDefinition | undefined;
  has: (layoutId: LayoutId) => boolean;
  getAll: () => LayoutDefinition[];
};

export const createLayoutRegistry = (): LayoutRegistry => {
  const map = new Map<LayoutId, LayoutDefinition>();

  return {
    register(layout: LayoutDefinition): void {
      map.set(layout.id, layout);
    },

    get(layoutId: LayoutId): LayoutDefinition | undefined {
      return map.get(layoutId);
    },

    has(layoutId: LayoutId): boolean {
      return map.has(layoutId);
    },

    getAll(): LayoutDefinition[] {
      return Array.from(map.values());
    },
  };
};

