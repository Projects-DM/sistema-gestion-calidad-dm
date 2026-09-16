# Sprint 265 — Ciclo de Vida de Cumplimiento de Formularios con Alertas

**Branch:** `release/stable-sprint79` · **Modo:** IMPLEMENTACIÓN + CERTIFICACIÓN
**Evidencia:** `scripts/sprint-265-form-alert-lifecycle.mjs` — **15/15 PASS** (12 escenarios)

---

## Verdict

Sprint 265 cierra la divergencia documentada en el Sprint 264: la experiencia de
monitoreo de alertas ya **no re-deriva** el estado temporal de los formularios desde
`remainingMs` (tiempo hasta el *próximo* target). Las tarjetas de **FORMULARIO** se
clasifican con el **clasificador certificado del dominio**
(`OccurrenceLifecycle.classifyOccurrence`, ventana `[startsAt, dueAt)` + precedencia
de cumplimiento), y el guardado de un formulario publica la señal final de recurso
(`RESOURCE_COMPLETED`) que el **CompletionBridge existente** registra en el
**OccurrenceLedger** (matching window-aware, OCC-CERT-12).

No se creó ningún EventBus, CompletionService, Scheduler, Store ni capa de persistencia
nueva: se **reutilizan** el bus, el puente y el ledger del Sprint 257. No se modificaron
los módulos de dominio `occurrence/**`.

---

## Cambios en `src/` (2 archivos)

| Archivo | Cambio |
|---|---|
| `src/modules/experiences/AlertMonitoringExperience.jsx` | FORMS clasifican vía `deriveFormState(enabled, occurrence, now)` → `classifyOccurrence` del dominio (import, sin duplicarlo); `derivedState` de `remainingMs` queda SOLO para repositorios (fuera de alcance); `projectConfigCards` ahora recibe `moduleSlug` para alinear la identidad `moduleId` con la proyección del runtime |
| `src/pages/DynamicForm.jsx` | Tras `submitFormResponse` exitoso → publica `RESOURCE_COMPLETED` con `{ resourceKind: 'dynamicForms', resourceId: formDef.id, moduleId: moduleSlug, completedAt, action: 'form_completed_form_saved' }` reutilizando `OperationalEventBus` + `RESOURCE_COMPLETED_EVENT` |

**Guardarrails verificados:** ningún archivo de `src/core/capabilities/alert/occurrence/**`
fue modificado; la UI consume el clasificador del dominio sin reconstruirlo; el
publisher usa el bus y el puente ya existentes (no hay servicio nuevo).

---

## Flujo final (Formulario → Ledger → UI)

```
submitFormResponse OK
  → OperationalEventBus.publish('RESOURCE_COMPLETED', { resourceKind, resourceId, moduleId, completedAt })
  → CompletionBridge (conectado en useAlertRuntime) → OccurrenceLedger.recordCompletion(signal)
  → (siguiente proyección) projectConfigCards → OccurrenceLedger.completionSignalFor(occurrence)
  → deriveFormState(enabled, { startsAt, dueAt, completion }, now) → classifyOccurrence
  → key: completed | cancelled | today | upcoming | overdue | active
  → presentación { label, color } vía STATUS_VISUAL (solo mapeo)
```

La identidad de registro es `resourceKind::resourceId::moduleId`. En el monitoreo el
`moduleId` de la ocurrencia proviene del item del formulario o del `moduleSlug` de la
ruta (alineado con la proyección del hook `useAlertRuntime`), de modo que la señal
emitida desde el formulario (`moduleId: moduleSlug`) matchea la misma clave en la
tarjeta.

---

## Evidencia del fixture (`scripts/sprint-265-form-alert-lifecycle.mjs`)

| Check | Resultado | Qué prueba |
|---|---|---|
| S1 | upcoming | Form único +30d → **Próxima** (no `active` por defecto) |
| S2 | today | Form diario dentro de la ventana → **Hoy** |
| S3 | overdue | Form único con ventana pasada y sin cumplimiento → **Vencida** |
| S4 | completed | Compleción **dentro** de la ventana → **Cumplida** |
| S5 | completed | Ocurrencia cumplida **nunca** vuelve a Vencida (OCC-CERT-08) |
| S6a/6b | completed / today | Recurrente: cumple en la ventana; la siguiente ventana sin señal → Hoy (nunca Vencida automática) |
| S7 | completed | Publish del form-save → ledger → clasificación **Cumplida** (end-to-end) |
| S8 | true | La navegación (`open-form`) NO registra cumplimiento por sí misma |
| S9 | disabled | `enabled:false` sin cumplimiento → **Deshabilitada** |
| S10a/10b | overdue / completed | Multi-alerta A/B: una señal del recurso cumple SOLO la ocurrencia cuya ventana la contiene |
| S11a/11b | 208800000 / true | Idempotencia: entregas repetidas conservan la última `completedAt`; sigue **Cumplida** |
| S12 | completed | Cumplida al día siguiente sigue **Cumplida** (nunca Vencida) |

`node scripts/sprint-265-form-alert-lifecycle.mjs` → **Resultado: 15/15 PASS**.

---

## Acceptance criteria

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| AC-01 | La UI usa la semántica temporal certificada (por ventana) para formularios | PASS | `deriveFormState` → `classifyOccurrence` (`OccurrenceLifecycle.js`) |
| AC-02 | El formulario ya no se decide por `remainingMs`/target próximo | PASS | `deriveFormState` no consume `remainingMs`; `derivedState` solo repos |
| AC-03 | La UI solo mapea estado → label/color (presentación) | PASS | `STATUS_VISUAL[domain.key]` |
| AC-04 | Ventana terminada cumplida → **Cumplida** (nunca Vencida) | PASS | S5, S12 (OCC-CERT-08) |
| AC-05 | Ventana terminada sin cumplir → **Vencida** | PASS | S3, S10a |
| AC-09 | Guardar el formulario en la ventana registra `resourceId` + `completedAt` + ventana | PASS | DynamicForm publisher + S7 |
| AC-15 | Guardar el formulario completa la ocurrencia correspondiente del recurso | PASS | S7 end-to-end |
| AC-16 | Efectividad window-aware de la señal | PASS | S10a/10b (fuera: NO; dentro: SÍ) |
| AC-18 | Multi-alerta A/B: completar una no marca la otra fuera de ventana | PASS | S10a/10b (ledger por ventana) |
| AC-19 | La señal incluye `resourceKind` + `resourceId` + `moduleId` + `completedAt` | PASS | Payload del publisher + `inferSingleSignal` |

---

## Notas y limitaciones

- El ledger es **in-memory y no reactivo** (limitación del Sprint 257): la tarjeta
  refleja “Cumplida” en la siguiente proyección/re-render, no por suscripción en vivo.
- La independencia A/B es **por ventana**: si dos alertas del mismo recurso tienen
  ventanas solapadas, una sola señal puede marcar ambas; si no se solapan, solo la
  ocurrencia cuya ventana contiene `completedAt` queda cumplida (DEC-263-06, Sprint 264).
- Los **repositorios** conservan su clasificador legacy `derivedState` (Sprint 257);
  quedan fuera del alcance del Sprint 265 (solo FORMS migraron a la semántica del
  dominio).