# Sprint 405 — Pre-Migration Readiness Audit

## 1. Identificación

* **Sprint:** 405 — Pre-Migration Readiness Audit
* **Tipo:** FORENSIC / ARCHITECTURE / GIT / DEPLOYMENT READINESS AUDIT
* **Modo:** READ-ONLY / AUDIT ONLY — cero escrituras salvo este informe; cero pushes/merges/builds; API GitHub solo GET publicos (sin auth, sin secretos tocados)
* **Rama objetivo:** `release/stable-sprint79`
* **Baseline certificado:** `fd2f26309715f660e92f4181443f96ffff4d7f77`
* **Tag:** `baseline-pre-produccion-2026-09-19` (annotated, DigitalMete, 2026-09-19 18:51 -0500)
* **Fecha:** 2026-09-19/20

## 2. Objetivo

Determinar si el repositorio es un punto de partida estable, reproducible, identificable y recuperable para `feature/* → develop → operativo → GitHub Pages`. No crear ramas; solo habilitar la decision.

## 3. Alcance

Fases A–K (Git local/remoto, baseline+tag, ramas, ultimos cambios, Pages, Actions, reproducibilidad, preparacion operativo/develop, proteccion, rollback, riesgos). Metodos: git read-only local, `git ls-remote --heads` (lectura), GitHub REST GET sin autenticacion sobre repo publico. Sin `npm ci/build`, sin workflow_dispatch, sin UI remota modificada.

## 4. Baseline auditado

```text
HEAD = origin/release/stable-sprint79 = baseline-pre-produccion-2026-09-19
     = fd2f26309715f660e92f4181443f96ffff4d7f77
```

`git show --stat HEAD`: 1 archivo (informe 404). Log -8: 404-audit, 403-cert ×2, reorg docs/scripts/sprint-history (todos docs/chore). Tag annotated con mensaje "Baseline estable previo a migración de ramas y producción".

## 5. Estado Git

* Rama `release/stable-sprint79`, tracking `origin/release/stable-sprint79`, **0/0 up-to-date** (mejora vs Sprint 404: los 7 commits documentales ya estan pusheados remotamente).
* Working tree **clean** (unico `??`: este informe pendiente — sin cambios funcionales).
* `git show` tag: commit+tagger+fecha verificados; tag apunta al HEAD certificado.

## 6. Inventario de ramas

Locales (3): `main` (`9c07d40`, 2026-06-20, STALE historica), `operativo-v1` (`9ff5f42`, 2026-07-21, LEGACY, behind su remoto `2168731` Jul-24), `release/stable-sprint79` (CURRENT, `fd2f263`). Remotas reales (`ls-remote --heads`, autoritativo): **exactamente 5** — las 3 anteriores + `gh-pages` (`ba8f658`, Aug-28, artefacto huerfano sin merge-base) + 1 dependabot (`npm_and_yarn-eb8e2e027a`). Las otras 6 refs `origin/dependabot/*` locales son **stale** (borradas en remoto, `git fetch --prune` pendiente — INFO, sin accion en este Sprint). **`operativo`: inexistente. `develop`: inexistente.** `main` sincronizada local/remoto. Clasificacion: permanecer (release, main-archival, operativo-v1-legacy, gh-pages-legacy); no tocar ninguna.

## 7. Estado de GitHub Pages

Repo publico (`visibility:public`, `has_pages:true`, `default_branch:release/stable-sprint79`, no archivado). Deployments API: ultimos deploys `github-pages` = SHA `fd2f263` ref `release/stable-sprint79` via `github-actions` (Sep-19 23:54) — **produccion Pages = baseline certificado, verificado por API**. `GET /pages` devuelve 404 sin auth (config exacta de source UNKNOWN por API; corroborado artifact-mode por workflow+deployments). Hallazgo mayor: **segunda superficie de deploy** — bot `vercel[bot]` con deployments a environments `Preview` y `Production` (Sep 14–19, SHA baseline/previo); `homepage` del repo apunta a `vercel.app`. La migracion debe contemplar Vercel ademas de Pages.

## 8. Estado de GitHub Actions

Workflow unico `deploy-pages.yml` (sin modificar; diff vacio en rango): trigger `push:[release/stable-sprint79]` + `workflow_dispatch`; Node 20, `npm ci`, secrets→env con verificacion PRESENT, `npm run build`, artifact `./dist`, `deploy-pages@v4`, environment `github-pages`, permisos minimos, concurrencia `pages`. Migrar el trigger a `operativo` = edicion sobre path productivo → ventana sabado (heredado 404, vigente).

## 9. Reproducibilidad

`package.json` (build `vite build`; legacy `deploy: gh-pages -d dist` aun presente), `package-lock.json` existente (`Test-Path True`), `vite.config.js` (`base: VITE_BASE_PATH || '/'`, branch-independent), workflow §8. Estatica suficiente; **build no ejecutado** por regla read-only (validacion con artefacto queda para la ventana).

## 10. Preparación de operativo

Creable limpiamente como `operativo` = `fd2f263` exacto (puntero nuevo, cero reescritura). Ausencia total confirmada (local+`ls-remote`+API branches). Unica colision nominal: `operativo-v1` (mitigacion: no tocar v1, naming explicito). Condiciones §17.

## 11. Preparación de develop

Derivable como `develop` = `operativo` (= `fd2f263`) tras crear/verificar `operativo`. Ausencia total confirmada. Sin contenido propio inicial; jamas exclusivo antes del corte.

## 12. Protección y Environment

Verificado por API publica: ruleset **"Protect stable release branch"** (id 23116293), target branch, enforcement **active** (2026-09-13), alcance `refs/heads/release/stable-sprint79`, reglas **deletion + non_fast_forward** (sin PR/reviews/checks/linear-history: pushes directos fast-forward permitidos). Ramas restantes: `protected:false`. Environments: `github-pages` (branch_policy custom — **allowlist de ramas UNKNOWN sin auth**, punto critico: `operativo` debera anadirse), `Preview` y `Production` (Sep 14–15, sin reglas). Secrets: jamas leidos ni listados (solo su uso en workflow). Detalle fino de reglas/allowlist/reviewers: UNKNOWN → checklist UI §17.

## 13. Rollback

Triple pin: tag + commit `fd2f263` + remoto identico (0/0). Procedimiento: revertir trigger → `release/stable-sprint79` → `workflow_dispatch` → Pages → smoke test. Ramas nuevas solo se borran si no recibieron pushes ajenos. Sin ejecucion ahora.

## 14. Riesgos

| Riesgo | Evidencia | Impacto | Prob. | Mitigacion | ¿Bloquea? |
|--------|-----------|---------|-------|------------|-----------|
| Allowlist `github-pages` sin inspeccionar | §12 custom policy | Alto | Media | anadir `operativo` en ventana antes del corte | NO (condicion) |
| Ruleset futuro `operativo` inexistente | §12 (solo release) | Alto | Cierta | replicar deletion+non_ff (+PR si se decide) en ventana | NO (condicion) |
| Trigger anclado a release | §8 | Alto | Cierta al cambiarlo | edicion minima dual→corte en ventana + rollback §13 | NO (ventana) |
| Superficie Vercel no contemplada | §7 bot+envs | Medio | Media | decidir alcance Vercel en plan 406/407 | NO (condicion) |
| Confusion `operativo`/`operativo-v1` | §6 | Medio | Baja | naming + no tocar v1 | NO |
| Stale refs dependabot (6) | §6 ls-remote | Bajo | N/A | `fetch --prune` oportunista futuro | NO |
| `main` fosil reutilizada | §6 | Medio | Baja | declararla archival | NO |
| Secrets no rotados tras auditorias | uso en workflow §8 | Bajo | Baja | INFO; rotacion fuera de alcance | NO |

Cero HIGH/BLOCKER sin mitigacion. Cero abortos §18 (baseline consistente, tree limpio, 0/0, workflow comprendido, rollback pinnado, sin funcionales).

## 15. Hallazgos

F1 triple-identidad baseline+tag+push (mejora vs 404). F2 rango `3a60f8f..HEAD` (619 archivos, +3200/−83): 100% docs/reorg-scripts (renames costo 0; `project-tree.txt` binario 1.9MB removido = artefacto, INFO). F3 ramas inmoviles; remoto real = 5 (6 stale refs). F4 **proteccion release VERIFICADA** (ruleset activo deletion+non_ff) — cierra el bloqueador 404. F5 environments `Preview`/`Production` + bot Vercel = segunda superficie (nuevo vs 404). F6 allowlist github-pages = unica incognita critica restante, acotada.

## 16. Evidencia

status/branch -vv/-a/-r, rev-parse ×2, rev-list 0/0, tag --points-at, show --stat, log -8, show tag, diffs FASE-D (src/workflows/config vacios; stat global), `ls-remote --heads`, logs por rama, Test-Path lockfile, API GET: repo/branches/pages(404)/protection(401)/environments/rulesets/deployments. Todo reproducible sin escritura.

## 17. Condiciones previas a la migración

1. UI GitHub: leer allowlist `github-pages`, confirmar ruleset release, replicar ruleset `operativo` (+`develop` laxo), decidir alcance Vercel (Preview/Production), revisar secrets sin exponer. 2. Ventana sabado: crear `operativo`=`fd2f263` (verificar SHA), crear `develop`, protecciones, trigger dual→corte, deploy verificacion, smoke test. 3. No tocar `main`/`operativo-v1`/`gh-pages`/dependabot. 4. Rollback §13 armado. 5. Prune stale refs (opcional).

## 18. Decision Gate

```text
READY WITH CONDITIONS
```

Punto de partida estable/identificado/recuperable; migracion viable; condiciones §17 (UI + ventana) previas a crear/proteger/cortar produccion. Supera a 404-DEFERRED porque sus bloqueadores estan resueltos o acotados con mitigacion.

## 19. Conclusión

El repositorio esta preparado como base: baseline pinnado/pusheado/tagueado, tree limpio, ramas inventariadas (remoto real = 5), proteccion release verificada, path productivo comprendido y desplegando el baseline, rollback triple, riesgos acotados. Resta solo verificacion UI + ventana de ejecucion.

## 20. Handoff al Sprint 406

```text
Sprint 406 — Remote Protection & Deployment Environment Audit (UI)… [obsoleto: cubierto aqui por API]
→ Sprint 407 — Saturday Controlled Branch Migration (VENTANA)
```

Recomendacion 405: la evidencia API publica ya cubre el alcance 406 (rulesets, environments, deployments, branches); **fusionar 406 en verificacion UI residual** (allowlist, reviewers, Pages source) dentro de la ventana 407 en vez de otro Sprint completo. Prohibido fuera de ventana: push, ramas remotas, workflow, Pages/secrets/environments/rulesets. DoD-405 27/27; unica escritura: este informe.
