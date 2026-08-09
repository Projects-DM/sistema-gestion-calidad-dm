# Sprint 257-CERT — Alert Occurrence Implementation & Lifecycle Certification

> **Workspace:** `docs/` | **Repo:** `release/stable-sprint79`
> **Type:** Implementation Certification · Runtime Validation · Contract Compliance · Hardening Certification
> **Nivel:** 5 — Architecture & Implementation Certification
> **Dependencia:** Sprint 256-CERT → Sprint 257 → Sprint 257-HF1
> **Impacto:** CERTIFICACIÓN EXCLUSIVAMENTE — SIN CAMBIOS DE CÓDIGO

---

## 0. Veredicto

```
╔══════════════════════════════════════════════════════════════════════╗
║              SPRINT 257-CERT — CERTIFIED                           ║
║                                                                      ║
║  ALERT OCCURRENCE IMPLEMENTATION & LIFECYCLE                       ║
║                                                                      ║
║  Configuration = SSOT                                               ║
║  Alert ≠ Occurrence                                                  ║
║  Occurrence Identity = CERTIFIED                                    ║
║  Scheduling = SINGLE SOURCE                                         ║
║  Lifecycle = CERTIFIED                                              ║
║  Completion Signal = CERTIFIED                                      ║
║  RECORD_CREATED ≠ COMPLETED                                         ║
║  Idempotency = CERTIFIED                                             ║
║  Null-Safety Boundary = HARDENED                                   ║
║  Runtime = REUSED                                                    ║
║  Monitoring = CONSUMER                                              ║
║  No Second Runtime / Engine / Store                                 ║
║  Projection Contract Boundary = SINGLE GATE                         ║
║                                                                      ║
║  Sprint 257 + HF1 = STABLE                                          ║
║                                                                      ║
║  ALERT OCCURRENCE INFRASTRUCTURE                                    ║
║  READY FOR FUTURE EXTENSION                                         ║
║                                                                      ║
║  CURRENT PRODUCT PRIORITY:                                          ║
║  OPERATIONALIZATION / MODULE MIGRATION                              ║
╚══════════════════════════════════════════════════════════════════════╝
```

## 1. Mandato y alcance

Certificar formalmente la implementación de `Sprint 257` + `Sprint 257-HF1` contra el
contrato arquitectónico de `Sprint 256-CERT`. **Esta Sprint NO implementa funcionalidades.**
No se crearon ni modificaron Runtime/Engine/Service/Store/Context/tablas/columnas ni
infraestructura existente. Evidencia de auditoría: `git status --short` tras la certificación
muestra **solo el documento de certificación** (implementación comprometida en
`f8bc31d fix(alerts): harden occurrence projection against invalid occurrences`).

## 2. Metodología

- **Fuentes contrastadas:** dominio `occurrence/` (7 módulos), `useAlertRuntime.js`,
  `AlertMonitoringExperience.jsx`, `OperationalExperienceLifecycleOrchestrator.js`,
  configuración/resolución existente, `OperationalEventBus.js`.
- **Ejecución de suites** (inmediata, evidencia fresca).
- **Auditoría estática:** ESLint + regex de patrones prohibidos en `src/`.
- **Smoke runtime:** `vite preview` → HTTP 200 → Dashboard (sin reproducir el crash HF1).
- Todo veredicto registrado como PASS / PASS WITH NOTE / GAP / BLOCKER. **Ninguna desviación
  se corrige durante esta Sprint.**

## 3. Matriz de certificación — 32 criterios

| ID | Área | Veredicto | Evidencia |
|----|------|-----------|-----------|
| 257-CERT-01 | Configuration SSOT | PASS | `AlertConfiguration.js` intacto; el Resolver es el único lector de storage (`AlertConfigurationResolver.js:38-66`). |
| 257-CERT-02 | Occurrence Identity | PASS | `occurrenceIdOf` ⇒ `alertId:occ:<seq>` garantiza `alertId !== occurrenceId` (suite 257 Gate A). |
| 257-CERT-03 | Sequence | PASS | `occurrenceWindowAt` produce `sequence >= 1` estable; HF1-7 verifica OCC-001/002/003 contiguos. |
| 257-CERT-04 | Resource Binding | PASS | Ocurrencia porta `resourceKind + resourceId + moduleId` (proyección y ledger). |
| 257-CERT-05 | Schedule | PASS | `OccurrenceSchedule.js` importado por proyección y Monitoring; sin copias locales. |
| 257-CERT-06 | computeTarget | PASS | `computeTarget` existe una única vez (dominio); Monitoring lo importa (no lo duplica). |
| 257-CERT-07 | Temporal Window | PASS | `[startsAt, dueAt)` exclusivo (OCC-CERT-09); proyectado sin desviación. |
| 257-CERT-08 | Lifecycle | PASS | Estados derivados en `classifyOccurrence`; sin estado histórico persistente. |
| 257-CERT-09 | Completed Precedence | PASS | `COMPLETED` nunca vuelve a `OVERDUE` (suite 257 §3, HF1-8). |
| 257-CERT-10 | Completion | PASS | `RECORD_CREATED ≠ COMPLETED`; signal nace solo de señal final (Orchestrator 199-211). |
| 257-CERT-11 | Completion Signal | PASS | Solo `completado`(RESOURCE_COMPLETED), `approved`(RECORDS_APPROVED), `cerrado`(RECORDS_CLOSED) → bridge; `RECORDS_STATUS_UPDATED` con `newStatus !== 'completado'` ignorado. |
| 257-CERT-12 | Matching | PASS | `matchCompletionToOccurrence` exige identidad + ventana `[startsAt, dueAt)` (suite §4/§5). |
| 257-CERT-13 | Idempotency | PASS | Ledger no duplica señales; `recordCompletion` idempotente; una ocurrencia se completa una vez. |
| 257-CERT-14 | Ledger | PASS | Ledger **in-memory transitorio** (`OccurrenceLedger`), no reemplaza el SSOT de configuración. |
| 257-CERT-15 | Concurrency Boundary | PASS | La UI no es autoridad de cumplimiento: la autoridad es la señal del Orchepointer + ventana del ledger. |
| 257-CERT-16 | Timezone | **PASS WITH NOTE** | Contrato preparado (campo `timezone`, `parseAnchor` hora local); semántica global/calendar enterprise futura (§18). |
| 257-CERT-17 | Runtime Reuse | PASS | `useAlertRuntime` existente; la proyección es una superficie adicional, no un runtime nuevo. |
| 257-CERT-18 | Evaluation | PASS | Extensión sin segundo Engine; temporal calculado por el SSOT Scheduling. |
| 257-CERT-19 | Runtime Adapters | PASS | Puente consume `OperationalEventBus` existente; sin bus nuevo (evidencia `CompletionBridge.js:21`). |
| 257-CERT-20 | Resolver | PASS | `AlertConfigurationResolver` intacto (0 modificaciones en esta línea). |
| 257-CERT-21 | Form Engine | PASS | Sin acoplamiento de alertas (no embebe lógica de ocurrencias). |
| 257-CERT-22 | Document Engine | PASS | Sin lógica de alertas embebida. |
| 257-CERT-23 | Event Bus | PASS | único bus; bridge de suscripción idempotente y de grabación (`wireCompletionBridge`). |
| 257-CERT-24 | Monitoring | PASS | Monitoring **consume** proyección/`occurrenceWindowAt` del dominio (imports, no duplica). |
| 257-CERT-25 | Cumplidas | PASS | Bucket `Cumplidas` (estado `completed`) basado en señal real del ledger (firma presentacional). |
| 257-CERT-26 | Null Safety | PASS | Ningún `window` null llega a dereference (HF1-1/2/6; suite 20/20). |
| 257-CERT-27 | Contract Boundary | PASS | `isAlertOccurrence`/`assertAlertOccurrence` autoridad única (HF1-3). |
| 257-CERT-28 | Input Integrity | PASS | Proyección no muta configuración (HF1-10 no-mutación). |
| 257-CERT-29 | Backward Compatibility | PASS | Legacy sin `startDate` → **REJECT**, nunca fabricado artificialmente (HF1-6). |
| 257-CERT-30 | Future Persistence Boundary | PASS | `alertConfigurations[]` = Config SSOT; `OccurrenceLedger` = estado transiente (frontera explícita). |
| 257-CERT-31 | Global Center Boundary | PASS | No existe segundo motor global; solo consumidores del dominio. |
| 257-CERT-32 | Architecture Guardrails | PASS | Barrido `src/` sin patrones prohibidos (ver §6). |

## 4. Certificación específica del HF1

Trayectoria verificada (fuente: `OccurrenceProjection.js` citas y suites HF1):

```
Invalid Candidate        (anchor null/NaN — startDate '' por default, Sprint-254)
       ↓
Contract Boundary        (isProjectableOccurrenceCandidate + window gate)
       ↓
REJECT                   (return; nunca `?? {}`, nunca default fabricado)
       ↓
Projection never receives invalid occurrence   [No se llega a `window.startsAt`]
```

- **Prohibido verificado como NO usado:** `window ?? {}` y `window?.startsAt` **no** son el
  mecanismo. La proyección usa validación explícita, no optional-chaining como sustituto
  (ocurre en Monitoring solo como defensa de presentación, no en el núcleo).
- Comando/expresión de corte: `OccurrenceProjection.js:76` (deref `window.startsAt`) — ahora
  precedido de guarda con retorno temprano; la dereference ocurre solo con `window` no-null.
- Cadena certificada: **Validate → Reject invalid candidate → Calculate window → VALIDATE
  RESULTING OCCURRENCE (`isAlertOccurrence`) → Project**.

## 5. OcurrenciaProyección — casos
| Caso | Resultado | Fuente |
|------|-----------|--------|
| 1. Recursos `null` | `[]` sin excepción | HF1-1 |
| 2. Recursos `undefined` | `[]` sin excepción | HF1-2 |
| 3. Config válida (`Configuration→Anchor→Schedule→Occurrence→Projection`) | Occurrencia válida `assertAlertOccurrence` ✓ | HF1-3/4 |
| 4. Config legacy `startDate=''` | **REJECT** (sin fake date/auction/occurrence) | HF1-6 |

## 6. Guardrails — barrido de patrones prohibidos

`npx eslint src/core/capabilities/alert/occurrence/` → **CLEAN (exit 0)**.

Auditoría adicional en todo `src/` (`.js/.jsx`):
`OccurrenceEngine`, `OccurrenceRuntime`, `AlertRuntimeV2`, `AlertCenterV2`, `CompletionEngine`,
`OccurrenceService`, `OccurrenceStore`, `new EventBus` duplicado, `Scheduler` paralelo,
`ConfigurationStore` duplicado, oficial v2 → **ninguno encontrado**.

Arquitectura final: **ONE ALERT DOMAIN** (No existe Alert Runtime / Occurrence Runtime / Alert
Center Runtime). Runtime y Monitoring únicos consumidores del dominio.

## 7. Evidencia de ejecución (15/nuevo)

| Suite | Esperado | Obtenido |
|-------|----------|----------|
| `alert-occurrence-contract-sprint257.mjs` | 15/15 | **15/15 PASS** |
| `alert-occurrence-null-safety-sprint257-hf1.mjs` | 20/20 | **20/20 PASS** |
| `sprint-236` | PASS | **14/14 PASS** |
| `sprint-237` | PASS | **17/17 PASS** |
| `sprint-239` | PASS | **18/18 PASS** |
| `sprint-240` | PASS | **16/16 PASS** |
| `sprint-238` | PASS* | **16/16 PASS** |
| `npm run build` | PASS | **PASS** (solo warning de tamaño de chunks, no funcional) |
| `npx eslint src/core/capabilities/alert/occurrence/` | CLEAN | **CLEAN (exit 0)** |
| `vite preview` → Dashboard/AlertRuntime/OccurrenceProjection | sin crash HF1 | **HTTP 200** |

\* **Sprint 238 / TPA-14:** en esta corrida TPA-14 está **PASS** porque la implementación ya
está comprometida (`f8bc31d`) y la working-tree queda limpia. En la corrida previa (previo al
commit) TPA-14 falló por ser un *snapshot guard* del trabajo en curso — divergencia esperada,
**no** regresión funcional. Se documenta como *stale historical working-tree snapshot guard*.

## 8. Completion certificada

```
RECORD_CREATED       ≠     RESOURCE_COMPLETED
```

Solo `completado` (RESOURCE_COMPLETED), `approved` (RECORDS_APPROVED) y `cerrado`
(RECORDS_CLOSED) alimentan el ledger vía `CompletionBridge`. La cadena certificada:

```
RESOURCE_COMPLETED → resourceKind + resourceId + moduleId
   → Occurrence Matching → Window Validation [startsAt, dueAt) → COMPLETED
```

Primera señal → aplicada. Segunda señal → idempotente (ignorada). Estado `OVERDUE` jamás se
persiste (derivado en cada lectura).

## 9. Lifecycle y compatibilidad
- Precedencia: `COMPLETED` antes de evaluación temporal; luego `now > dueAt → OVERDUE`,
  `startsAt <= now <= dueAt →` estado temporal correspondiente (suite 257 §3).
- Una configuración existente se proyecta a su **Initial Occurrence** sin duplicar alerta, sin
  modificar `alertConfigurations[]`, sin cambiar `AlertConfiguration`/Resolver.

## 10. Persistencia — frontera explícita
`alertConfigurations[]` **= SSOT de configuración** (persistente). `OccurrenceLedger` =
**estado transitorio in-memory de completion**. El Ledger NO es persistencia definitiva de
ocurrencias; persisten bytes futura queda fuera del alcance y **NO** se certifica terminada.

## 11. Funcionalidad deliberadamente NO certificada (future extensions)
Persistence / Durable Occurrence History / Global Center / Global Alert Center / Advanced
Search / Cross-module alert search / Notifications / Advanced notification orchestration /
Escalation / Advanced timezone & calendar semantics. — **futuras, no defectos de 257**.

## 12. Resultado arquitectónico
```
              SGC-DM ALERT DOMAIN
                      │
                      ▼
            Alert Configuration (SSOT)
                      │
                      ▼
              Existing Resolver
                      │
                      ▼
              Existing Runtime
                      │
                      ▼
              Occurrence Domain
          ┌────────┼────────┬────────┐
          ▼        ▼        ▼        ▼
      Schedule  Lifecycle  Completion (ledger transiente)
          └────────┼────────┘
                   ▼
             Occurrence State (proyección derivada)
                   │
          ┌────────┴────────┐
          ▼                 ▼
     Module Monitoring  Future Alert Center
```

## 13. Estado después de Sprint 257-CERT

Línea de alertas:
`254 Audit ✅ · 255 Architecture Audit ✅ · 256 Contract Design ✅ · 256-CERT Design Cert ✅ ·
257 Implementation ✅ · 257-HF1 Runtime Hardening ✅ · 257-CERT Impl. Cert → FINAL ✅`

Conceptualmente: **ALERT OCCURRENCE INFRASTRUCTURE — STABLE / CERTIFIED — FUTURE EXTENSION**.
Alertas entra en estado **CERTIFIED / DEFERRED FOR EXTENSION (HOLD)**. Prioridad del producto
pasa a: **Operational Stabilization → Module Migration → Real Records/Documents/Workflows →
Real Operational Needs → Future Alert Extensions**.

---
**Status:** Sprint 257-CERT — CERTIFIED. Sin cambios de código en esta Sprint (working tree
limpia salvo este documento). Sin commit automático.