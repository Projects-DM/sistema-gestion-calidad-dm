/**
 * LayoutRegistryProvider (Sprint 34)
 * Provider accessors for LayoutRegistry.
 */

import type { LayoutRegistry } from "./LayoutRegistry";

import { createLayoutRegistry } from "./LayoutRegistry";

let layoutRegistry: LayoutRegistry | null = null;

export function getLayoutRegistry(): LayoutRegistry {
  if (!layoutRegistry) {
    layoutRegistry = createLayoutRegistry();
  }

  return layoutRegistry;
}

export function setLayoutRegistry(next: LayoutRegistry): void {
  layoutRegistry = next;
}

