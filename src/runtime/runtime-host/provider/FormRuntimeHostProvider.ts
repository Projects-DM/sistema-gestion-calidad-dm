/**
 * FormRuntimeHostProvider (Sprint 33)
 * Global provider accessors for the runtime host component implementation.
 */

import type { ComponentType } from "react";

import type { FormRuntimeHostProps } from "../contracts/RuntimeHostContracts";

export type FormRuntimeHostComponent = ComponentType<FormRuntimeHostProps>;

let runtimeHostComponent: FormRuntimeHostComponent | null = null;

export function getFormRuntimeHost(): FormRuntimeHostComponent {
  if (!runtimeHostComponent) {
    // Safe default placeholder; should be overridden by Composition Root in future.
    // Keeps runtime deterministic without adding business logic.
    runtimeHostComponent = ((() => null) as unknown) as FormRuntimeHostComponent;
  }

  return runtimeHostComponent;
}

export function setFormRuntimeHost(next: FormRuntimeHostComponent): void {
  runtimeHostComponent = next;
}

