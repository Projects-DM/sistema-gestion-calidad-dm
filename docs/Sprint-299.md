# Sprint 299 — Forensic Completion Flow & Live Reconciliation Audit

Rama: `release/stable-sprint79`
Modo: AUDIT ONLY · LEVEL 5 · FORENSIC RUNTIME VALIDATION
Fecha: 2026-08-12
Tipo: Auditoría ejecutable — SIN cambios funcionales
Dependencias: Sprints 257 · 280 · 284 · 289 · 290 · 291 · 292 · 294 · 295 · 296 · 297 · 298

## Objetivo

Determinar con evidencia ejecutable por qué una alerta que debería desaparecer
después de diligenciar un formulario o subir un documento **continúa visible**,
validando el pipeline completo desde la acción real del usuario hasta la
proyección y presentación final:

```
ACCIÓN REAL → EVENTO DE COMPLETION → BRIDGE → LEDGER → PERSISTENCIA DEL HECHO
→ PROYECCIÓN → ESTADO DE ALERTA → PRESENTACIÓN
```

Este sprint **NO corrige** nada: solo establece la frontera exacta de pérdida y
produce el contrato para el Sprint 300.

Suite: `node scripts/sprint-299-forensic-completion-flow-audit.mjs`

## Resultado

**TOTAL: 80/80 PASS** · `process.exit(0)` · Sweep completo de la familia sin
regresiones (266/267 mantienen únicamente sus 2 checks pre-existentes de la
CompletionSignal genérica, fuera de alcance).

## Matriz de resultados por fase

| Fase | Verificación | Resultado | Evidencia |
|---|---|---|---|
| F01 | Form publica `COMPLETION_INTENT` SOLO tras `await submitFormResponse` | PASS | publish@9254 > submit@8208 |
| F01 | Path de error/`catch` del form NUNCA publica | PASS | sin publish tras último catch |
| F01 | Guardrail: sin configuración de alerta → SIN publicación | PASS | `hasAlerts` |
| F01 | `origin='alert'` (llegada desde tarjeta) y `origin='resource'` | PASS | branch explícito |
| F02 | Viewer publica SOLO tras `await uploadRecord` | PASS | publish@10847 > upload@9965 |
| F02 | Upload fallido → NO event (sin optimistic completion) | PASS | post-último-catch vacío |
| F02 | Ownership: categoría CON config → `documentCategory`; SIN config → `documentRepository` | PASS | else-if exactamente una emisión |
| F02 | AC-07/08: completion de categoría OWN completa SOLO esa categoría | PASS | own=true repo=false |
| F02 | AC-03/09: categoría heredada atribuye al Repository; repo no satisface categoría propia | PASS | repo=true catOwn=false |
| F03 | Bus entrega al bridge ANTES del runtime tick (orden seguro) | PASS | tickRecorded=true |
| F03 | 1 evento → 1 hecho registrado; intent lleva origin/kind/id/module | PASS | ledger size=1 |
| F03 | RACE CONDITION documentada: invirtiendo el orden de suscripción el tick ve ledger vacío | PASS | REACTIVITY_MARGIN |
| F04 | Intents malformados rechazados; `origin='alert'` sin identidad → NUNCA adivina | PASS | null |
| F04 | `origin='resource'` resuelve AT MOST ONE (A); sin candidatos → NO COMPLETION | PASS | specific key única |
| F05 | Selección determinista A (hoy, dueAt menor) → B → (C upcoming no elegible) | PASS | nunca A+B+C |
| F06 | Identidad final `occurrence::<alertId>::<occurrenceId>`; N → N+1 por período | PASS | occ:1 → occ:2 (daily/weekly/monthly/yearly) |
| F06 | AC-18: próxima ocurrencia DERIVADA, nunca persistida | PASS | completion=null en N+1 |
| F07 | Idempotencia: misma identidad dos veces → UN solo hecho lógico (AC-27) | PASS | size=1 |
| F08 | `recordCompletion → persistencePort.writeSignal` (fact conservado) | PASS | persisted=1 |
| F08 | Refresh → `hydrateFromPersistencePort()` → completed sigue true | PASS | sin PERSISTENCE_FAILURE |
| F09 | Tras completion: proyección reconoce COMPLETED → `hasOpen=false` | PASS | open=0 |
| F09 | Día siguiente: nueva ocurrencia DERIVADA vuelve a estar abierta | PASS | hasOpen=true |
| F10 | Runtime cablea el bridge ANTES de suscribir el tick (mismo effect) | PASS | bridge@23667 < tick@24186 |
| F10 | El tick invalida el memo (deps incluyen `completionTick`); solo invalida, no duplica motor | PASS | — |
| F10 | AC-16/17: inmediatamente tras publish la re-proyección tiene hasOpen=false (sin refresh manual) | PASS | false |
| F11 | Presentación NUNCA decide por sí misma: `return null` cuando `present!==true` o schedule vacío | PASS | consumo puro |
| F11 | AC-25/26: sin segunda fuente de verdad (no justUploaded, no display:none) | PASS | — |
| F12 | Caso 1: complete A → A=completed, B=open, C=open | PASS | exactly one fact |
| F12 | Caso 2: tras A → complete B → A=completed B=completed C=open | PASS | — |
| F12 | Caso 3: una acción NUNCA completa A+B+C | PASS | size=1 |
| F13 | DIARIO / SEMANAL / MENSUAL / ANUAL: completar el período → desaparece; período siguiente → aparece nueva | PASS | seq 1→2 |
| F13 | Mensual es CALENDARIO (jul15→ago15=31d, ago15→sep15=31d, sep15→oct15=30d), nunca 30 días fijos | PASS | calendarAddMonths ≡ ventanas |
| F14 | now<dueAt→today; now===dueAt→today; now>dueAt→overdue | PASS | OCC-CERT-08 |
| F14 | Completion DENTRO de ventana casa; FUERA (after dueAt) NO casa; acción antes del inicio → NO completion | PASS | — |
| F15 | Emisores de `COMPLETION_INTENT` = EXACTAMENTE DynamicForm + ModuleDocumentViewer | PASS | scan estático src/ |
| F15 | Fallo / cancelación / validación → NO completion (no optimista) | PASS | ordering estático |

## Root Cause Classification

```
ROOT CAUSE:
  NO SE ENCONTRÓ UN DEFECTO ACTIVO EN EL PIPELINE CERTIFICADO
  (ACCIÓN→EVENTO→BRIDGE→LEDGER→PERSISTENCIA→PROYECCIÓN→ESTADO→PRESENTACIÓN).

  La alerta que vuelve a verse después de diligenciar/subir es la PRÓXIMA
  OCURRENCIA DERIVADA (§7) — comportamiento esperado, no un fallo.

EVIDENCE:
  scripts/sprint-299-forensic-completion-flow-audit.mjs — F01..F15 verdes;
  F09/F10/F13 demuestran hasOpen=false en la MISMA sesión y reaparición por
  nueva ventana (diaria/semanal/mensual/anual).

IMPACT:
  Form / Repository / Category: NINGUNO hoy.

  - F01/F02  emisores reales existen (nunca anticipados, nunca en fallo)
  - F03      bus entrega en orden
  - F04/F05  bridge + resolver: AT MOST ONE, determinista
  - F07      ledger idempotente por identidad
  - F08      hecho conservado y rehidratado tras refresh
  - F09      proyección: hasOpen=false
  - F10     re-proyección en la misma sesión (sin refresh manual)
  - F11      presentación consume estado proyectado y se oculta naturalmente

MINIMUM CORRECTION (Sprint 300):
  Sin corrección funcional exigida por la evidencia. Recomendaciones
  contingentes (no bloqueantes):

  1. ENDURECER wireCompletionBridge — el flag global `wired` NO re-suscribe
     cuando el bus se limpia (evidencia F03/F10). Hoy nada limpia el bus → es
     REACTIVITY_MARGIN, no un defecto activo. Hardening: re-suscripción
     idempotente derivada del estado REAL de los listeners, no de un flag.
  2. OPCIONAL — omitir las claves identidad `alertId/occurrenceId` con valor
     null de la CompletionSignal genérica: cierra los checks pre-existentes de
     Sprint 266/267 y evita transportar identidad falsa en el borde
     EMITTER→BRIDGE.
  3. OPCIONAL — prueba E2E UI-level del ocultado en la misma sesión (hoy
     garantizado por el orden de suscripción de un único dueño: useAlertRuntime).

OUT OF SCOPE (no tocado ni a corregir en Sprint 299):
  OccurrenceContract · occurrenceIdOf · OccurrenceSchedule · OccurrenceProjection
  · CompletionBridge · DeterministicCompletionResolver · OccurrenceLedger ·
  persistencia · UnifiedAlertResourcePresentation. Ninguna corrección funcional
  se realizó en este sprint.
```

## Clasificación de hallazgos

Cada check usa la taxonomía obligatoria: `EMITTER_FAILURE`,
`EVENT_BUS_FAILURE`, `BRIDGE_FAILURE`, `RESOLVER_FAILURE`, `IDENTITY_FAILURE`,
`LEDGER_FAILURE`, `PERSISTENCE_FAILURE`, `PROJECTION_FAILURE`,
`REACTIVITY_FAILURE`, `PRESENTATION_FAILURE`, `RECURRENCE_FAILURE`. Con 80/80
verde no hay fallos clasificables; el único hallazgo documentado es el margen de
reactividad descrito arriba (`REACTIVITY_MARGIN`), probado a propósito en F03.

## STOP list respetada

- No se modificó ningún archivo de `src/` en este sprint (solo se agregó la
  suite en `scripts/`).
- No se crearon schedulers, entidades `CategoryAlert`, tablas de ocurrencias ni
  lógica de completion en React.
- No se usó `display:none`, filtros visuales ni condiciones artificiales.
- No se alteró `UnifiedAlertResourcePresentation` ni la semántica del ledger.
- La persistencia no se tocó; si hubiera fallado el survival, este sprint la
  habría DOCUMENTADO como `PERSISTENCE RECONCILIATION FAILURE` — no ocurrió.