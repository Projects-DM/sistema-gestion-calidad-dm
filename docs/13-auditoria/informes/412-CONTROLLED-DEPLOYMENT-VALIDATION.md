# Sprint 412 — Controlled Deployment Validation

## 1. Executive Summary

Validacion completada hasta el limite fisico de este entorno: baseline triple `fd2f263` + workflow intacto + precondiciones CP2 + salud productiva actual verificadas; **el dispatch sobre `operativo` (CP3) NO pudo ejecutarse** — sin `gh` CLI, sin tokens, sin UI, y dispararlo es una escritura remota fuera de mi capacidad. Sin dispatch no hay build/run/deployment que validar (CP4–CP10 no ejecutables aqui). Produccion intacta, trigger inalterado, cero cambios. Decision: **BLOCKED — DO NOT PROCEED TO SPRINT 413** hasta que un operador autorizado ejecute el dispatch con el procedimiento exacto dejado en §16.

## 2. Baseline Verification

```text
HEAD = origin/release = origin/operativo = origin/develop = tag = fd2f263
Tree: 0/0 + ?? informes 405–411 · Diffs baseline en src/workflows/package/vite: vacios
```

CP0 PASS. Site productivo responde ("DM Distribuciones - SGC", INFO salud actual).

## 3. Pre-Deployment Checks

CP1 workflow: trigger `push:[release/stable-sprint79]` + `workflow_dispatch` intactos (Node20, npm ci, build, dist, deploy-pages@v4, env github-pages, concurrency pages/no-cancel) — PASS. CP2: `operativo`=`fd2f263` ✓, allowlist con `operativo` ✓ (5 entradas, IDs 410), rulesets release/operativo activos ✓, trigger automatico en release ✓, `develop` fuera del allowlist ✓. Sin drift vs Sprints 410/411.

## 4. Workflow Dispatch

**NO EJECUTADO.** Causa: este entorno carece de mecanismo de disparo (sin `gh`, sin `GITHUB_TOKEN`/`GH_TOKEN`, sin UI GitHub; la API REST exige auth para `POST /dispatches`). Intentarlo sin credenciales = 401 garantizado + violacion del modo controlado. Parametros exactos para el operador: workflow `deploy-pages.yml`, rama `operativo`, SHA esperado `fd2f263`; prohibidas release/develop/main/operativo-v1/gh-pages para esta validacion.

## 5. Build Result

NO OBSERVABLE (depende de §4). Referencia de exito conocido: run #18 push/release@`fd2f263` (Sep-19, `success`) + CodeQL success — pipeline sano con el mismo SHA. Hallazgo INFO: existe workflow CodeQL gestionado (`dynamic/github-code-scanning/codeql`, runs success) — superficie CI adicional, sin accion.

## 6. Deployment Result

NO OBSERVABLE (depende de §4). Criterios dejados: ref `operativo`, SHA `fd2f263`, env `github-pages`, status successful; no basta `success` en Actions sin confirmar ref+SHA.

## 7. Pages Validation

Actual (INFO, no sustituye validacion post-dispatch): homepage responde con shell SPA. Post-dispatch pendiente: homepage, JS/CSS/assets, base path `/sistema-gestion-calidad-dm/`, sin blanco, routing sin 404.

## 8. Smoke Test

Parcial-actual (INFO): shell carga. Funcional completo (layout, navegacion, Router, auth inicial sin mutaciones) pendiente del deployment `operativo`; requiere interaccion que excede GET estatico — queda al operador con el checklist §12-spec-412.

## 9. Deployment SHA Verification

Pre-dispatch: `release==operativo==fd2f263` ⇒ artefacto esperado equivalente. Post-dispatch pendiente: Expected `fd2f263` / Deployed (pendiente) / Branch `operativo`.

## 10. Automatic Trigger Verification

Trigger intacto `[release/stable-sprint79]` (leido + sin diff). `operativo` validado como deployment manual futuro, NO como trigger automatico. Sin cambios.

## 11. Double Deployment Check

Pre-dispatch: ultimo deployment = baseline Sep-19; sin runs pendientes observables (runs API: ultimo #18 success + CodeQL). Post-dispatch pendiente: verificar ausencia de deployments simultaneos/encolados inesperados y que el ultimo corresponde al dispatch.

## 12. Rollback Readiness

Disponible e intacto: release/`fd2f263`/tag. Conceptual: release → dispatch → github-pages. Sin force-push/deletes/rebase. Vercel aislado (sin tocar Production/Preview/config/domains/vars).

## 13. Vercel Isolation

Sin interaccion (solo GET deployments previos como evidencia). Pipeline validado exclusivamente Actions→Pages.

## 14. Evidence

Comandos CP0 (§2), lectura workflow (trigger+dispatch+concurrency), API: branches (5+operativo+develop), allowlist (5 IDs), rulesets (3 activos), runs (run #18 success + CodeQL), deployments (baseline Sep-19), site GET. Negativos: `gh` ausente, tokens ausentes (verificado por entorno, no por intento).

## 15. Decision Gate

```text
BLOCKED — DO NOT PROCEED TO SPRINT 413
```

Checklist 412: CP0–CP2 lectura PASS; CP3+ NO EJECUTADOS (bloqueo de capacidad, no de estado). Cambiar el trigger para "resolverlo" esta prohibido por spec. El problema se documenta y se resuelve con acceso, no con cutover.

## 16. Handoff to Sprint 413

**Sprint 413 = Manual Dispatch Validation (operador con acceso GitHub).** Pasos exactos: (1) re-verificar §2; (2) Actions → `deploy-pages.yml` → Run workflow → Branch: `operativo` (confirmar SHA `fd2f263`); (3) monitorear Run ID hasta `success` (npm ci→build→dist→deploy); (4) deployments API: ref `operativo` + SHA; (5) smoke §7–§8 spec (homepage, assets, base path, routing, auth inicial sin mutaciones); (6) confirmar trigger intacto + ningun deploy extra; (7) registrar 15 evidencias §13-spec en el informe 413. Abortos §19-spec vigentes (branch/SHA/build/env/deployment/Pages/smoke/deploys-extra/trigger/Vercel). Vercel: no tocar. DoD-412 parcial registrado; unica escritura: este informe.
