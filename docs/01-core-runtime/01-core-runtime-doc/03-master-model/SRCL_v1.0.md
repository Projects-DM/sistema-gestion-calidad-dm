# SGC RUNTIME CONTRACT LAYER (SRCL v1.0)

## 1. PURPOSE

This document defines the mandatory architecture contract for ALL modules in the SGC system.

No module is valid unless it complies with full SaaS → Runtime → Audit → Analytics → Scoring execution flow.

---

## 2. CORE PRINCIPLE

NO MODULE IS VALID WITHOUT RUNTIME INTEGRATION.

All business operations MUST flow through the Runtime Layer.

---

## 3. REQUIRED EXECUTION FLOW

Every event MUST follow this exact chain:

UI
→ dynamicService
→ __runtime_internal_event
→ RuntimeActivationLayer
→ BusinessEventTranslationLayer
→ PersistenceExecutionRouter
→ EventSafetyLayer
→ RuntimeExecutionAuditRecorder
→ RuntimeExecutionAuditRegistry
→ RuntimeProviderAnalyticsEngine
→ RuntimeProviderAnalyticsRegistry
→ ScoringEngine

---

## 4. SERVICE LAYER RULES (dynamicService)

Allowed ONLY:
- Data fetching (Supabase queries)
- Form submission return payloads

FORBIDDEN:
- Runtime logic
- Activation calls
- Analytics calls
- Scoring calls

MANDATORY OUTPUT:
- __runtime_internal_event MUST be returned

---

## 5. RUNTIME ACTIVATION RULE

All business events MUST pass through:

RuntimeActivationLayer.activate(internalEvent)

This is the ONLY valid entrypoint to Runtime.

---

## 6. SAFETY CONTRACT

EventSafetyLayer MUST enforce:

- correlationId required
- idempotencyKey required
- replay protection enabled
- taxonomy validation (FORM_CREATED | FORM_VERIFIED)

---

## 7. AUDIT CONTRACT

Every event MUST generate:

- ExecutionStarted
- ExecutionSucceeded / ExecutionFailed

Stored in:
RuntimeExecutionAuditRegistry (in-memory)

---

## 8. ANALYTICS CONTRACT

Analytics MUST be derived ONLY from:

RuntimeExecutionAuditRegistry

No external DB queries allowed.

---

## 9. SCORING CONTRACT

Scoring MUST be triggered ONLY by:

PersistenceExecutionRouter.submit()

Never directly from UI or service layer.

---

## 10. FORBIDDEN PATTERNS

❌ UI → Supabase direct writes  
❌ UI → Runtime bypass  
❌ dynamicService → Router calls  
❌ Missing __runtime_internal_event  
❌ Business logic inside UI  

---

## 11. VALIDATION RULE

A module is INVALID if:

- RuntimeActivationLayer is not used
- EventSafetyLayer is bypassed
- Audit is missing
- Analytics not derived from audit
- Scoring not triggered via router

---

## 12. FINAL DECLARATION

SRCL v1.0 is the mandatory contract for all SGC modules.