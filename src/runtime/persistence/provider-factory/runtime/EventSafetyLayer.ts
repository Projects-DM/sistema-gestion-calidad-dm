import type { RuntimeBusinessEvent } from "../../../integration/BusinessEventTranslationLayer";

export type EventSafetyDecision =
  | { kind: "accepted"; idempotencyKey: string }
  | { kind: "rejected"; reason: string }
  | { kind: "duplicate"; idempotencyKey: string; reason: string };

export type EventSafetyState = {
  // Deterministic in-memory replay protection.
  // key: idempotencyKey
  // value: phase processed at least once.
  seen: Map<string, { processed: true }>;
};

export class EventSafetyLayer {
  private readonly state: EventSafetyState;
  private readonly inflightByKey: Map<string, Promise<boolean>>;

  constructor(params?: { state?: EventSafetyState }) {
    this.state = params?.state ?? { seen: new Map() };
    this.inflightByKey = new Map();
  }



  /**
   * Validate taxonomy + correlation + deterministic idempotencyKey.
   * Replay protection is enforced with per-key in-memory logical locking
   * to avoid race conditions where multiple concurrent calls pass the same
   * `seen` check before it is set.
   */
  public validateAndProcess(event: RuntimeBusinessEvent): EventSafetyDecision {
    // 1) Strict taxonomy validation
    if (event.eventType !== "FORM_CREATED" && event.eventType !== "FORM_VERIFIED") {
      return { kind: "rejected", reason: "invalid_taxonomy" };
    }

    // 2) correlation enforcement
    if (!event.correlationId || typeof event.correlationId !== "string") {
      return { kind: "rejected", reason: "missing_correlationId" };
    }

    // 3) deterministic idempotency key
    // Prefer eventId
    // Fallback deterministic composite: eventType + correlationId + actorId + responseId
    const idempotencyKey = event.eventId || this.computeCompositeKey(event);


    // 4) per-key logical lock (best-effort for single-process concurrency)
    const existing = this.inflightByKey.get(idempotencyKey);

    if (existing) {
      // Another concurrent call is validating/marking this key.
      // We conservatively return duplicate/replay.
      return { kind: "duplicate", idempotencyKey, reason: "replay_inflight" };
    }


    // Lock + perform atomic check+set in one synchronous block
    this.inflightByKey.set(
      idempotencyKey,
      Promise.resolve(true).finally(() => {
        this.inflightByKey.delete(idempotencyKey);
      })
    );

    if (this.state.seen.has(idempotencyKey)) {
      return { kind: "duplicate", idempotencyKey, reason: "replay_detected" };
    }

    // 5) accept and mark as seen (so duplicate replays are ignored)
    this.state.seen.set(idempotencyKey, { processed: true });
    return { kind: "accepted", idempotencyKey };
  }


  private computeCompositeKey(event: RuntimeBusinessEvent): string {
    // eventType + correlationId + actorId + responseId is desired by spec.
    // We only have responseId via normalized payload.responseId.
    const responseId = (event.payload?.normalized as any)?.responseId;
    const base = `${event.eventType}:${event.correlationId}:${event.actorId}:${responseId ?? ""}`;
    let h = 0;
    for (let i = 0; i < base.length; i++) {
      h = (h * 31 + base.charCodeAt(i)) >>> 0;
    }
    return `idem_${h.toString(16)}`;
  }
}

