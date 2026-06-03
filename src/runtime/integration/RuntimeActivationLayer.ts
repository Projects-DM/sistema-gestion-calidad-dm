import { BusinessEventTranslationLayer } from "./BusinessEventTranslationLayer";
import type { SaaSBusinessEventInput } from "./BusinessEventTranslationLayer";
import type { SubmitTransactionPayload } from "../transaction/contracts/transactionContracts";

export class RuntimeActivationLayer {
  private static instance: RuntimeActivationLayer | null = null;
  private router: any = null;
  private initialized = false;

  private constructor() {
    // Singleton
  }

  public static getInstance(): RuntimeActivationLayer {
    if (!RuntimeActivationLayer.instance) {
      RuntimeActivationLayer.instance = new RuntimeActivationLayer();
    }
    return RuntimeActivationLayer.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      // Lazy load the bootstrap system to prevent compile-time or load-time circular dependencies in ESM
      const { RuntimePersistenceBootstrap } = await import(
        "../persistence/provider-factory/bootstrap/RuntimePersistenceBootstrap"
      );
      const bootstrap = new RuntimePersistenceBootstrap();
      const compositionRoot = await bootstrap.initialize();
      this.router = compositionRoot.executionRouter;
      this.initialized = true;
    } catch (error) {
      console.error("[RuntimeActivationLayer] Failed to initialize bootstrap:", error);
      throw error;
    }
  }

  public async activate(event: any): Promise<any> {
    // 1. Validate minimum contract
    if (!event) {
      const err = new Error("RuntimeActivationLayer: event is required");
      console.error("[RuntimeActivationLayer] Contract violation:", err);
      throw err;
    }
    if (event.type !== "create" && event.type !== "verify") {
      const err = new Error(`RuntimeActivationLayer: unsupported event type "${event.type}"`);
      console.error("[RuntimeActivationLayer] Contract violation:", err);
      throw err;
    }
    if (!event.responseId) {
      const err = new Error("RuntimeActivationLayer: responseId is required");
      console.error("[RuntimeActivationLayer] Contract violation:", err);
      throw err;
    }
    if (!event.actorId) {
      const err = new Error("RuntimeActivationLayer: actorId is required");
      console.error("[RuntimeActivationLayer] Contract violation:", err);
      throw err;
    }
    if (!event.correlationId) {
      const err = new Error("RuntimeActivationLayer: correlationId is required");
      console.error("[RuntimeActivationLayer] Contract violation:", err);
      throw err;
    }

    // 2. Lazy bootstrap initialization check
    if (!this.initialized) {
      try {
        await this.initialize();
      } catch (initErr) {
        console.error(
          "[RuntimeActivationLayer] Runtime unavailable. Preserving SaaS transaction.",
          initErr
        );
        // Do not block committed Supabase transaction: return a failure result object instead of throwing
        return {
          success: false,
          retryable: true,
          transactionId: event.responseId,
          error: {
            code: "RUNTIME_UNAVAILABLE",
            message: `Runtime bootstrap initialization failed: ${initErr instanceof Error ? initErr.message : String(initErr)}`,
            retryable: true,
          },
        };
      }
    }

    try {
      // 3. Call BusinessEventTranslationLayer.translate(...)
      const input: SaaSBusinessEventInput = {
        type: event.type,
        formId: event.formId || "",
        responseId: event.responseId,
        actorId: event.actorId,
        timestamp: event.timestamp || new Date().toISOString(),
        correlationId: event.correlationId,
        auditEventId: event.auditEventId ? String(event.auditEventId) : undefined,
      };

      const translatedEvent = BusinessEventTranslationLayer.translate(input);

      // 4. Call PersistenceExecutionRouter.submit(...)
      const payload: SubmitTransactionPayload & { __runtime_internal_event: any } = {
        kind: "submit",
        formId: input.formId,
        userId: input.actorId,
        correlationId: input.correlationId,
        metadata: {
          transactionId: input.responseId,
          correlationId: input.correlationId,
          responseId: input.responseId,
          actorId: input.actorId,
        },
        capturedAt: input.timestamp,
        values: [], // payload must not leak raw EAV elements
        evidences: [],
        __runtime_internal_event: translatedEvent,
      };

      const result = await this.router.submit(payload);

      // 5. Return execution result
      if (!result.success) {
        console.error("[RuntimeActivationLayer] Router submission returned failure:", result.error);
      }
      return result;
    } catch (error: any) {
      // Router or translation failure: log visibly and throw
      console.error("[RuntimeActivationLayer] Router or translation layer failed:", error);
      throw error;
    }
  }
}

export const runtimeActivationLayer = RuntimeActivationLayer.getInstance();
