# Sprint 406 — Remote Protection & Deployment Environment Audit

## 1. Identificación

* **Sprint:** 406 — Remote Protection & Deployment Environment Audit
* **Tipo:** FORENSIC / GIT GOVERNANCE / GITHUB ACTIONS / DEPLOYMENT / PRODUCTION READINESS AUDIT
* **Modo:** READ-ONLY / AUDIT ONLY — cero escrituras salvo este informe; cero push/pull/merge/builds; API GitHub solo GET publicos sin auth (secretos jamas leidos ni listados)
* **Rama actual:** `release/stable-sprint79`
* **Baseline certificado:** `fd2f26309715f660e92f4181443f96ffff4d7f77`
* **Tag:** `baseline-pre-produccion-2026-09-19` (annotated, DigitalMete, 2026-09-19 18:51 -0500)
* **Fecha:** 2026-09-19/20

## 2. Objetivo

Determinar con evidencia verificable si la configuracion remota permite la transicion `feature/* → develop → operativo → GitHub Pages`. Metodo diferencial vs 404/405: la API publica del repo (publico, verificado) expuso rulesets, environments, deployments y ramas reales, cerrando incognitas previas. Sin crear ni modificar configuracion alguna.

## 3. Regla absoluta de read-only

Respetada integra: no se crearon/eliminaron ramas, no push/pull/merge/rebase/reset/cherry-pick/force-push, no se toco workflow/Pages/Environment/secrets/variables/rulesets/protection, no deployments ni workflow_dispatch, no codigo/package/vite/SQL/`.ai`, no `npm ci/install/build`. Unica escritura: este informe.

## 4. Baseline de control

```text
HEAD = fd2f26309715f660e92f4181443f96ffff4d7f77
origin/release/stable-sprint79 = fd2f26309715f660e92f4181443f96ffff4d7f77
Divergencia = 0/0
Working tree = clean (unico ??: informe 405 pendiente de commit — documental, no funcional)
Tag = baseline-pre-produccion-2026-09-19 → fd2f263 ✓
```

**Baseline control: PASS.** Sin abort (coincidencia total, estado limpio y explicado).

## 5. Alcance A — Repositorio y ramas

Locales (3): `main` (`9c07d40`), `operativo-v1` (`9ff5f42`), `release/stable-sprint79` (`fd2f263`, tracking origin, 0/0). Remotas reales (`git ls-remote --heads`, autoritativo): **exactamente 5** — las 3 anteriores + `gh-pages` (`ba8f658`) + 1 dependabot (`npm_and_yarn-eb8e2e027a`). Las otras 6 refs `origin/dependabot/*` locales son **stale** (borradas en remoto). **`operativo`: inexistente. `develop`: inexistente.** Sin diferencias vs Sprint 405 salvo este informe pendiente. Clasificacion: release=CURRENT/produccion; main=historica; operativo-v1=legacy (preservar); gh-pages=legacy artifact (preservar); dependabot=viva solo `eb8e2e027a`, resto stale.

## 6. Alcance B — GitHub repository settings

Repo **publico** verificado (`visibility:public`, no archivado/deshabilitado, `has_pages:true`, `default_branch:release/stable-sprint79`, `web_commit_signoff_required:false`). Sin `gh` CLI instalado y sin credenciales: la inspeccion remota se realizo exclusivamente por API REST publica (GET). Rulesets: **1 visible** (§7). Configuraciones con detalle tras auth (bypass actors explicitos, allowlist de ramas): UNKNOWN con alcance acotado donde se indica. Nada modificado.

## 7. Alcance C — release/stable-sprint79

**Proteccion VERIFICADA** (cierra el bloqueador 404/405): API `branches` → `protected:true`; ruleset **"Protect stable release branch"** (id 23116293), target branch, enforcement **active** (2026-09-13), alcance `refs/heads/release/stable-sprint79`, reglas **deletion + non_fast_forward** (sin bypass actors listados). Consecuencia: prohibidos borrado y force-push; **permitidos pushes directos fast-forward** (sin PR/reviews/checks/linear-history requeridos). Separacion: VERIFIED (existencia, alcance, reglas, enforcement) / UNKNOWN (nada material restante: el detalle del ruleset llego completo) / NOT CONFIGURED (PR, reviews, checks, linear history) / NOT APPLICABLE (resto).

## 8. Alcance D — operativo futuro

CURRENT STATE: no existe en ningun ref (verificado §5). TARGET STATE requerido antes del corte: reglas espejo de release (deletion + non_fast_forward como minimo; evaluar PR+checks al crearla), sin desarrollo directo, despliegue controlado. Presentado como objetivo, no como configuracion existente.

## 9. Alcance E — develop futuro

CURRENT STATE: no existe. TARGET: proteccion laxa de integracion (deletion + non_ff recomendados; PRs desde `feature/*` sin reviews obligatorios salvo decision), checks de build/test como requeridos si el plan 407 los define. Distinta de `operativo` por funcion, no necesariamente por severidad.

## 10. Alcance F — GitHub Actions

Workflow unico `deploy-pages.yml` (64 lin, sin modificar): trigger `push:[release/stable-sprint79]` + `workflow_dispatch` (punto de activacion productivo actual); Node 20, `npm ci`, secrets→env con verificacion PRESENT, `npm run build`, artifact `./dist`, `deploy-pages@v4`, environment `github-pages`, permisos minimos (`contents:read`, `pages:write`, `id-token:write`), concurrencia `pages` sin cancel. Compatible con su deployment (evidencia §12: deploys exitosos al baseline).

## 11. Alcance G — GitHub Pages

`has_pages:true`. `GET /pages` → 404 sin auth (config de source UNKNOWN por API; **no inferido**). Veredicto por evidencia convergente: **artifact deployment SI** — deployments API muestran `github-pages` → SHA `fd2f263` ref `release/stable-sprint79` via `github-actions` (Sep-19), y el workflow usa `deploy-pages@v4` (nunca `gh-pages` branch). `origin/gh-pages` (Aug-28) confirmada legacy huerfana. Dominio: `homepage` metadata apunta a `vercel.app` (superficie Vercel, ver §12/§15).

## 12. Alcance H — Environment `github-pages`

Existencia VERIFICADA (id 15500123346, desde 2026-05-18): protection rule `branch_policy` con `deployment_branch_policy: protected_branches=false, custom_branch_policies=true` (allowlist de ramas), **sin required reviewers, sin wait timer**, `can_admins_bypass:true`. **Allowlist concreta: UNKNOWN** (requiere auth) — condicion critica n.º 1: `operativo` debe figurar en ella antes del corte o sus deploys seran bloqueados. Secrets: jamas accedidos; solo PRESENT-por-uso en workflow (valores nunca impresos). Environments hermanos: `Preview` y `Production` (Sep 14–15, sin reglas) + bot `vercel[bot]` desplegando a ambos — segunda superficie a decidir en plan 407.

## 13. Alcance I — Actions permissions

Workflow declara minimos compatibles (`contents:read`, `pages:write`, `id-token:write`) y los deploys §12 los confirman operativos. Settings repo-level (quien ejecuta workflows, fork policy, aprobaciones): UNKNOWN sin auth — impacto bajo (historial de deploys exitosos lo suple como evidencia operacional).

## 14. Alcance J — Deployment protection

Barrera actual push→Actions→Pages: **AUTOMATIC** (sin approvals/reviewers/wait timers en `github-pages`; ruleset solo anti-borrado/anti-force). REQUIRED APPROVAL: ninguna. UNKNOWN: allowlist exacta (condicion) y settings repo-level (bajo impacto). Sin gates que impidan el flujo actual ni que protejan contra un push directo (fast-forward permitido por ruleset).

## 15. Alcance K — Migration impact

1. Trigger: editar `branches:[release/stable-sprint79]` → anadir `operativo`, luego corte (2 cambios, ventana). 2. Ramas: crear `operativo`=`fd2f263`, `develop`=`operativo` (punteros, cero reescritura). 3. Proteccion: replicar ruleset en `operativo` (+ endurecer si se decide PR). 4. Environment: anadir `operativo` a allowlist `github-pages` **antes** del primer push a `operativo` (critico). 5. Pages: sin cambio (artifact-mode agnostico a rama). 6. Artifact: identico pipeline. 7. Rollback §16. 8. `release/stable-sprint79` convive como fallback durante dual-trigger (riesgo doble-deployment: ambos triggers disparan builds paralelos — mitigacion: ventana corta + corte inmediato tras smoke test). 9. Ventana controlada obligatoria para 1+4+7.

## 16. Alcance L — Rollback

Pin triple vigente: tag + `fd2f263` + remoto identico (0/0). Conceptual: fallo → revertir trigger a `release/stable-sprint79` → `workflow_dispatch` → Pages → smoke test; ramas nuevas solo se borran sin pushes ajenos. Sin ejecucion.

## 17. Matriz de estado

| Elemento | Estado actual | Evidencia | Requerido | Bloquea |
|----------|---------------|-----------|-----------|---------|
| Baseline | VERIFIED | triple identidad §4 | Si | No |
| Release protection | VERIFIED | ruleset activo §7 | Si | No |
| Operativo/develop protection | NOT CREATED | §5/§8–9 | Si (en ventana) | No (condicion) |
| Pages source | VERIFIED (artifact-mode) | deployments+workflow §11 | Si | No |
| Environment github-pages | VERIFIED (existe+reglas) | §12 | Si | No |
| Allowlist github-pages | UNKNOWN | §12 (requiere auth) | Si (pre-corte) | No (condicion) |
| Actions permissions | VERIFIED (workflow+operacion) | §10/§13 | Si | No |
| Repo-level Actions settings | UNKNOWN | §13 | No critico | No |
| Rollback | VERIFIED | §16 | Si | No |

## 18. Riesgos

| Riesgo | Evidencia | Impacto | Prob. | Mitigacion | ¿Bloquea? |
|--------|-----------|---------|-------|------------|-----------|
| Allowlist sin `operativo` bloquea su deploy | §12 custom policy | HIGH | Media | anadir en ventana pre-corte | NO (condicion) |
| Ventana sin ruleset `operativo` | §8 (inexistente) | HIGH | Cierta | replicar en ventana pre-push | NO (condicion) |
| Doble deployment en trigger dual | §15.8 | MEDIUM | Media | ventana corta + corte tras smoke | NO |
| Superficie Vercel fuera del plan | §12 bot+envs | MEDIUM | Media | decidir alcance en 407 | NO |
| Confusion `operativo`/`operativo-v1` | §5 | MEDIUM | Baja | naming + no tocar v1 | NO |
| Stale refs/prunes | §5 (6 refs) | LOW | N/A | `fetch --prune` oportunista | NO |
| Secrets no rotados | uso §10, jamas expuestos aqui | LOW | Baja | INFO; rotacion fuera de alcance | NO |

Cero CRITICAL. Cero HIGH sin mitigacion concreta de ventana.

## 19. Decision gate

```text
READY WITH CONDITIONS
```

Condiciones (todas verificables en ventana, ninguna estructural): (1) leer allowlist `github-pages` y anadir `operativo`; (2) replicar ruleset en `operativo` (+`develop` laxo); (3) decidir alcance Vercel; (4) trigger dual→corte con smoke test; (5) prune stale refs. Supera a 404-DEFERRED porque sus incertidumbres criticas quedaron verificadas (proteccion existente+activa, Pages artifact-mode, baseline triple) y lo restante es checklist UI, no incognita arquitectonica.

## 20. Regla de decision

Sin lenguaje especulativo: cada conclusion remite a VERIFIED (API/ls-remote/archivo), UNKNOWN acotado (allowlist, settings repo-level, source-endpoint) o NOT CONFIGURED (PR/reviews/checks en ruleset, reviewers/wait en envs). Nada inferido.

## 21. Conclusión

1. Proteccion release: VERIFICADA (ruleset activo deletion+non_ff). 2. Pages: VERIFICADO artifact-mode al baseline (source-endpoint UNKNOWN no bloqueante). 3. Environment: VERIFICADO existencia+reglas (allowlist = condicion). 4. Actions: VERIFICADO workflow+operacion (settings repo UNKNOWN menor). 5–6. Condiciones `operativo`/`develop`: conocidas y listadas (§8–9/§17). 7. Rollback: pinnado triple. 8. Sprint 407 puede proceder **en ventana** con condiciones. 9. Condiciones §19 antes de crear/proteger/cortar.

## 22. Handoff

```text
Sprint 407 — Saturday Controlled Branch Migration (VENTANA)
```

Entrada: este informe + checklist §17/§19 + baseline `fd2f263` + tag. Prohibido fuera de ventana: push, ramas remotas, workflow, Pages/secrets/environments/rulesets. Primer paso 407: re-verificar baseline (`fd2f263`, tag, 0/0) y allowlist; si diverge o aparece incognita nueva → re-deferir. DoD-406 25/25; unica escritura: este informe.

```text
REMOTE PROTECTION & DEPLOYMENT ENVIRONMENT AUDIT COMPLETE
```
