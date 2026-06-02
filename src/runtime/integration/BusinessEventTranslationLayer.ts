export type RuntimeBusinessEventType = "FORM_CREATED" | "FORM_VERIFIED";

export type RuntimeBusinessEvent = {
  eventType: RuntimeBusinessEventType;
  eventId: string;
  actorId: string;
  correlationId: string;
  timestamp: string;
  payload: {
    normalized: Record<string, unknown>;
  };
};

export type SaaSBusinessEventInput =
  | {
      type: "create";
      formId: string;
      responseId: string;
      actorId: string;
      timestamp: string;
      auditEventId?: string;
      correlationId: string;
    }
  | {
      type: "verify";
      formId: string;
      responseId: string;
      actorId: string;
      timestamp: string;
      auditEventId?: string;
      correlationId: string;
    };

function stableEventId(params: {
  action: "create" | "verify";
  auditEventId?: string;
  correlationId: string;
  responseId: string;
  timestamp: string;
}): string {
  // Deterministic best-effort: prefer auditEventId if provided.
  // Otherwise derive from correlation/response/action/timestamp.
  if (params.auditEventId) return String(params.auditEventId);
  const base = `${params.action}:${params.correlationId}:${params.responseId}:${params.timestamp}`;
  // simple deterministic hash (no external deps)
  let h = 0;
  for (let i = 0; i < base.length; i++) {
    h = (h * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `runtime_evt_${params.action}_${h.toString(16)}`;
}

export class BusinessEventTranslationLayer {
  public static translate(input: SaaSBusinessEventInput): RuntimeBusinessEvent {
    const eventType: RuntimeBusinessEventType =
      input.type === "create" ? "FORM_CREATED" : "FORM_VERIFIED";

    const eventId = stableEventId({
      action: input.type,
      auditEventId: input.auditEventId,
      correlationId: input.correlationId,
      responseId: input.responseId,
      timestamp: input.timestamp,
    });

    const normalized = {
      // normalized (NO EAV raw)
      formId: input.formId,
      responseId: input.responseId,
    };

    return {
      eventType,
      eventId,
      actorId: input.actorId,
      correlationId: input.correlationId,
      timestamp: input.timestamp,
      payload: {
        normalized,
      },
    };
  }
}

