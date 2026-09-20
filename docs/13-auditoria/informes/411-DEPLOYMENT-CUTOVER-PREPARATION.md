# Sprint 411 — Deployment Cutover Preparation

## 1. Executive Summary

Cutover `release/stable-sprint79 → operativo` diseñado y validado en papel: baseline triple `fd2f263` intacto, workflow sin drift, allowlist (5, IDs identicos), rulesets (3 activos), deployments estables (ultimo = baseline Sep-19), cero cambios funcionales. Estrategia recomendada: **C (dispatch-validacion → smoke → cambio trigger → smoke → certificacion)**; dual-trigger permanente rechazado; cambio directo solo como alternativa documentada. Concurrency `pages` sin cancel: ultimo-en-finalizar gana; riesgo neutro mientras SHAs identicos. Rollback sin force-push. Decision: **READY FOR SPRINT 412**. Cero modificaciones ejecutadas.

## 2. Baseline

```text
HEAD = origin/release = origin/operativo = origin/develop = tag = fd2f263
Tree: 0/0, solo ?? informes 405–410 · Diffs baseline→HEAD en src/workflows/package/vite: vacios
```

Abort baseline-drift: no activado.

## 3. Current Production Path

push→`release/stable-sprint79`→`deploy-pages.yml` (Node20, `npm ci`, secrets→env+PRESENT, `npm run build`, artifact `./dist`)→`deploy-pages@v4`→environment `github-pages`→Pages. Ultimo deploy verificado: SHA `fd2f263` ref release (Sep-19). Superficie secundaria Vercel (Preview/Production, bot) fuera del corte Pages pero registrada.

## 4. Workflow Analysis

Trigger `push.branches:[release/stable-sprint79]` + `workflow_dispatch` (disponible y preservado como via de validacion). Permisos minimos, concurrencia `pages`/`cancel-in-progress:false`, environment `github-pages` en build+deploy. Cero dependencias del nombre de rama salvo trigger; `base` por env (`VITE_BASE_PATH`). Conclusion CP1: **dispatch manual desde `operativo` es posible sin modificar el workflow** (dispatch ejecuta el archivo de la rama elegida, contenido identico, env lo autoriza). Sin ejecutar.

## 5. Pages Environment

Allowlist 5/5 (IDs 49726999/49724818/60455145/53280180/58524247, sin drift): `operativo` ✓, release ✓, legacy intactas, `develop` correctamente ausente. Sin reviewers/wait timers; admins bypass. Regla: `develop` jamas al deploy de produccion.

## 6. Branch Protection

3 rulesets activos sin drift: release 23116293, operativo 23713100, develop 23713336 (todos deletion+non_ff). Cutover no exige debilitarlos; pushes directos FF siguen posibles (registrado, no recomendado en ventana).

## 7. Trigger Strategies

**A — Dual temporal: RECHAZADA** como estado (solo aceptable como transicion de segundos, innecesaria). Dos triggers → pushes a ambas ramas encolan deploys FIFO; last-finisher-wins; con SHAs identicos el artefacto es identico (inocuo), pero tras divergir un push viejo de release podria sobrescribir Pages. Riesgo injustificado pudiendo usar C.
**B — Cambio directo: ALTERNATIVA valida.** Commit unico en release cambiando trigger a `[operativo]`; semantica push: el push evaluaria el archivo nuevo (filtro operativo vs ref release → sin run espurio), luego dispatch en operativo valida. Rollback = revert del commit. Simple pero mezcla activacion+validacion.
**C — Dispatch-validacion + corte: RECOMENDADA.** (1) dispatch en `operativo` (sin cambiar nada) → deploy identico verificable; (2) smoke; (3) commit trigger→`[operativo]`; (4) smoke; (5) certificacion. Separa validacion de activacion; rollback en cada paso; cero ventana de doble-trigger.

## 8. Concurrency Analysis

`group:pages` + `cancel-in-progress:false` = cola FIFO sin cancelacion; Pages aplica el ultimo deployment finalizado (last-write-wins). Coexistencia A/B: posible; orden: finalizacion, no inicio; sobrescritura por version vieja: posible solo con SHAs distintos + doble trigger. Control: cortar con SHAs identicos + estrategia C (sin dual permanente) = riesgo neutro.

## 9. Double Deployment Risk

Riesgo real solo si (trigger dual) ∧ (SHAs distintos) ∧ (pushes cercanos). Estado actual: ninguna rama dispara salvo release; las tres en `fd2f263` (artefacto identico aun si dispararan). Mitigacion normativa: prohibir pushes durante la ventana salvo el commit de corte; verificar SHA de cada deployment contra el esperado.

## 10. Recommended Cutover Procedure

PHASE 1 PRE-CHECK (re-verificar §2 + allowlist + rulesets + ultimo deploy; abort si drift; responsable: operador ventana). PHASE 2 VALIDATION (dispatch en `operativo` → deployment SHA `fd2f263` → smoke §12; abort si SHA/deploy/smoke fallan; rollback: n/a — nada cambiado). PHASE 3 ACTIVATION (commit trigger→`[operativo]` en release via push FF permitido; verificar diff de 1 archivo; abort si otro cambio). PHASE 4 SMOKE (checklist §12 + deploy ref `operativo`). PHASE 5 CERTIFICATION (acta + tag `cutover-operativo-<fecha>` recomendado, no obligatorio). Nada de esto se ejecuta en 411.

## 11. Rollback Procedure

Trigger: smoke/deploy fallido o SHA inesperado. Accion: revert del commit de corte en release (push FF, permitido) → `workflow_dispatch` en release → deploy baseline → smoke. Verificacion: Pages sirve `fd2f263`, deployments API ref release. Completitud: release intacta siempre disponible; sin force-push, sin borrar ramas, sin tocar `develop`/`gh-pages`/Vercel. Rollback de validacion (PHASE 2): innecesario (nada cambio).

## 12. Smoke Test

App: homepage, assets, routing, base path `/sistema-gestion-calidad-dm/`, auth inicial, navegacion. Produccion: Pages responde, deploy ref `operativo` SHA `fd2f263`, build sin errores, assets sanos, sin regresion evidente. Integridad: `operativo`==esperado, release disponible como rollback.

## 13. Risk Matrix

| Riesgo | Prob. | Impacto | Mitigacion | Abort |
|--------|-------|---------|------------|-------|
| Doble deployment | Baja (sin dual) | Alto | estrategia C, pushes prohibidos en ventana | Si |
| Deploy desde release post-corte | Baja | Alto | trigger unico + verificacion ref | Si |
| operativo con SHA incorrecto | Baja | Alto | triple verificacion pre-corte | Si |
| Workflow incorrecto | Baja | Alto | diff 1-archivo + dispatch previo | Si |
| Pages bloquea operativo | Baja | Alto | allowlist verificada (5/5) | Si |
| Sin rollback | Rara | Critico | release intacta + tag + revert sin force | Si |
| Regresion funcional | Baja | Alto | smoke §12 (artefacto identico al actual) | Si |
| Cambios no relacionados | Baja | Alto | scope lock + diff auditado | Si |

Probabilidades justificadas: SHAs identicos + allowlist/rulesets verificados + cero drift historico 404→411.

## 14. Decision Gate

```text
READY FOR SPRINT 412
```

Baseline/workflow_dispatch/environment/concurrency comprendidos; doble-deployment controlado (estrategia C); cutover+rollback+smoke definidos; cero bloqueos tecnicos.

## 15. Handoff to Sprint 412

Sprint 412 (Controlled Deployment Validation): ejecutar PHASE 1–2 del §10 (dispatch en operativo + smoke) sin tocar el trigger. Cadena: 412 validacion → 413 cutover (PHASE 3–4) → 414 smoke → 415 certificacion. DoD-411 20/20; produccion/workflow/baseline integros; unica escritura: este informe.

```text
SPRINT 411 — COMPLETE · DECISION: READY FOR SPRINT 412
PRODUCTION: UNCHANGED · WORKFLOW: UNCHANGED · BASELINE: fd2f263
CUTOVER: NOT EXECUTED · ROLLBACK: DEFINED
```
