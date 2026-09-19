# Sprint 404 — Branch & Deployment Strategy Audit

**Estado:** AUDIT COMPLETE
**Tipo:** FORENSIC / ARCHITECTURE / DEPLOYMENT AUDIT
**Modo:** READ-ONLY / AUDIT ONLY (cero cambios: 0 ramas, 0 workflows, 0 codigo, 0 remoto)
**Baseline:** `release/stable-sprint79`
**Fecha:** 2026-09-16
**Branch auditada:** `release/stable-sprint79`
**HEAD:** `0e6800a032cf817f02ee4f696383f9f92524da69`

---

## Executive Summary

La migracion hacia `feature/* → develop → operativo → Pages` es **tecnicamente viable** (historial consistente, workflow por artifact sin dependencia de rama salvo trigger, build branch-independent, gh-pages legacy sin rol), pero **no ejecutable aun**: proteccion/rulesets remotos NO verificables localmente, el workflow productivo esta anclado a `release/stable-sprint79` (cambiarlo toca el path de produccion), y el HEAD local va 7 commits por delante de `origin` (sin pushear). Por regla de aborto (proteccion desconocida + path productivo en juego): **DEFERRED — SATURDAY WINDOW**. Produccion permanece operativa e intacta.

## 1. Repository Baseline

- Branch: `release/stable-sprint79` (tracking `origin/release/stable-sprint79`, **ahead 7**, working tree clean).
- HEAD: `0e6800a` (2026-09-16, "docs: certify documentation governance and finalize consolidation").
- Working tree al inicio: operaciones 401 en staged (R/RM/D/M) + untracked (informes 398–402, Sprint-397). Al cierre: arbol limpio salvo `??` este informe; las operaciones 401 constan consolidadas bajo el mismo HEAD `0e6800a` (disco verificado intacto: `informes/`=10 incl. este informe, `field-types.md` en 02, ADR-011, `GOVERNANCE.md`). Cero funcional en todo momento.
- Remoto: `https://github.com/Projects-DM/sistema-gestion-calidad-dm.git` (fetch+push).

## 2. Branch Inventory

| Rama | Tipo | HEAD | Fecha | Proposito aparente | Clasificacion |
|------|------|------|-------|-------------------|---------------|
| `release/stable-sprint79` | local+remota | `0e6800a` / `3a60f8f` | 2026-09-16 / 2026-09-14 | baseline productivo + 7 commits doc locales | CURRENT-PRODUCTION |
| `main` | local+remota (sincronizadas `9c07d40`) | `9c07d40` | 2026-06-20 | linea historica pre-sprints | STALE (junio) |
| `operativo-v1` | local `9ff5f42` / remota `2168731` | 2026-07-21 / 2026-07-24 | local BEHIND remoto | modelo anterior divergente | LEGACY-DIVERGED |
| `origin/gh-pages` | remota (`ba8f658`, "Updates") | 2026-08-28 | artefactos compilados huerfanos | LEGACY-ARTIFACT |
| `origin/dependabot/*` ×7 | remotas (2026-09-11, bumps menores) | — | PRs dependencia, unmerged | NO-ACTION |

No existen `operativo` ni `develop` en ningun ref. Solo `origin/release/stable-sprint79` aparece como merged (trivial).

## 3. Branch State Analysis

- `release/stable-sprint79`: sana, lineal reciente (documentacion 397–403), 7 commits locales sin push (riesgo §11-R3).
- `main`: fosil de junio (+11 commits propios vs release, irrelevantes); sin rol tecnico actual; no candidata a rama principal futura sin rescate explicito (no propuesto).
- `operativo-v1`: divergencia bilateral severa (release +243 / operativo-v1 +108 desde base `21aeb73`); remoto adelanta al local (Jul 24 `2168731` fix normalize). Valor historico; preservar; jamas reutilizar el nombre sin distincion (`operativo` ≠ `operativo-v1`).
- `gh-pages`: sin merge-base con release (historias no relacionadas) + diff 1512 archivos/+301k lin. = build output, no fuente. Legacy sin rol (workflow actual usa artifact, §5).
- Dependabot: 7 ramas PR, ninguna toca produccion; ignorar en migracion (revisar merges por separado algun dia; fuera de alcance).

## 4. Current Production Path

```text
push → release/stable-sprint79 ─→ Actions (deploy-pages.yml) ─→ artifact ./dist ─→ deploy-pages@v4 ─→ GitHub Pages
```

`release/stable-sprint79` **es** el baseline productivo conocido. `origin` va 2 dias/7 commits detras del HEAD local (solo documentacion), luego el codigo desplegado equivale funcionalmente al local.

## 5. GitHub Pages Deployment Analysis

Pages sirve el artifact de Actions (`deploy-pages@v4`, environment `github-pages`), **no** la rama `gh-pages` (comentario lin.3 del workflow que dice "gh-pages branch" esta desactualizado — defecto documental menor, no tocar en este Sprint). Rama de Pages: N/A (artifact-mode). Sin dependencia de nombre de rama salvo trigger.

## 6. GitHub Actions Workflow Analysis

Unico workflow: `.github/workflows/deploy-pages.yml` (64 lin, Sprint 351 + endurecido 361/395/397). Trigger: `push.branches: [release/stable-sprint79]` + `workflow_dispatch`. Build: Node 20, `npm ci`, secrets→env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BASE_PATH='/sistema-gestion-calidad-dm/'`) con verificacion PRESENT, `npm run build`, upload `./dist`. Deploy: `needs.build`, environment `github-pages` + URL. Permisos minimos (`contents:read`, `pages:write`, `id-token:write`), concurrencia `pages` sin cancel. **Conclusion: migrar el deploy a `operativo` exige editar el trigger (cambio sobre path productivo) → ventana sabado.**

## 7. Branch Protection / Ruleset Analysis

Sin evidencia local (`.github/` contiene solo `workflows/`; sin `CODEOWNERS`, sin rulesets versionados). Acceso remoto no consultado (fuera de interfaces autorizadas para escritura-riesgo; lectura remota no disponible de forma determinista).

```text
STATUS: NOT VERIFIED (proteccion de release/stable-sprint79, futura operativo/develop, required checks, reviews, force-push, eliminacion)
```

No se inventa configuracion. Esta incognita activa la regla de aborto (§4: "reglas de proteccion desconocidas").

## 8. Branch Comparison

| Par | Base | Exclusivos A→B / B→A | Diff | Lectura |
|-----|------|---------------------|------|---------|
| main ↔ release | `a01e44c` | release +310 / main +11 | 1295 archivos (+246k/−4k) | main fosil; release la contiene y supera |
| operativo-v1 ↔ release | `21aeb73` | release +243 / operativo-v1 +108 | 1594 archivos (+195k/−77k) | divergencia bilateral; nada cherry-pickeable a ciegas |
| gh-pages ↔ release | (ninguna) | — / 382 | 1512 archivos (+301k) | arboles distintos: artefacto vs fuente |

**Crear `operativo` desde HEAD `0e6800a` es tecnicamente seguro** (puntero nuevo, cero reescritura, fast-forwardable); idem `develop` desde `operativo`. El riesgo no esta en crearlas sino en **activarlas** (trigger + protecciones + push).

## 9. Proposed Target Model

`feature/* → develop → VALIDATION → CERTIFICATION → operativo → Pages`: viable y profesional. `operativo` (protegida, siempre desplegable, sin desarrollo directo), `develop` (integracion), `feature/*` (corta vida via develop). `main` queda archival/read-only (no se elimina: historia). `operativo-v1` y `gh-pages` se preservan intactos (legacy documentado, jamas reutilizar nombres sin sufijo claro).

## 10. Migration Preconditions

[ ] push de los 7 commits doc (o baseline pinnado `0e6800a` documentado) [ ] verificar proteccion remota (lectura) [ ] crear `operativo` = `0e6800a` (local, verificable) [ ] crear `develop` = `operativo` [ ] protecciones `operativo` (no direct push, no delete, no force) [ ] workflow: trigger dual temporal `release/stable-sprint79`+`operativo`, luego corte [ ] smoke test Pages [ ] rollback pinnado. Todo en ventana sabado.

## 11. Risk Matrix

| Riesgo | Evidencia | Impacto | Prob. | Nivel | Accion |
|--------|-----------|---------|-------|-------|--------|
| Proteccion remota desconocida | §7 NOT VERIFIED | Alto | Media | **HIGH** | verificar en ventana; sin push hasta entonces |
| Trigger anclado a release | workflow lin.9 | Alto | Cierta (al cambiarlo) | **HIGH** | edicion solo en ventana + rollback |
| HEAD local ahead 7 sin push | status | Medio | Media | MEDIUM | push o pin antes de crear ramas |
| `operativo-v1` confundible con `operativo` | §3 | Medio | Baja | MEDIUM | naming + nota en plan; no tocar v1 |
| gh-pages legacy malinterpretada | §5 (comentario lin.3) | Bajo | Baja | LOW | corregir comentario en ventana (docs) |
| Dependabot desactualizado | 7 ramas Sep-11 | Bajo | Baja | LOW | fuera de alcance |
| main fosil reutilizada por error | §3 | Medio | Baja | LOW | declararla archival en plan |

## 12. Rollback Strategy

Pin rollback: `origin/release/stable-sprint79` = `3a60f8f` (remoto) / local `0e6800a`. Ante fallo: revertir trigger a `release/stable-sprint79`, re-deploy por `workflow_dispatch`, verificar Pages, borrar ramas nuevas **solo si** no recibieron pushes ajenos (si los hubo: forward-fix, jamas force). Sin tags/ramas creadas ahora.

## 13. Saturday Execution Window (PLAN, no ejecucion)

1. Salud Pages OK + tree limpio 2. push/pin baseline (`0e6800a`) 3. leer protecciones remotas 4. crear `operativo` = baseline (verificar SHA) 5. crear `develop` = `operativo` 6. protecciones `operativo` 7. workflow trigger dual (edicion minima) 8. push ramas (sin force) 9. deploy verificacion (dispatch) 10. smoke test produccion 11. corte trigger a `operativo` (segundo cambio) 12. cierre + acta. **Todo condicional a §10.**

## 14. Certification Criteria

Baseline ✓ Pages path ✓ workflow ✓ branches ✓ diferencias explicadas ✓ rollback ✓ steps ✓. **Falla:** protecciones NOT VERIFIED + trigger productivo por editar + HEAD ahead sin push → ambiguedades criticas abiertas → no READY.

## 15. Findings

F1 baseline productivo inequivoco (`release/stable-sprint79`). F2 Pages por artifact; `gh-pages` legacy huerfana. F3 `main` fosil, `operativo-v1` divergente historico (remoto adelanta local). F4 workflow monolitico anclado a release (unico punto de cambio productivo). F5 build branch-independent (`VITE_BASE_PATH` por env). F6 proteccion remota desconocida. F7 7 commits doc sin push. F8 `package.json:deploy` legacy (`gh-pages -d dist`) convive con Actions (limpieza futura, no ahora).

## 16. Final Decision

```text
DEFERRED — SATURDAY WINDOW
```

Justificacion exclusiva en evidencia: la creacion tecnica de ramas es segura (§8), pero la activacion exige editar el trigger del path productivo (§6) con protecciones remotas no verificadas (§7) y baseline local no pusheado (§1) — tres condiciones de aborto de §4. NO CERTAINTY → NO MIGRATION. Produccion intacta y operativa; cero cambios ejecutados (verificado §B8-404: este informe es la unica escritura).

## 17. Handoff to Sprint 405

```text
Sprint 405 — Deferred / Saturday Controlled Branch Migration
```

Entrada: este informe + precondiciones §10. Prohibido en 405 sin ventana: push, crear ramas remotas, editar workflow, tocar Pages/secrets/environments/protecciones. Primer paso 405: re-verificar baseline y protecciones; si persisten incognitas, re-deferir.
