import type { ProviderOrchestrationContext } from "./ProviderOrchestrationContext";
import type { ProviderOrchestrationResult } from "./ProviderOrchestrationResult";

/**
 * RuntimeProviderExecutionCoordinator
 * Prepares an execution plan.
 * Does NOT execute, does NOT call providers, does NOT call Execution Router.
 */
export class RuntimeProviderExecutionCoordinator {
  constructor(private readonly engine: { orchestrate: (ctx: ProviderOrchestrationContext) => ProviderOrchestrationResult }) {}

  public buildExecutionPlan(context: ProviderOrchestrationContext): ProviderOrchestrationResult {
    return this.engine.orchestrate(context);
  }
}

