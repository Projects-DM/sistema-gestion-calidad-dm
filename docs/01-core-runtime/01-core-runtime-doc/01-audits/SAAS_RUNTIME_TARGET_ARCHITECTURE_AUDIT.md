# SAAS_RUNTIME_TARGET_ARCHITECTURE_AUDIT.md

IMPORTANTE

* NO IMPLEMENTAR CAMBIOS
* NO MODIFICAR CÓDIGO
* NO CREAR ARCHIVOS PRODUCTIVOS
* NO CREAR MIGRACIONES
* NO REFACTORIZAR

SOLO INSPECCIÓN ARQUITECTÓNICA Y DISEÑO DE INTEGRACIÓN FUTURA

---

## CONTEXTO

Auditorías existentes (no repetir):
1. `SAAS_RUNTIME_INTEGRATION_AUDIT.md`
2. `SAAS_DOMAIN_MAPPING_AUDIT.md`
3. `SAAS_RUNTIME_INTEGRATION_STRATEGY_AUDIT.md`
4. `TRACEABILITY_DEEP_AUDIT.md`
5. `TRACEABILITY_RUNTIME_READINESS.md`

Este documento define la **arquitectura objetivo** del producto cuando el Runtime Engine sea el núcleo operativo.

---

## OBJETIVO

Responder:

* Qué seguirá viviendo dentro del SaaS.
* Qué responsabilidades migrarán al Runtime.
* Qué módulos deberán convertirse en productores de eventos.
* Qué módulos deberán convertirse en consumidores del Runtime.
* Qué dominios deben permanecer desacoplados.
* Cómo evolucionará el sistema durante Sprint 23+.

---

## FASE 1 — RESPONSIBILITY BOUNDARY AUDIT

Se evalúan dominios:
- Usuarios
- Formularios dinámicos
- Trazabilidad
- Certificados
- Dashboard
- Configuración
- Runtime Playground

### 1. Usuarios
- **Qué hace hoy:** Auth + perfil/rol (UI gates) via `AuthContext.jsx`.
- **Qué debería hacer después (target):**
  - seguir siendo fuente de identidad/actores.
  - proveer metadatos actor→payload (sin acoplarse a Runtime providers).
- **Qué NO debería hacer cuando Runtime esté integrado:**
  - no ejecutar lógica de decisión/selection; solo proveer actorId y permisos.

**Clasificación por dominio (target):**
- UI Domain: Usuarios
- Shared: Identity mapping

### 2. Formularios dinámicos
- **Qué hace hoy:** render dinámico + persistencia + audit en `sgc_*` + verificación.
- **Qué debería hacer después:**
  - seguir en UI/Domain Layer (input/output de la experiencia usuario).
  - producir eventos de negocio normalizados a Runtime.
  - delegar lógica de reglas deterministas hacia Runtime (cuando corresponda) en vez de heurísticas ad-hoc.
- **Qué NO debería hacer:**
  - no generar “decisiones” complejas (approve/reject) si estas deben ser runtime-driven.

### 3. Trazabilidad
- **Qué hace hoy:** CRUD de despachos + import Excel + export PDF.
- **Qué debería hacer después:**
  - convertirse en productor de eventos (import/update/delete) pero **no** está listo en audit; será posterior.
- **Qué NO debería hacer:**
  - no ser fuente directa del Audit/Analytics runtime sin event contract.

### 4. Certificados / Fichas / Documentación
- **Qué hace hoy:** contenedores de documentos.
- **Qué debería hacer después:**
  - mantener UI y persistencia documental.
  - si se requiere audit/analytics, producir eventos livianos (evidence/document ops).

### 5. Dashboard
- **Qué hace hoy:** stats (incluye mocks) y agregaciones.
- **Qué debería hacer después:**
  - consumir analytics runtime (o snapshots) en vez de agregación ad-hoc.

### 6. Configuración
- **Qué hace hoy:** configuración de UI/entidades.
- **Qué debería hacer después:**
  - convertirse en input “contract-driven” para runtime orchestration (si aplica), sin lógica de decisión.

### 7. Runtime Playground
- **Qué hace hoy:** sandbox runtime.
- **Qué debería hacer después:**
  - mantenerse como herramienta de validación.

---

## FASE 2 — RUNTIME OWNERSHIP MATRIX

| Capability | SaaS Owner | Runtime Owner | Shared |
|---|---|---|---|
| Identity (actor mapping) | SaaS | Runtime (contratos) | Shared |
| Dynamic Forms (UI) | SaaS | — | — |
| Form validation rules | SaaS (rules data) | Runtime (determinism exec) | Shared |
| Audit (event sourcing) | —/Shared (por adapters) | Runtime Audit Layer | Shared |
| Analytics | —/Shared (por event adapters) | Runtime Analytics Layer | Shared |
| Scoring | —/Shared | Runtime Scoring Layer | Shared |
| Decision | —/Shared | Runtime Decision Layer | Shared |
| Selection | —/Shared | Runtime Selection Layer | Shared |
| Provider Binding & Persistence routing | — | Runtime | Runtime |
| Dispatch Management | SaaS (UI + CRUD) hasta event contract | Runtime (cuando event contract exista) | Shared |
| Reporting | SaaS UI | Runtime (analytics snapshots) | Shared |

Resultado:
- El Runtime toma ownership de **Audit/Analytics/Scoring/Decision/Selection/Binding**.
- El SaaS permanece owner de **experiencia usuario + CRUD/IO**.

---

## FASE 3 — EVENT ARCHITECTURE TARGET STATE

### Eventos existentes (según evidencias del SaaS)
- `FORM_CREATED`
- `FORM_VERIFIED`
- (implícitos) `DISPATCH_IMPORTED`, `DISPATCH_UPDATED`, `DISPATCH_DELETED` (sin audit/event contract persistente)

### Eventos faltantes (target)
- Domain events persistentes para Trazabilidad (despachos) con audit suficiente.
- Eventos de evidence/doc ops si se desea unificar analytics.

### Clasificación target (estado)
- Formularios: **READY/PARTIAL** (base existente con `sgc_audit_logs`).
- Despachos: **MISSING** (requiere event contract/audit bridge persistente).

---

## FASE 4 — DATA FLOW ARCHITECTURE

### Flujo actual (simplificado)
UI
→ Service (dynamicService/despachosService)
→ Supabase (tablas)
→ UI

### Flujo futuro target (sin detallar implementación)
UI
→ Domain Layer (SaaS)
→ Emit Events (adaptadores de dominio)
→ Runtime Engine (Audit → Analytics → Scoring → Decision → Selection)
→ Persistence Provider (según Runtime)
→ Runtime snapshots
→ UI (lecturas/exports)

Principio: Runtime permanece provider-agnostic.

---

## FASE 5 — ADAPTER ARCHITECTURE (target)

Adaptadores necesarios (no implementados en esta fase):
- AuditLogAdapter: `sgc_audit_logs` → Runtime audit records
- IdentityAdapter: `profiles/users` → runtime correlation/transaction identities
- FormResponseAdapter: `sgc_form_responses` → transaction-like inputs
- EvidenceAdapter: `sgc_evidences` → evidence presence/quality signals
- DispatchAdapter: `despachos` → eventos (requerirá contrato persistente)
- AnalyticsAdapter (si hace falta): runtime snapshots → dashboard consumption

---

## FASE 6 — RUNTIME READINESS BY DOMAIN (target)

- Usuarios: **PARTIAL** (identity mapping existe, decisión no)
- Formularios dinámicos: **READY** para integración parcial por existencia de `sgc_audit_logs`
- Trazabilidad/Despachos: **NOT_READY** para integración core (falta event contract persistente)
- Dashboard: **PARTIAL** (mocks/aggregations actuales)
- Certificados: **PARTIAL/REQUIRES REFACTOR** (no auditado en este documento)
- Configuración: **PARTIAL**

---

## FASE 7 — SPRINT ROADMAP ALIGNMENT (conceptual)

### Sprint 23+ (target)
- Sprint 23: Integrar **Formularios dinámicos** como productores de eventos (FORM_CREATED/FORM_VERIFIED) hacia Runtime.
- Sprint 24: Unificar identidad y correlación para analytics/scoring determinista sobre formularios.
- Sprint 25: Extender a **Evidencias** y enriquecer scoring/decision de calidad.
- Sprint 26+: Trazabilidad/Despachos (solo cuando exista event/audit contract persistente).

---

## FASE 8 — CRITICAL BLOCKERS

P0 (críticos):
- Event contract persistente y correlación para **Trazabilidad/Despachos**.
- Identity unificada (mapping Supabase IDs → correlation/transaction/recovery IDs runtime-safe).

P1:
- Remover dependencia de mocks del Dashboard si se requiere analytics determinista.

P2:
- Integración avanzada de documentos/certificados a scoring/decision.

---

## FASE 9 — FINAL TARGET ARCHITECTURE REPORT

1) Arquitectura actual
- SaaS: UI + servicios Supabase con audit parcial para formularios.
- Runtime: existe con pipeline, pero la integración no debe tocarse aquí.

2) Arquitectura futura
- SaaS: UI + domain IO + emisión/consumo via adapters.
- Runtime: Audit/Analytics/Scoring/Decision/Selection/Binding como núcleo.

3) Qué permanece en SaaS
- Auth/Profiles, UI gates, render dinámico, CRUD/IO de documentos.

4) Qué migra al Runtime
- audit/analytics/scoring/decision/selection (ejecución determinista).

5) Qué nunca debería migrar
- Supabase/DB coupling dentro del runtime.
- lógica UI (formularios/UX) dentro del runtime.

6) Dominio a integrar primero
- Formularios dinámicos.

7) Dominio a integrar último
- Trazabilidad/Despachos.

8) Madurez global estimada para Runtime
- Aproximación por audits existentes: **PARTIAL**.

9) Veredicto final
- **PARTIAL** (para iniciar phased integration), con bloqueo fuerte en despachos.

---

## CLASIFICACIÓN FINAL
- **PARTIAL** (READY para formularios, NOT_READY para trazabilidad core sin event contract).

