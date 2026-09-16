# Sprint 264 — Auditoría de Ciclo Temporal, Vencimiento y Cumplimiento de Alertas

**Branch:** `release/stable-sprint79` · **Modo:** AUDIT ONLY (0 cambios en `src/`)
**Evidencia:** `Temp\opencode\sprint-264-alert-temporal-completion-audit.mjs` — **40/40 PASS**

---

## Verdict

### D — Divergencia de Clasificación Temporal (Presentation vs Domain)

La cadena temporal y de cumplimiento del dominio (Sprint 257) es **correcta y certificada**:
`classifyOccurrence` (window `[startsAt, dueAt)`), ledger keyed por identidad de *recurso*,
matching de completado **window-aware** e idempotente. **PERO** la experiencia de monitoreo
(`AlertMonitoringExperience.jsx:135` `derivedState`) NO consume ese clasificador: re-deriva el
estado a partir de `remainingMs` (tiempo hasta el *próximo target*), lo que produce
**divergencias controladas** en la clasificación presentada.

No hay pérdida de datos ni regresión de ejecución; hay **dos clasificadores semánticamente
distintos** (uno solo en presentación, no certificado). Las "Vencidas" nunca aparecen para
alertas recurrentes (solo para 'once' con anchor en pasado).

### Evidencia clave del fixture (`Temp\opencode\sprint-264-alert-temporal-completion-audit.mjs`)

| Check | Resultado | Qué prueba |
|---|---|---|
| A1–A6 | PASS | `computeTarget` siempre ≥ now para recurrentes; ventana `[start,dueAt)` cubre mid-window |
| B1–B3 | PASS | Once a +30 días: DOMINIO=`upcoming`, UI=`active` (**DIVERGENCE**) |
| B10–B12 | PASS | Weekly EN ventana: DOMINIO=`today`, UI=`active` (remaining ~6d > 72h) (**DIVERGENCE**) |
| B7,B13,B14 | PASS | UI con recurrente **NUNCA** alcanza `overdue` (remaining siempre ≥ 0); salta a Próxima/Hoy |
| C1–C6 | PASS | `classifyOccurrence` precedence completa: completed/cancelled → overdue → today → upcoming → active |
| D1–D7 | PASS | Compleción **window-aware** (in-window sí, out-of-window NO); idempotente; key = `resourceKind::resourceId::moduleId` (**sin alertId**) |
| E1–E5 | PASS | A/B del mismo recurso → 2 `occurrenceId` distintos; **una** signal de recurso completa **AMBAS** (identity collapse por recurso; `navigation ≠ cumplimiento`) |

### Recomendaciones (fuera del alcance, ajustables en `AlertMonitoringExperience.jsx`)
1. Consumir `classifyOccurrence`/el ciclo del dominio en `derivedState` para que la vista use un
   único clasificador (unificar `Hoy/Próxima` por window, no por remaining del *target próximo*).
2. Decidir semánticamente la identidad de completion para multi-alerta: hoy un signal de recurso
   cierra A y B a la vez (OK si "recurso completado" es el criterio; no OK si A/B son informes
   independientes). DEC-263-06 mantiene identidad por config en persistencia; el ledger aún es
   resource-scoped (Gate E/G del Sprint-257).
3. `occurrences` de `useAlertRuntime` ya provee el VO certificado (línea 526); la experiencia aún
   destruye solo `{ existing }` (línea 358) y relega el complejo al presente clasificador.

## Acceptance criteria (24)
| Grupo | Estado |
|---|---|
| 1–6 Anchor/Target (once, diario, semanal; sin anchor → reject) | PASS |
| 7–14 Clasificación temporal (future/today/overdue; recurrente rueda al próximo target) | PASS (divergencia documentada 7/14) |
| 15–20 Compleción (in-window, out-of-window, idempotente, resource-key) | PASS |
| 21–24 Multi-alert A/B + Guardrails (0 mods en `src/`) | PASS |

## Archivos de dominio auditados (read-only)
- `src/core/capabilities/alert/occurrence/OccurrenceSchedule.js` — `parseAnchor` / `cadenceMs` / `computeTarget` / `occurrenceWindowAt`
- `src/core/capabilities/alert/occurrence/OccurrenceLifecycle.js` — `classifyOccurrence` (precedence OCC-CERT-08)
- `src/core/capabilities/alert/occurrence/OccurrenceProjection.js` — `resolveOperational` → `resolveResourceAlertCollection`, VO contract (HF1 gate)
- `src/core/capabilities/alert/occurrence/OccurrenceLedger.js` — store in-memory no reactivo; key `resourceKind::resourceId::moduleId`
- `src/core/capabilities/alert/occurrence/CompletionSignal.js` — signal genérico `{resourceKind, resourceId, moduleId, completedAt}`
- `src/core/capabilities/alert/occurrence/CompletionBridge.js` — escucha `RESOURCE_COMPLETED` / `RECORDS_STATUS_UPDATED` / `RECORDS_APPROVED` / `RECORDS_CLOSED`
- `src/hooks/useAlertRuntime.js:508-526` — expone `occurrences` (proyección certificada) pero la UI no la consume
- `src/modules/experiences/AlertMonitoringExperience.jsx:135-146` — clasificador de presentación `derivedState`
