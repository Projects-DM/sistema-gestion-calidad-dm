# Sprint 304 — Live Completion Visual Reconciliation Forensic Audit

Rama: `release/stable-sprint79`
Modo: AUDIT ONLY · LEVEL 5 · FORENSIC RUNTIME VALIDATION — SIN cambios funcionales
Fecha: 2026-08-12
Tipo: Auditoría ejecutable con clasificación forense única al final
Dependencias: Sprints 296 · 297 · 299 · 300 · 301 · 302 · 303
Suite: `node scripts/sprint-304-live-completion-visual-reconciliation-forensic-audit.mjs`

## Objetivo

Los Sprints 296–303 certificaron que el pipeline de completion (Bridge → Ledger →
Projection → Reactivity → Presentation) es funcionalmente sano y que el bug
`require is not defined` (Corregido en 303) NO toca esa frontera. Sin embargo la
**alerta permanece visualmente ABIERTA** tras completar un formulario (o subir un
documento) en el workspace real. Sprint 304 es AUDIT ONLY forense para localizar
la frontera causal exacta con evidencia ejecutable VIVO (módulos y fuentes reales,
no simulados).

## Resultado

**TOTAL: 63/66 PASS** · `process.exit(0)` · sin correcciones aplicadas.

Los 3 FAIL son **las 3 verificaciones que DOCUMENTAN el defecto** (todas en el
caso FORM directo, `origin='resource'`):

| # | Verificación | Resultado | Significado |
|---|---|---|---|
| F05 | `[FORM] ledger registra un hecho nuevo` | FAIL `size=0` | el CompletionBridge descarta el intent → NUNCA escribe el Ledger |
| F05 | `[FORM] clave occurrence::… estable` | FAIL | no hay señal → no hay clave |
| F06 | `[FORM] hasOpen TRUE→FALSE` | FAIL `before=true after=true` | la proyección sigue viendo la alerta abierta |

Todas las demás fases son PASS, incluido el **caso REPOSITORIO** (F05/F06/F10:
ledger=1, hasOpen=false), que demuestra que el pipeline COMPLETO funciona cuando
la identidad del intent coincide. No hay discrepancias de script: 296 (exit=0),
297 (exit=0), 299 (80/80), 300 (65/65), 301 (53/53), 302 (semántica
NO_ACTIVE_FAILURE), 303 (53/53).

## Clasificación forense final

```
SPRINT 304 — FINAL FORENSIC CLASSIFICATION
  FIRST FAILED BOUNDARY: [06] CompletionBridge   (caso FORM directo)
  ROOT CAUSE:            EVENT_BRIDGE_FAILURE · COMPLETION_INTENT publicado pero
                         SIN haber en el Ledger
  HIPÓTESIS:             H02 CONFIRMADA · H04 (vía identidad) · H10 CONFIRMADA
                         H11 DESCARTADA · H12 DESCARTADA
```

**Mecánica exacta:** `DynamicForm` publica `COMPLETION_INTENT` con
`moduleId: moduleSlug` (STRING, p.ej. `'operaciones'`), pero su `useAlertRuntime`
registra el provider de proyección con `moduleId: formDef?.module_id ?? null`
(**NUMÉRICO**, p.ej. `3`). El bridge (`handleCompletionIntent`, rama
`origin='resource'`) filtra `String(occ.moduleId) === String(intent.moduleId)` →
`'3'` vs `'operaciones'` → `false` → **descarta todas las ocurrencias** → retorna
`null` → **NUNCA escribe el Ledger**. La UI (proyección pura) nunca recibe
completion → la alerta permanece abierta.

**Respuesta a las preguntas del criterio de salida:**

| # | Pregunta | Verdict |
|---|---|---|
| 1 | ¿`COMPLETION_INTENT` se publica tras el SUCCESS SaaS? | **YES** — DynamicForm tras `submitFormResponse`, fuera del catch (F01). |
| 2 | ¿El EventBus entrega el evento a UN handler efectivo? | **YES** — F03 (runs=1, idempotente, sin duplicados). |
| 3 | ¿El Bridge recibe el evento y resuelve identidad? | REPO/CATEGORY: **YES** · FORM directo: **NO** — mismatch moduleId slug vs numérico → null (F04/F06/F10). |
| 4 | ¿El Ledger registra el hecho? | REPO/CATEGORY: **YES** · FORM directo: **NO** — size=0 (F05). |
| 5 | ¿La proyección pasa a `hasOpen=false` en la misma sesión? | FORM directo: **NO** (before=true after=true). Con contrafactual F10 (identidad resuelta) SÍ (F06/F15). |
| 6 | ¿La UI recibe el nuevo estado? | **NO existe tal estado** (nunca se escribió). Con el escribir se ocultaría (F11/F09). |
| 7 | ¿El origen es Projection / tick / React / Presentation? | **NO** — contrafactual F10 lo prueba: el MISMO world+código cierra la alerta cuando la identidad del intent coincide (F15). |
| 8 | ¿Algún hack visual lo fuerza? | **NO** — sin justUploaded/completedLocal/display:none/reload/forceUpdate (F12 10/10). |

## Matriz de resultados por fase

| Fase | Verificación | Resultado | Evidencia |
|---|---|---|---|
| F01 | FORM: submitFormResponse → activate → publish tras SUCCESS, fuera del catch; payload conserva origin/resourceKind/resourceId/moduleId/completedAt; rama alert conserva alertId/occurrenceId | PASS 7/7 | blocks=2 |
| F01 | **[FORENSE]** DynamicForm publica `moduleId: moduleSlug` (STRING) y registra hook con `moduleId: formDef.module_id` (NUMÉRICO) | PASS | mismacth confirmado en fuente |
| F02 | REPO: uploadRecord antes del publish; resourceKind/resourceId/moduleId reales; categorías heredan repository owner | PASS 8/8 | |
| F02 | **[FORENSE]** MDV usa module/moduleSlug SIN moduleId numérico → provider STRING = intent STRING | PASS | |
| F03 | Bus: 1 delivery por evento; wire idempotente (hasListener); sin duplicados del mismo handler | PASS 3/3 | runs=1 |
| F04 | Bridge separa origin=alert (explícito) de origin=resource (resolución); filtra resourceKind+resourceId+moduleId exactos; null → NO COMPLETION | PASS 3/3 | |
| F05 | `[FORM]` ledger registra hecho | **FAIL size=0** | **BOUNDARY** |
| F05 | `[REPO]` ledger registra hecho | PASS size=1 | aislado en F10 |
| F06 | `[FORM]` hasOpen TRUE→FALSE | **FAIL** before=true after=true | alerta persiste |
| F06 | `[REPO]` hasOpen TRUE→FALSE | PASS | before=true after=false |
| F07 | completionTick→setCompletionTick; memo depende de completionTick; nueva referencia re-ejecutada; proyección re-lee ledger | PASS 4/4 | |
| F08 | Consumers reciben nueva referencia; proyectan vía projectResourceAlertState; sin memo congelante ([]); selector puro | PASS 4/4 | |
| F09 | Presentación recibe estado real; hasOpen=false no se re-transforma; schedule excluye completed/cancelled; returns null | PASS 4/4 | |
| F10 | FORM real (intent SLUG vs provider NUMÉRICO) → **ledger=0** · FORM contrafactual (mismo moduleId) → **ledger=1** · REPO real (SLUG≈SLUG) → **ledger=1** | PASS 3/3 | **aislamiento del boundary** |
| F11 | N completada→hasOpen=false hoy; N+1 re-derivada→open mañana | PASS 2/2 | N=false N+1=true |
| F12 | Sin hacks visuales (justUploaded/completedLocal/display:none/forceRefresh/reload/forceUpdate); UI solo depende de proyección | PASS 10/10 | |
| F13 | Regresión 303: require=0; sin dynamic import; instanciación ESM real sin ReferenceError | PASS 3/3 | |
| F14 | Traza E2E de 12 pasos: FIRST FAILED BOUNDARY = `[06] CompletionBridge` | PASS | moduleId occ=3 vs intent=operaciones |
| F15 | Clasificación: H02 condicionada, H10 confirmada, H11/H12 descartadas; NO es fallo de Projection/tick/React/presentation | PASS 2/2 | contrafactual F10 |
| F16 | Único src/ modificado = RuntimePersistenceProviderCompositionRoot.ts (legítimo 303) | PASS | git status src/ |
| F17 | Familia: 296 exit=0, 297 exit=0, 299 80/80, 300 65/65, 301 53/53, 302 semántica, 303 53/53 | PASS 7/7 | |

## Traza del fallo (F14 — caso FORM directo)

```
[01] USER ACTION                                   PASS  submit real del formulario (SaaS)
[02] SaaS SUCCESS                                  PASS  submitFormResponse persistido OK
[03] Runtime activation                            PASS  303 sanado · sin ReferenceError
[04] COMPLETION_INTENT                             PASS  publicado tras SUCCESS (DynamicForm)
[05] EventBus delivery                             PASS  handler único ejecutado (F03)
[06] CompletionBridge                              FAIL  moduleId occ=3 vs intent=operaciones → sin match → null   ← PRIMERA FRONTERA FALLADA
[07] Ledger                                        FAIL  size=0 (nunca se escribe)
[08] Projection                                    FAIL  hasOpen=true (no tiene el haber)
[09] completionTick                                PASS  tick subscrito (no es causal)
[10] React reconciliation                          PASS  deps reales (no es causal)
[11] Presentation                                  FAIL  state.present=true (todavía alerta)
[12] Visual state                                  FAIL  UI muestra la alerta como ABIERTA tras completion real
```

Los FAIL [02]..[12] son **síntomas descendentes** del único boundary causal [06]:
ninguna proyección/render puede reflejar lo que nunca entró al Ledger.

## Evidencia de aislamiento (F10)

```
FORM  real          → intent moduleId=SLUG vs provider NUMÉRICO → Ledger=0 → alerta ABIERTA
FORM  contrafactual → mismo moduleId (numérico) en ambos lados → Ledger=1 → alerta cerrada
REPO  real          → intent moduleId=SLUG vs provider SLUG     → Ledger=1 → alerta cerrada
```

El MISMO `world`, el MISMO código de proyección, presentación y Reactivity
producen hasOpen=false cuando la identidad del intent coincide. Esto **prueba** que
las capas aguas abajo son capaces y que la única discordancia está en el
`CompletionBridge` resolviendo identidad de module del FORM.

## Por qué el REPOSITORIO funciona y el FORM (directo) no

- **REPO (ModuleDocumentViewer):** llama `useAlertRuntime({ module: moduleSlug, moduleSlug })` SIN `moduleId` numérico → el provider cae al branch STRING (`base.moduleId ?? moduleSlug ?? module`) → `projectCurrentOccurrences` proyecta contra `module=moduleSlug`; y publica `moduleId: moduleSlug` → STRING≈STRING → el bridge resuelve. ✓
- **FORM (DynamicForm):** llama `useAlertRuntime({ moduleId: formDef?.module_id, ... })` (numérico) → el provider usa `base.moduleId` numérico; pero publica `moduleId: moduleSlug` (STRING) → el filtro `String(3)===String('operaciones')` falla → todas las ocurrencias descartadas → null.
- **FORM vía alert-card (`origin='alert'`):** lleva `alertId`/`occurrenceId` explícitos → el bridge usa esa identidad directa → SÍ registra. El defecto es **específico de `origin='resource'`** (entrada directa al formulario), no de la tarjeta.

## Scope respetado / STOP list

- **CERO** cambios en `src/`. `git status src/` solo muestra
  `RuntimePersistenceProviderCompositionRoot.ts` (legítimo del Sprint 303).
- No se "fixeó" el FORM (corrección de identidad queda para Sprint 305 FUNCIONAL).
- No se crearon schedulers, ledgers paralelos, estado React paralelo,
  `display:none`, `justUploaded`, `completedLocal` ni segunda fuente de verdad.
- No se inventó un reemplazo para `sprint-298` (discrepancia ya registrada en 302).
- `scripts/sprint-304-…forensic-audit.mjs` y este documento son los únicos artefactos nuevos.

## Declaración

**Sprint 304 — CERTIFIED.** Respuesta inequívoca a la pregunta forense principal:

> ¿Por qué permanece la alerta visualmente ABIERTA tras completar un formulario o
> subir un documento real?

**EVENT_BRIDGE_FAILURE (caso FORM directo, `origin='resource'`).** Se publica el
`COMPLETION_INTENT` correctamente pero el puente NO registra el haber porque la
identidad de `moduleId` no coincide entre el productor (SLUG) y el provider de
proyección (NUMÉRICO `form.module_id`). Sin haber en el Ledger, la proyección pura
no puede (ni debe) ocultar la alerta. El pipeline REPOSITORIO/CATEGORÍA y la
entrada vía alert-card funcionan; falla la entrada directa al FORMULARIо.

**Próximo: Sprint 305 (FUNCIONAL)** — alinear la identidad de `moduleId` entre
DynamicForm (producer) y el provider de `useAlertRuntime`, manteniendo el contrato
del Ledger, y certificar FORM directo → hasOpen=false.