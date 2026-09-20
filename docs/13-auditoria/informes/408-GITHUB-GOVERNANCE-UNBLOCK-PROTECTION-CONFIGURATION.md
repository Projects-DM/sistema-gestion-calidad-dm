# Sprint 408 — GitHub Governance Unblock & Protection Configuration

## 1. Objective

Resolver los bloqueos de gobernanza remota de Sprint 407 (allowlist `github-pages` sin `operativo`; rulesets `operativo`/`develop` inexistentes) dejando GitHub preparado para la creacion controlada de ramas, sin tocar produccion.

## 2. Baseline

```text
HEAD = origin/release/stable-sprint79 = fd2f26309715f660e92f4181443f96ffff4d7f77
Tag baseline-pre-produccion-2026-09-19 → fd2f263 ✓
Divergencia 0/0 · Tree sin modificaciones trackeadas (unicos ??: informes 405/406/407)
```

## 3. Initial State

`operativo`/`develop`: inexistentes local y remoto (verificado `branch --list` vacio + `ls-remote` vacio). Allowlist `github-pages`: `[gh-pages, main, operativo-v1, release/stable-sprint79]` (IDs 49726999/49724818/53280180/58524247, sin cambios vs Sprint 407). Ruleset release "Protect stable release branch" (id 23116293): active, alcance `refs/heads/release/stable-sprint79`, reglas deletion + non_fast_forward (sin cambios). Produccion en `release/stable-sprint79`, workflow intacto.

## 4. CP0 — Baseline Lock

PASS: baseline/tag/divergencia/tree conformes §2; sin ramas inesperadas; sin cambios funcionales. No se requirio abort CP0.

## 5. CP1 — github-pages Allowlist

Verificacion: `operativo` **ausente** del allowlist (evidencia §3). Modificacion requerida (anadir `operativo`) **NO EJECUTADA**: exige GitHub UI o API autenticada; este entorno dispone de ni gh CLI, ni credenciales, ni acceso UI (solo GET publicos). Intentar escrituras sin auth = 401 garantizado + violacion del modo controlado. Estado final: allowlist **sin cambios** (re-verificado post-decision).

## 6. CP2 — operativo Protection

**NO CONFIGURADA.** Objetivo documentado (ruleset "Protect production branch — operativo", active, deletion + non-fast-forward sobre `refs/heads/operativo`, sin reglas extra). Ejecucion imposible sin auth. Nada creado.

## 7. CP3 — operativo Verification

No aplicable (CP2 no ejecutado). Criterios dejados armados para el operador: target `refs/heads/operativo`, enforcement active, deletion/non-ff blocked, verificacion por UI + API publica.

## 8. CP4 — develop Protection

**NO CONFIGURADA** (mismo bloqueo). Objetivo: ruleset "Protect integration branch — develop", active, deletion + non-ff, sin approvals/checks salvo necesidad documentada.

## 9. CP5 — develop Verification

No aplicable. Criterios armados analogos a CP3 sobre `refs/heads/develop`.

## 10. CP6 — Release Protection Verification

PASS: ruleset 23116293 intacto (active, mismo alcance, mismas 2 reglas, `updated_at` 2026-09-13 sin cambios). Proteccion productiva **no degradada**.

## 11. CP7 — Global Governance Verification

Branch protection: release ✓ protegido / operativo ✗ (no existe config) / develop ✗ (no existe config). Environment: `release/stable-sprint79` permitido ✓; `operativo` pendiente. Ramas: `operativo`/`develop` correctamente inexistentes (obligatorio cumplido por defecto).

## 12. CP8 — Production Integrity

`release/stable-sprint79` = `fd2f263` antes/despues; workflow `deploy-pages.yml` intacto (trigger `release/stable-sprint79`, sin diff); cero pushes/merges/deployments; Pages/secrets/Vercel/codigo sin tocar.

## 13. CP9 — Repository Integrity

Sin cambios en `src/`, workflows, package, vite, supabase, `docs/12-database`, `11-architecture`, `00-governance`. Unica escritura del Sprint: este informe. `git status` paths funcionales: vacio.

## 14. Changes Performed

**Ninguno** (solo este informe). CP1–CP5 de escritura: no ejecutados por falta de mecanismo autenticado.

## 15. Changes Explicitly Not Performed

Ramas, pushes, workflow, Pages, secrets, variables, Vercel, main/operativo-v1/gh-pages/dependabot, force-push, builds, deploys, codigo, allowlist, rulesets.

## 16. Evidence

Comandos CP0 (rev-parse ×3, rev-list 0/0, status, tag-commit, branch --list ×2, ls-remote ×2), API GET: ruleset-23116293 (activo, inalterado), allowlist (4 entradas, IDs identicos a Sprint 407), ausencia de `gh`/credenciales (`Get-Command gh` → no instalado).

## 17. Abort Conditions

**ACTIVADA: "Permisos insuficientes"** (mecanismo de escritura remota inexistente en este entorno) + sub-condiciones "operativo no puede agregarse al allowlist" y "rulesets no verificables" (no creables → no verificables). STOP aplicado antes de cualquier escritura remota; evidencia preservada; estado inalterado. Resto: no activadas.

## 18. Rollback

No requerido (cero cambios). Estado a restaurar: ninguno — repo identico al inicio salvo este informe untracked.

## 19. Final State

Allowlist sin cambios · rulesets solo release · `operativo`/`develop` inexistentes · produccion intacta · workflow intacto. **Nada que revertir.**

## 20. Decision

```text
BLOCKED — GOVERNANCE CONFIGURATION
```

Causa unica y precisa: este agente no dispone de acceso autenticado a GitHub (sin gh CLI, sin credenciales, sin UI) y las 3 escrituras requeridas (allowlist + 2 rulesets) son operaciones remotas autenticadas por definicion. No es incertidumbre tecnica (el que/ como estan totalmente determinados y verificados por lectura) sino **falta de capacidad de ejecucion**. Prohibido "resolverlo" con atajos (crear ramas sin proteccion/allowlist violaria el plan 400/407).

## 21. Handoff

**Sprint 409 — Manual Governance Unblock (operador humano con admin GitHub).** Pasos exactos: (1) Settings→Environments→github-pages→anadir `operativo` (conservar las 4 existentes); verificar las 5. (2) Crear ruleset "Protect production branch — operativo" (active, `refs/heads/operativo`, deletion + non_fast_forward). (3) Crear ruleset "Protect integration branch — develop" (idem sobre `refs/heads/develop`). (4) Verificar los 3 rulesets por UI/API. (5) Re-ejecutar verificacion CP0–CP9 como Sprint 409. Solo entonces Sprint 410 (ex-409): creacion controlada de ramas. Tiempo estimado operador: 10–15 minutos. Riesgo de la espera: ninguno (produccion intacta y protegida).
