/**
 * RuntimeBuilderProvider (Sprint 32)
 * Global provider for the RuntimeBuilder instance.
 */

import type { RuntimeResolvedForm } from "../contracts/RuntimeBuilderContracts";

export type RuntimeBuilder = {
  resolve(formId: string): RuntimeResolvedForm | undefined;
  has(formId: string): boolean;
};

let runtimeBuilder: RuntimeBuilder | null = null;

export function getRuntimeBuilder(): RuntimeBuilder {
  if (!runtimeBuilder) {
    // Safe default no-op builder.
    runtimeBuilder = {
      resolve(): undefined {
        return undefined;
      },
      has(): boolean {
        return false;
      },
    };

  }

  return runtimeBuilder;
}

export function setRuntimeBuilder(next: RuntimeBuilder): void {
  runtimeBuilder = next;
}

