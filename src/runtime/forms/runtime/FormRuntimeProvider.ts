/**
 * FormRuntimeProvider (Sprint 30)
 * Provides global accessors to runtime resolver.
 */

import type { RuntimeFormModel } from "./FormRuntimeContracts";

export type FormRuntimeResolver = {
  resolve(formId: string): RuntimeFormModel | undefined;
  has(formId: string): boolean;
};

let runtimeResolver: FormRuntimeResolver | null = null;

export function getRuntimeResolver(): FormRuntimeResolver {
  if (!runtimeResolver) {
    // Default no-op resolver; safe for reads before initialization.
    runtimeResolver = {
      resolve(): undefined,
      has(): boolean {
        return false;
      },
    };
  }

  return runtimeResolver;
}

export function setRuntimeResolver(next: FormRuntimeResolver): void {
  runtimeResolver = next;
}

