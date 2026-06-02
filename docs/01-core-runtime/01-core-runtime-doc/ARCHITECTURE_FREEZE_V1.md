# ARCHITECTURE_FREEZE_V1.md

STATUS:
Approved Architecture Baseline

DATE:
Pre-Sprint 23

PURPOSE:
Congelar la arquitectura aprobada antes de iniciar la integración Runtime ↔ SaaS.

---

# 1. PROJECT STATE

El proyecto se divide en dos sistemas principales:

## SaaS Layer

Responsable de:

* UI
* Auth
* Roles
* Formularios dinámicos
* Evidencias
* Persistencia Supabase
* Gestión documental

## Runtime Layer

Responsable de:

* Audit
* Analytics
* Scoring
* Decision (futuro)
* Selection (futuro)
* Recovery (futuro)
* Persistence Routing
* Provider Factory

---

# 2. APPROVED DOMAIN PRIORITIES

PRIORITY 1

* Formularios Dinámicos

PRIORITY 2

* Dashboard
* Configuración

PRIORITY 3

* Dispatches
* Certificados
* Technical Sheets

---

# 3. APPROVED SPRINT 23 SCOPE

IN:

* FORM_CREATED
* FORM_VERIFIED
* Audit Layer
* Analytics Layer
* Basic Scoring Signals

OUT:

* Dispatches
* Selection
* Recovery
* Decision avanzada
* Provider Binding Extensions

---

# 4. RUNTIME OWNERSHIP

Runtime es dueño de:

* Audit
* Analytics
* Scoring
* Decision
* Selection
* Persistence Routing

SaaS NO debe implementar estas responsabilidades.

---

# 5. SAAS OWNERSHIP

SaaS es dueño de:

* Auth
* Profiles
* Roles
* UI
* Formularios
* Evidencias
* CRUD
* Experiencia de usuario

Runtime NO debe asumir estas responsabilidades.

---

# 6. APPROVED IDENTITY STRATEGY

actorId
→ profiles.id

eventId
→ sgc_audit_logs.id

correlationId
→ sgc_form_responses.id

---

# 7. APPROVED EVENT TAXONOMY

FORM_CREATED

FORM_VERIFIED

No usar:

* create
* verify

como nombres runtime.

---

# 8. PAYLOAD RULE

Runtime NO consumirá EAV raw.

sgc_response_values NO es payload runtime.

Todo payload deberá pasar por normalización conceptual.

---

# 9. FORBIDDEN CHANGES

No introducir:

* Supabase dentro del Runtime
* lógica UI dentro del Runtime
* Selection en Sprint 23
* Recovery en Sprint 23
* Dispatches en Sprint 23

---

# 10. FREEZE DECISION

La arquitectura queda congelada para Sprint 23.

Toda modificación arquitectónica posterior deberá justificarse explícitamente.

END OF FREEZE
