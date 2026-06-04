# SGC MODULE TEMPLATE (RUNTIME COMPLIANT)

## 1. MODULE DEFINITION

- moduleId:
- moduleName:
- engineType:

---

## 2. UI LAYER

- Components:
- Events emitted:
- Validation rules:

RULE:
UI MUST NOT contain business logic.

---

## 3. SERVICE LAYER (dynamicService)

MUST RETURN:

__runtime_internal_event

Example:

{
  type,
  responseId,
  actorId,
  correlationId,
  auditEventId
}

---

## 4. RUNTIME ACTIVATION

MUST USE:

RuntimeActivationLayer.activate(internalEvent)

---

## 5. RUNTIME FLOW

Activation → Translation → Router → Safety → Audit → Analytics → Scoring

---

## 6. SAFETY REQUIREMENTS

- correlationId required
- idempotency required
- replay protection enabled

---

## 7. AUDIT REQUIREMENTS

Every execution must be recorded.

---

## 8. ANALYTICS REQUIREMENTS

Must derive from audit registry only.

---

## 9. SCORING REQUIREMENTS

Must be triggered by router only.

---

## 10. FINAL VALIDATION RULE

MODULE IS INVALID UNTIL FULL RUNTIME FLOW IS CONNECTED.