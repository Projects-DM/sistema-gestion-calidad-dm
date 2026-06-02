# SAAS_RUNTIME_INTEGRATION_STRATEGY_AUDIT.md

IMPORTANTE

* NO IMPLEMENTAR CAMBIOS
* NO MODIFICAR CÓDIGO
* NO CREAR ARCHIVOS PRODUCTIVOS
* NO REFACTORIZAR
* NO CONECTAR RUNTIME TODAVÍA

SOLO INSPECCIÓN ARQUITECTÓNICA

---

## CONTEXTO
Disponemos de:
- Runtime Engine auditado y operativo (provider-factory; pipeline: Audit → Analytics → Scoring → Decision → Selection → Active Provider Binding)
- SaaS existente auditado (UI + Supabase + servicios `dynamicService.js`, `despachosService.js`)

---

## Nota de enfoque
Esta estrategia se formula para **integración futura** del SaaS hacia Runtime, sin tocar el código del SaaS.

---

## FASE 1 — RUNTIME ENTRY POINT DISCOVERY

### Candidato principal: `DynamicForm` / `DynamicModule`
- **Dónde ocurre el “evento semilla”**
  - Submit de un formulario: `dynamicService.submitFormResponse(formId, userId, values, evidences)`
  - Verify de un formulario: `dynamicService.verifyFormResponse(responseId, userId, status, comment)`
- **Qué persistencias alimentan**
  - `sgc_form_responses` (creación de instancia)
  - `sgc_response_values` (EAV values)
  - `sgc_evidences` (archivos/evidencias)
  - `sgc_audit_logs` (action_type create/verify)

**Clasificación:**
- **READY** (como entry point para Audit/Analytics/Scoring, parcialmente para Decision/Selection)

### Entry point secundario: `Traceability / Dispatches`
- `Dispatches.jsx` crea/actualiza registros en `despachos`.
- No existe persistencia de eventos/audit por despacho equivalente a `sgc_audit_logs`.

**Clasificación:**
- **NOT_READY** (para alimentar Audit Layer del runtime con consistencia)

---

## FASE 2 — EVENT SOURCE ANALYSIS

A partir de evidencia del SaaS:

### Eventos explícitos (formularios dinámicos)
1) **FORM_CREATED**
- Origin Domain: Formularios dinámicos
- Source actual: `dynamicService.submitFormResponse()`
- Persistencia: `sgc_form_responses` + `sgc_audit_logs(action_type='create')`
- Runtime Compatibility %: **80%**

2) **FORM_VERIFIED**
- Origin Domain: Formularios dinámicos
- Source actual: `dynamicService.verifyFormResponse()` / `verifyMultipleFormResponses()`
- Persistencia: update `sgc_form_responses.status/verified_at/...` + `sgc_audit_logs(action_type='verify')`
- Runtime Compatibility %: **85%**

### Eventos implícitos (despachos)
3) **DISPATCH_IMPORTED**
- Origin Domain: Trazabilidad/Despachos
- Source actual: `Dispatches.jsx` → `handleExcelImported()` → `insertDespachosBatch()`
- Persistencia: `despachos` (sin audit/event table)
- Runtime Compatibility %: **20%**

4) **DISPATCH_UPDATED**
- Origin Domain: Trazabilidad/Despachos
- Source actual: `Dispatches.jsx` → `updateDespacho()`
- Persistencia: `despachos` (sin audit/event table)
- Runtime Compatibility %: **15%**

---

## FASE 3 — AUDIT LAYER INTEGRATION

### Entidades que pueden alimentar Audit Layer inmediatamente
**Desde Formularios dinámicos: 
- `sgc_audit_logs`**

**Input**
- `action_type` (create/verify)
- `response_id`
- `modified_by` (quién)
- `created_at` (cuándo)
- `reason`, `new_data` (payload)

**Transformación requerida (sin implementar aún)**
- Mapear:
  - `action_type` → `RuntimeExecutionAuditType`
  - `modified_by` → `provider/user actor id` (si aplica)
  - `response_id` → `transactionId/correlationId` (estrategia de identidad)

**Riesgo**
- **MEDIO**: requiere contrato/convención de identidad y correlación; pero existe una tabla de audit.

**Compatibilidad:** **READY (~75%)**

### Entidades no recomendadas aún para audit (despachos)
- `despachos` no tiene audit log equivalente.
- **Riesgo:** alto de no poder reconstruir “quién/cuándo/cómo” con granularidad.

**Compatibilidad:** **CRITICAL**

---

## FASE 4 — ANALYTICS LAYER INTEGRATION

El runtime analytics se alimenta de audit records (provider/exec). Para el SaaS, sin tocar arquitectura:

**READY / PARTIAL / NOT_READY** por fuente:

### `sgc_audit_logs`
- Se puede generar:
  - conteo por tipo de evento create/verify
  - tasas/volúmenes por día/usuario/rol (si se mapea actor)
  - distribución de reasons/estatus.
- **Clasificación:** **PARTIAL**
- Razón: la estructura es suficiente, pero falta:
  - correlación con “ejecución” de providers runtime
  - normalización determinista del payload

### `sgc_form_responses`
- Señales:
  - status y transiciones
  - verified_at
- **Clasificación:** **PARTIAL**

### `sgc_evidences`
- Señales:
  - adjuntos presentes
  - frecuencia
- **Clasificación:** **READY (para métricas simples)**

### NOT READY
- Pipeline de analytics determinista end-to-end (como si fuera ejecución runtime) **requiere contrato de eventos**.

---

## FASE 5 — SCORING LAYER INTEGRATION

Señales potenciales convertibles a score (derivables del SaaS):
- Tiempo entre `FORM_CREATED` y `FORM_VERIFIED` (si existiera correlationId temporal; hoy existe `created_at` y `verified_at`)
- Proporción de formularios aprobados vs rechazados (status en `sgc_form_responses`)
- Evidencias faltantes (comparación de response_id con sgc_evidences)

**Clasificación:**
- **PARTIAL** (se puede construir scoring “operativo”) 
- **REQUIRES REFACTOR conceptual (contratos)** si el scoring runtime debe ser específicamente “provider execution based”.

---

## FASE 6 — DECISION LAYER INTEGRATION

Decisiones existentes hoy (operativas):
- Verificación aprueba/rechaza/corregir (status de `sgc_form_responses`)

Cómo se mueven a runtime Decision:
- Si se modela “verificación” como decisión semi-automática:
  - Decision reason = approve/reject
  - confidence = heurística basada en evidencias/validaciones

**Clasificación:**
- **SEMI-AUTOMATIZABLE** (pero requiere introducir un motor de reglas o un adapter de “policy”, aún no existe en el SaaS)
- Para runtime Decision/Selection “real” requiere contrato de entrada estandarizado.

---

## FASE 7 — IDENTITY STRATEGY

Mapeo propuesto (documentación, no implementación):

- **Supabase IDs**
  - `response_id` (sgc_form_responses.id)
  - `user id` (profiles)
- **Runtime Correlation IDs**
  - correlationId := response_id (o un hash/derivado determinista)
- **Runtime Transaction IDs**
  - transactionId := id de la “operación lógica” (create/verify) o response_id
- **Recovery IDs**
  - recoveryId := id derivado del proceso de verificación (si hay reintentos)

**Riesgos**
- Unificar semántica entre:
  - creación vs verificación
  - bulk verify vs verify single
- Riesgo de duplicados si correlationId no es estable.

---

## FASE 8 — ADAPTER REQUIREMENTS (sin implementar)

Adapters requeridos para integrar SaaS → Runtime:

1) **AuditLogAdapter (sgc_audit_logs → Runtime Audit Records)**
- Transforma action_type/create/verify
- Conforma metadata normalizada (payload)

2) **FormResponseAdapter (sgc_form_responses → Transaction-like input)**
- Construye datos mínimos (status, timestamps, ids)

3) **EvidenceAdapter (sgc_evidences → evidence presence/quality signals)**

4) **IdentityAdapter**
- map de IDs supabase → correlation/transaction/recovery ids runtime

---

## FASE 9 — DOMAIN PRIORITIZATION

Ranking por facilidad + valor para runtime:

1) Formularios dinámicos (sgc_* + sgc_audit_logs)
- Justificación: existe audit persistente con create/verify.

2) Evidencias (sgc_evidences)
- Justificación: métricas simples y señales claras.

3) Dashboard
- Justificación: consumos existentes; pero hoy depende de agregaciones/mocks.

4) Usuarios/Profiles
- Justificación: necesario para actor mapping, pero no es la fuente principal de eventos.

5) Trazabilidad/Despachos
- Justificación: falta event/audit persistente equivalente.

---

## FASE 10 — EXECUTIVE REPORT

### A) Runtime Entry Points
- READY: `DynamicForm → dynamicService.submitFormResponse/verifyFormResponse`
- NOT_READY: `Dispatches → despachos CRUD`

### B) Event Sources
- `sgc_audit_logs` (create/verify): READY/PARTIAL
- `despachos` CRUD: NOT READY para audit determinista

### C) Audit Integration Readiness
- Formularios: **READY (~75%)**
- Despachos: **CRITICAL**

### D) Analytics Integration Readiness
- `sgc_audit_logs`: PARTIAL
- `sgc_evidences`: READY (métricas simples)

### E) Scoring Integration Readiness
- PARTIAL (operativo) → REQUIRES contrato si es provider execution based

### F) Decision Integration Readiness
- SEMI-AUTOMATIZABLE (verificación approve/reject), requiere policy/input contract.

### G) Identity Strategy
- correlationId/transactionId derivables desde `response_id`.

### H) Adapter Requirements
- AuditLogAdapter, IdentityAdapter, EvidenceAdapter.

### I) Domain Priority Ranking
1) Formularios dinámicos
2) Evidencias
3) Dashboard
4) Usuarios
5) Despachos

### J) Final Verdict
- **READY** para iniciar Sprint 23.0 enfocando únicamente en **formularios dinámicos** y su `sgc_audit_logs`.
- Para trazabilidad/waswo: **NOT READY** hasta modelar event/audit equivalente.

