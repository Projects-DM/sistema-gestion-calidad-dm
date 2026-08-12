# Sprint 297 — Durabilidad del Completion de Ocurrencias (Repository + Category)

Rama: `release/stable-sprint79`
Modo: CONTROLLED · LEVEL 5 (el ledger conserva; el dominio sigue siendo la autoridad)
Dependencias: Sprint 257 · 280 · 289 · 290 · 291 · 292 · 294 · 295 · 296

## Contexto (Sprint 296)

La auditoría forense certificó dos brechas reales (F4/F5 y F12) con evidencia
ejecutable en `scripts/sprint-296-alert-occurrence-completion-recurrence-audit.mjs`:

1. **GAP F4/F5** — `documentRepository` y `documentCategory` podían PROYECTAR su
   ocurrencia actual, pero NO existía ninguna acción real que la completara.
2. **F12** — el `OccurrenceLedger` era 100% in-memory: tras un refresh/recarga
   los hechos de completion se perdían.

Este sprint implementa exactamente el "cambio mínimo recomendado" por el 296:
el emisor único controlado desde la acción real de cumplimiento y el port de
persistencia durable del ledger (OCC-CERT-30), sin tocar bridge ni runtime de
completion.

## Qué cambió (mínimo, sin duplicar el motor)

```
PDF upload (ModuleDocumentViewer.handleUpload)
        │  await documentsService.uploadRecord(...)   ← confirmado ANTES
        ▼
OperationalEventBus.publish(COMPLETION_INTENT_EVENT)   ← SOLO tras éxito (AC-03)
        │  exactly UNA, según OWNERSHIP del recurso:
        │    categoría CON config propia        → { resourceKind:'documentCategory',  resourceId: category.id }
        │    categoría SIN config propia        → { resourceKind:'documentRepository', resourceId: repository.id }
        ▼
CompletionBridge (handleCompletionIntent, origin='resource') → DeterministicCompletionResolver → AT MOST ONE
        ▼
OccurrenceLedger.recordCompletion   ──write-through──▶  persistencePort (durable, localStorage)
                                                              (conserva hechos, jamás decide)
boot (main.jsx)  ▶  bootDurableOccurrenceLedger()  ▶  registerPersistencePort + hydrateFromPersistencePort()
                                                                  (refresh / recuperación: replay idempotente)
```

### 1. Puertos de persistencia — `occurrence/persistence/OccurrenceLedgerPersistencePort.js`

- Contrato formal de 3 operaciones (map-like, misma clave que el ledger):
  `readSignals()`, `writeSignal(signal)` (idempotente por la clave derivada de
  identidad `occurrence::<alertId>::<occurrenceId>`), `clearSignals()`.
- `createInMemoryOccurrenceLedgerAdapter()` — referencia portátil (tests).
- `createDurableOccurrenceLedgerAdapter({ storage })` — localStorage-backed;
  storage inyectable (tests). Escribe SOLO hechos; NUNCA la próxima ocurrencia
  (AC-18: la recurrencia sigue derivada).
- `hasOccurrenceLedgerPersistencePort(port)` — validación del contrato.

### 2. Ledger con port opcional — `OccurrenceLedger.js`

- `registerPersistencePort(port)` / `unregisterPersistencePort()` (idempotente).
- `recordCompletion` hace WRITE-THROUGH al port (best-effort: un port fallando
  jamás rompe el camino de negocio; se loguea una vez).
- `hydrateFromPersistencePort()` — replay de hechos persistentes al boot;
  idempotente por identidad (OCC-CERT-13). Por defecto el ledger sigue
  in-memory/non-reactive y NO importa ningún storage (retrocompatible total).

### 3. Boot durable — `persistence/OccurrenceLedgerDurableBoot.js` + `main.jsx`

- `bootDurableOccurrenceLedger()` llamado UNA vez en `main.jsx`: registra el
  adapter durable y rehidrata. Idempotente (StrictMode / hot-reload safe).
- El ledger sigue siendo LA autoridad; el boot solo conserva + rehidrata.

### 4. Emisores reales — `modules/documentViewer/ModuleDocumentViewer.jsx`

- `categoryOwnsAlertConfiguration(category)` — la MISMA puerta de ownership que
  ya usaba la UI para decidir el estado de la categoría (Override vs fallback,
  Sprint 294/295); ahora compartida para la atribución del completion.
- En `handleUpload`, DESPUÉS de `await documentsService.uploadRecord(...)`:
  - categoría CON config propia → emite `documentCategory` con `category.id`.
  - categoría SIN config propia → emite `documentRepository` con
    `repository.id` (la acción cubre la alerta del repositorio por herencia).
  - **EXACTAMENTE UNA emisión por upload** (rama if/else): esto preserva AC-15
    (Category no afecta Repository) y AC-16 (Repository no afecta Category).
- ERROR en el upload (catch) → NO hay emisión (nunca optimista, AC-03).
- `completedAt` se omite a propósito: el bridge lo estampa en `Date.now()` en el
  publish (misma semántica, emisión pura, sin `Date.now()` en render).

### 5. Reactividad de presentación — `hooks/useAlertRuntime.js`

- El ledger es NON-REACTIVE por diseño (limitación documentada Sprint 257). Tras
  un completion, las ocurrencias debían re-proyectarse para que la alerta se
  oculte EN LA MISMA sesión (AC-03).
- `useAlertRuntime` suscribe un `completionTick` a `COMPLETION_INTENT_EVENT`
  (presentation-only). Como el bridge se suscribe PRIMERO (mismo efecto), el
  hecho queda registrado antes del tick → la proyección certificada re-deriva
  (lee el ledger en vivo) y `projectResourceAlertState` devuelve `hasOpen=false`
  → la tarjeta se oculta (Regla B). NO hay motor de completion duplicado: el
  bridge registra, la proyección deriva, el hook solo invalida un memo.

## Certificación

`node scripts/sprint-297-durable-occurrence-persistence.mjs` → **38/38 PASS**.

| AC | Check |
|---|---|
| AC-01 | documentRepository SÍ emite completion (upload → acción real) |
| AC-02 | documentCategory SÍ emite completion (upload a categoría propia) |
| AC-03 | completion SOLO tras confermar el upload; en el catch NO emite; la alerta se oculta en la misma sesión |
| AC-11 | refresh: hecho persistido → rehidrata → la ocurrencia SIGUE COMPLETED y la alerta sigue oculta |
| AC-12 | puerto dual-capacity: port fallando no rompe el ledger; port válido conserva (write-through) |
| AC-13 | `clear()` limpia SOLO memoria; `clearSignals()` vacía el durable store |
| AC-14 | Category A completada → Category B NO se satisface |
| AC-15 | Category completada → Repository NO se satisface |
| AC-16 | Repository completado → Category A NO se satisface |
| AC-17 | la identidad NO se reconstruye: el emisor no lleva alertId/occurrenceId; la clave sigue `occurrence::<alertId>::<occurrenceId>` de la proyección |
| AC-18 | el port guarda solo FACTS; la recurrencia/ventana sigue derivada (nunca `nextAt`) |

## STOP list respetada

- No se creó `CategoryAlert` ni identidad de alerta de categoría.
- No se tocó `OccurrenceContract` / `occurrenceIdOf` / el schedule.
- El bridge y el motor de completion no se duplicaron dentro de
  Repository/Category (el emisor solo publica un `COMPLETION_INTENT`).
- La durabilidad es un PORT del ledger: bridge/runtime/consumidores no cambiaron
  de contrato (OCC-CERT-30).
- Nada de ocultar alertas desde React por lógica local: se ocultan porque la
  proyección certificada devuelve `hasOpen=false`.