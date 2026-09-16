# Sprint 266 — Auditoría de Identidad de Cumplimiento Multi-Alerta (A/B/C)

**Branch:** `release/stable-sprint79` · **Modo:** AUDIT ONLY (0 cambios en `src/`)
**Evidencia:** `scripts/sprint-266-multi-alert-completion-identity-audit.mjs` — **22/22 PASS**

---

## Verdict

### G — Colapso de identidad multi-frontera (cadena completa)

Un único guardado de formulario marca **las 3 alertas** (A=08:00, B=14:00, C=20:00, diarias)
como **Cumplidas** porque la identidad **per-alerta** (`alertId`) se pierde en la **NAVEGACIÓN**
(STEP 4) y —aunque se conservara— es **irrecuperable** en el resto de la cadena:
la señal genérica del formulario (STEP 5–6), el bridge (STEP 7) y el ledger (STEP 8) son
**resource-scoped** (key `resourceKind::resourceId::moduleId`, sin dimensión de alerta). Con una
única señal depositada a las **21:30** (después del último ancla), las ventanas A/B/C de las 24h
lo contienen y `classifyOccurrence` clasifica las tres como `completed` (STEP 9–10).

La colisión es **temporal + de identidad**: el signal final es de *recurso* (por diseño,
Sprint 257) y las 24h residual de las 3 bandas coinciden a esa hora. **No es un bug de
configuración ni de la proyección**: es la semántica actualmente certificada de
"recurso completado". El criterio "una acción → un contexto de alerta → una ocurrencia
objetivo → una cumplida" **no es satisfacible** con el contrato actual.

---

## Evidencia del fixture (`scripts/sprint-266-multi-alert-completion-identity-audit.mjs`)

Escenario: formulario `temperature-form-001` (`dynamicForms`), 3 configs diarias
(A=08:00, B=14:00, C=20:00), anclas del mismo día. Señal `RESOURCE_COMPLETED` a las 21:30.

| Check | Resultado | Qué prueba |
|---|---|---|
| STEP 1 | PASS (3/3) | Config A/B/C usan `alertConfigIdOf(resourceId, idx)` → `resource:alert:0/1/2`, **distintos** |
| STEP 2 | PASS (5/5) | Runtime proyecta 3 `occurrenceId` **distintos** (`alert:0:occ`. :1, :2); mismo `resourceId`; key = contrato `occurrenceIdOf(alertId, seq)` |
| STEP 3 | PASS (2/2) | **La tarjeta conoce** `alertId`+`occurrenceId` por config; la acción `open-form` lleva SOLO `{action, resourceId}` |
| STEP 4 | PASS (2/2) | Navegación resuelve ruta canónica con `formSlug=resourceId`; **NO transporta** alertId/occurrenceId → **PRIMERA PÉRDIDA** |
| STEP 5 | PASS (2/2) | Publisher de DynamicForm emite `{resourceKind, resourceId, moduleId, completedAt}`; SIN alertId (nunca lo recibo de la ruta) |
| STEP 6 | PASS (2/2) | `createCompletionSignal` NO crea campos `alertId` ni `occurrenceId` (contract genérico, OCC-CERT-10) |
| STEP 7 | PASS (1/1) | `wireCompletionBridge` + `publish(RESOURCE_COMPLETED)` → **exactamente 1 señal** en el ledger |
| STEP 8 | PASS (2/2) | Una sola entrada del ledger satisface las **3** proyecciones (key `resourceKind::resourceId::moduleId`); sin dimensión per-alert |
| STEP 9 | PASS (1/1) | La misma señal matchea las ventanas A/B/C a las 21:30 (`matchCompletionToOccurrence`) |
| STEP 10 | PASS (2/2) | Observed: A/B/C = **completed** (collapse confirmado); primera pérdida en STEP 4 (Navegación) |

**Observado (21:30):** `{ "A": "completed", "B": "completed", "C": "completed" }`
→ esperado del criterio S7: solo `A=completed, B/C=PENDIENTES`.

---

## Cadenas de identidad (encontrar dónde se globaliza)

```
CONFIG      alertId = resource:alert:0|1|2            → DISTINTA por alerta (S1)
RUNTIME     occurrenceId = alertIdOf(s,res,idx)+:occ:+seq  → DISTINTA por alerta (S2)
CARD        la tarjeta SI conoce alertId/occurrenceId (S3)
NAVEGACIÓN  action.open-form → {moduleSlug, resourceId} → SE PIERDE alertId (S4) ★
DYNAMICFORM formSlug/moduleSlug (useParams) → publish sin alertId (S5)
SIGNAL      { resourceKind, resourceId, moduleId, completedAt } genérica (S6)
BRIDGE      inferSingleSignal → misma shape de recurso; registra 1 señal (S7)
LEDGER      key = resourceKind::resourceId::moduleId → 1 señal PARA TODO (S8)
MATCH       completedAt (21:30) dentro de ventanas A/B/C → las 3 satisfechas (S9)
CLASIF.     classifyOccurrence → A/B/C completed (S10)
```

---

## ROOT CAUSE (veredicto exigido por el Sprint)

**G — Múltiples límites colaboran de forma encadenada.** Los candidatos A–G
se confirman/descartan así sobre el fixture:

| Hipótesis | ¿Confirmada? | Evidencia |
|---|---|---|
| A. Pérdida en Navegación | **SÍ (primera pérdida)** | STEP 4: la ruta `open-form` sólo lleva `resourceId`; `occurrenceId` queda en la tarjeta pero jamás viaja |
| B. Pérdida en DynamicForm | **SÍ (secundaria)** | STEP 5: publisher genérico; el formulario no recibe contexto de alerta |
| C. Pérdida en CompletionSignal/Bridge | **SÍ** | STEP 6–7: señal y bridge son genericos/recurso, sin alertId |
| D. Pérdida en Ledger | **SÍ** | STEP 8: key sin alertId; una señal para todo el recurso |
| E. Ledger resource-scoped | **SÍ** | STEP 8: `resourceKind::resourceId::moduleId` |
| F. Matching por ventana múltiple | **SÍ** | STEP 9: una `completedAt` 21:30 cae en A/B/C |
| G. Multi-frontera encadenada | **VEREDICTO** | A→B→C→D→F: ninguna capa individual es "el bug"; el colapso exige que todas colaboren |

**Conclusión:** la identidad per-alerta existe en config y en runtime/card, pero se pierde
en la navegación y ningún componente posterior consume la dimensión de alerta para
**destinar o filtrar** el cumplimiento. Un sencillo campo `alertId`/`occurrenceId` en la
señal o en la clave del ledger resolvería el colapso (fuera del alcance de este Audit).

---

## Acceptance criteria (Sprint 266)

| Grupo | Estado |
|---|---|
| 1–2 Traza completa por cadena (config → runtime → card → ruta → form → signal → bridge → ledger → matching → clasificación) | PASS (22/22) |
| 3 Veredicto ROOT CAUSE certificado con evidencia | PASS (G confirmado) |
| 4 0 cambios en `src/` | PASS (`src/` intacto) |
| 5 Regresión Sprint 265 (fixture 15/15) | PASS |
| 6 `npm run build` → PASS | PASS |
| 7 Fixture `sprint-266-*` creado y PASS | PASS |

## Archivos auditados (read-only) y protegidos intocados
- `src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js` — `alertConfigIdOf`
- `src/core/capabilities/alert/occurrence/OccurrenceProjection.js` — runtime 3 occurrences, VO contract
- `src/core/capabilities/alert/occurrence/OccurrenceLedger.js` — key `resourceKind::resourceId::moduleId`
- `src/core/capabilities/alert/occurrence/CompletionSignal.js` — contrato genérico (no alert)
- `src/core/capabilities/alert/occurrence/CompletionBridge.js` — `wireCompletionBridge` + inferencia recurso-scoped
- `src/core/capabilities/alert/occurrence/OccurrenceLifecycle.js` — `classifyOccurrence` (OCC-CERT-08)
- `src/core/capabilities/alert/occurrence/OccurrenceContract.js` — `occurrenceIdOf`
- `src/core/navigation/ExistingModuleRouteResolver.js` — `resolveActionRoute('open-form')`
- `src/modules/experiences/AlertMonitoringExperience.jsx`, `src/pages/DynamicForm.jsx`, `src/hooks/useAlertRuntime.js` — **guardados, sin modificar**