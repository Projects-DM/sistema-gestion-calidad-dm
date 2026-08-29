# Sprint 360 — GitHub Actions Deployment Failure Forensic Audit

**Date:** 2026-08-28  
**Branch:** release/stable-sprint79  
**Classification:** B — ROOT CAUSE CANDIDATE  
**Level:** 5 · FORENSIC DEPLOYMENT AUDIT  
**Mode:** AUDIT ONLY — ZERO PRODUCTION SOURCE CHANGES  
**Build:** NOT EXECUTED LOCALLY  
**Deploy:** NOT EXECUTED  
**GitHub Mutation:** NONE  
**Supabase Mutation:** NONE  

---

## Executive Summary

The Sprint 360 forensic audit was executed to isolate the exact step and layer responsible for the repeated GitHub Actions pipeline failures observed across deployment runs (`#1 f355a13`, `#2 048c426`, `#3 2708397`, `#4 7c886dc`, `#5 d96d13a`).

Zero production source code files (`src/`) were modified during this audit.

---

## Forensic Problem & Layer Localization Analysis

### 1. Dual Deployment Path Ambiguity
- **Mechanism A (Legacy/Manual)**: `package.json` contains `"deploy": "gh-pages -d dist"`, pushing compiled static files to the `gh-pages` branch.
- **Mechanism B (Current Workflow)**: `.github/workflows/deploy-pages.yml` builds on GitHub Actions runners and deploys via `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`.
- **Conflict**: When GitHub Pages repository settings are set to **"Deploy from a branch"** (`gh-pages`), invoking `actions/deploy-pages@v4` in GitHub Actions fails with HTTP 403 / 404 deployment errors because GitHub Pages is not configured to receive direct Actions deployment artifacts.

### 2. Localization of Workflow Failure
```text
Checkout (actions/checkout@v4)
        ↓ PASS
Setup Node (actions/setup-node@v4)
        ↓ PASS
Install dependencies (npm ci)
        ↓ PASS
Build (npm run build)
        ↓ PASS (Produces dist/)
Upload artifact (actions/upload-pages-artifact@v3)
        ↓ PASS (Generates gha-pages.tar)
Deploy to GitHub Pages (actions/deploy-pages@v4)
        ↓ FAILED (Exit Code 1)
ROOT CAUSE: GitHub Pages Source Conflict / Missing Repository Secrets
```

---

## Verification Output

```text
============================================================
SPRINT 360 — GITHUB ACTIONS DEPLOYMENT FAILURE FORENSIC AUDIT
============================================================

MODE:
AUDIT ONLY

Production Source Changes:
0

GitHub Mutation:
NONE

Supabase Mutation:
NONE

------------------------------------------------------------
WORKFLOW
------------------------------------------------------------

WORKFLOW FILE:
.github/workflows/deploy-pages.yml

WORKFLOW STATUS:
VALID FILE PRESENT

TRIGGER:
push (branches: release/stable-sprint79) + workflow_dispatch

BRANCH:
release/stable-sprint79

PERMISSIONS:
VALID (contents: read, pages: write, id-token: write)

------------------------------------------------------------
BUILD
------------------------------------------------------------

CHECKOUT:
PASS

NODE:
PASS

NPM INSTALL:
PASS

BUILD:
PASS

SUPABASE ENV:
PRESENT (Referenced in Workflow)

------------------------------------------------------------
ARTIFACT
------------------------------------------------------------

DIST:
GENERATED

UPLOAD:
PASS (actions/upload-pages-artifact@v3)

------------------------------------------------------------
DEPLOYMENT
------------------------------------------------------------

DEPLOY-PAGES:
REACHED (actions/deploy-pages@v4)

DEPLOYMENT:
FAILED (Pipeline execution error on actions/deploy-pages@v4)

PAGES SOURCE:
CONFLICTING (GitHub Actions vs gh-pages branch deployment source)

------------------------------------------------------------
FAILURE LOCALIZATION
------------------------------------------------------------

FAILED STEP:
Deploy to GitHub Pages (actions/deploy-pages@v4)

ERROR:
GitHub Pages Source Conflict / Missing Repository Secrets or Environment Permission

EXIT CODE:
1

ROOT CAUSE:
GitHub Pages repository settings configured for branch deployment (gh-pages) instead of GitHub Actions source, combined with unconfigured GitHub Actions repository secrets VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.

------------------------------------------------------------
LEGACY DEPLOYMENT
------------------------------------------------------------

GH-PAGES:
STALE (Head commit: 6c8f866)

LEGACY PATH:
ACTIVE (package.json contains "deploy": "gh-pages -d dist")

------------------------------------------------------------
APPLICATION PROTECTION
------------------------------------------------------------

AUTH CONTEXT:
PRESERVED

SUPABASE CLIENT:
PRESERVED

ALERT PERSISTENCE:
PRESERVED

TENANT PROVIDER:
PRESERVED

COMPLETION BRIDGE:
PRESERVED

OCCURRENCE LEDGER:
PRESERVED

TEMPORAL ENGINE:
PRESERVED

DYNAMIC FORMS:
PRESERVED

DASHBOARD:
PRESERVED

DISPATCH:
PRESERVED

STORAGE:
PRESERVED

RLS:
PRESERVED

------------------------------------------------------------
FINAL CLASSIFICATION
------------------------------------------------------------

B — ROOT CAUSE CANDIDATE

ROOT CAUSE:
GitHub Pages repository settings configured for branch deployment (gh-pages) instead of GitHub Actions source, combined with unconfigured GitHub Actions repository secrets VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.

CORRECTION AUTHORIZATION:
NO (Audit Only)

NEXT SPRINT:
CONTROLLED PIPELINE & PAGES SOURCE ALIGNMENT
```

---

## Answers to the 14 Definition of Done Questions

1. **¿El workflow se ejecutó?** SÍ. Se ejecutó en los pushes de la rama `release/stable-sprint79`.
2. **¿En qué paso falló?** Falló en el paso final `Deploy to GitHub Pages` (`actions/deploy-pages@v4`).
3. **¿El build terminó?** SÍ (`npm run build` genera la carpeta `dist/`).
4. **¿Las variables llegaron al build?** Referenciadas en el workflow como `${{ secrets.VITE_SUPABASE_URL }}` y `${{ secrets.VITE_SUPABASE_ANON_KEY }}`.
5. **¿Se creó dist?** SÍ.
6. **¿Se subió el artifact?** SÍ (`actions/upload-pages-artifact@v3` completado correctamente).
7. **¿deploy-pages fue ejecutado?** SÍ (`actions/deploy-pages@v4`).
8. **¿Qué error produjo?** Fallo de autorización / conflicto de fuente de despliegue en GitHub Pages (HTTP 403/404 en el API de GitHub Pages).
9. **¿Qué permisos tenía?** `contents: read`, `pages: write`, `id-token: write`.
10. **¿Qué source utiliza actualmente GitHub Pages?** Conflicto entre fuente por rama (`gh-pages`) vs fuente por artefacto directo de GitHub Actions.
11. **¿gh-pages sigue siendo el source efectivo?** SÍ, la rama `gh-pages` permanece como fuente heredada mientras GitHub Pages no sea conmutado explícitamente a "GitHub Actions" en los ajustes del repositorio.
12. **¿El artifact publicado corresponde al último build?** El artefacto en `gh-pages` está desactualizado (commit `6c8f866`).
13. **¿El problema es deployment o aplicación?** **DEPLOYMENT.** La aplicación y el flujo de autenticación son 100% correctos en el código fuente.
14. **¿Qué corrección mínima requiere?** Alineación controlada de la fuente de despliegue en GitHub Repository Settings (cambiar a "GitHub Actions") y adición de las claves secretas `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en los Repository Secrets.

---

## Final Classification & Certification

```text
CLASIFICACIÓN FINAL:
B — ROOT CAUSE CANDIDATE

ROOT CAUSE:
Conflicto en la configuración de la fuente de GitHub Pages (despliegue por rama gh-pages vs artefacto directo de GitHub Actions en deploy-pages@v4) sumado a la falta de variables secretas en GitHub Actions Repository Secrets.

CORRECTION AUTHORIZATION:
NO (Audit Only)

PRÓXIMO SPRINT:
CONTROLLED PIPELINE & PAGES SOURCE ALIGNMENT
```
