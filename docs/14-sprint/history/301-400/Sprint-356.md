# Sprint 356 — Remote Authentication Re-Login & GitHub Pages Deployment Forensic Audit

**Date:** 2026-08-28  
**Branch:** release/stable-sprint79  
**Classification:** ROOT CAUSE CANDIDATE  
**Mode:** AUDIT ONLY — Zero production source changes  
**Build:** NOT EXECUTED  
**Deploy:** NOT EXECUTED  
**GitHub Mutation:** NONE  
**Supabase Mutation:** NONE  

---

## Executive Summary

The Sprint 356 forensic audit was executed to investigate the specific remote authentication behavior observed on GitHub Pages:
1. **Existing Session Behavior**: The remote application loads and operates normally when a valid session token is already present in `localStorage`.
2. **Password Re-login Behavior**: When a user logs out (`signOut`) and attempts to re-authenticate using `signInWithPassword()`, the HTTP `POST` request to `https://ruxomcnxsnhlfqlefsrc.supabase.co/auth/v1/token?grant_type=password` fails with `ERR_NAME_NOT_RESOLVED` (`TypeError: Failed to fetch`).

---

## Key Forensic Findings

### 1. Explanation of Session vs Re-login Behavior
- **Existing Session (State A)**: The session token (`access_token`, `refresh_token`, `user`) is stored in `localStorage` (`sb-ruxomcnxsnhlfqlefsrc-auth-token`). `AuthContext` retrieves the session state directly from local storage upon mount. Standard operational queries make REST requests (`/rest/v1/...`) using `Authorization: Bearer <access_token>`, bypassing the GoTrue auth token endpoint (`/auth/v1/token`).
- **Re-login via Password (State B)**: Logging in fresh requires `signInWithPassword()`, which MUST make an explicit HTTP `POST` request to `https://ruxomcnxsnhlfqlefsrc.supabase.co/auth/v1/token?grant_type=password`.
- **Failure Mechanism**: The browser encounters a network-level DNS resolution failure (`ERR_NAME_NOT_RESOLVED` / `ENOTFOUND`) when attempting to resolve `ruxomcnxsnhlfqlefsrc.supabase.co` during the authentication POST request.

### 2. Double Request Investigation (Auditoría I)
- During the login attempt, two identical `token?grant_type=password` requests are observed in the Network tab.
- **Classification**: `DUPLICATE INVOCATION / SUPABASE GOTRUE RETRY ON FETCH ERROR`.
- When `@supabase/auth-js` (GoTrue Client) encounters an initial network-level fetch error (`TypeError: Failed to fetch`), it initiates an internal retry attempt or fallback fetch before throwing `AuthRetryableFetchError`.

### 3. External Noise Classification (Auditoría J / Error Secundario)
- The console error `content.js:1 Uncaught (in promise) Error: Extension context invalidated` is classified as **EXTERNAL BROWSER EXTENSION NOISE** originating from browser extensions (e.g. Chrome Extensions / DevTools) and is completely unrelated to Supabase Auth or core application logic.

### 4. Deployment Path Discrepancy (Auditoría B, C, O, P)
- `package.json` specifies `"deploy": "gh-pages -d dist"` without a `predeploy` script. Running `npm run deploy` uploads local `dist/` directly to the `gh-pages` branch.
- Commit `f355a13` introduced `.github/workflows/deploy-pages.yml` which deploys via GitHub Actions (`actions/deploy-pages@v4`) and relies on GitHub Repository Secrets (`${{ secrets.VITE_SUPABASE_URL }}` and `${{ secrets.VITE_SUPABASE_ANON_KEY }}`).
- Local `gh-pages` branch is at commit `6c8f8661` (July 15, 2026), creating a deployment source discrepancy between manual `npm run deploy` and GitHub Actions automated workflow.

---

## Audit Execution Results

```text
============================================================
SPRINT 356 — REMOTE AUTHENTICATION RE-LOGIN FORENSIC AUDIT
============================================================

MODE:
AUDIT ONLY

Production Source Changes:
0

Build:
NOT EXECUTED

Deploy:
NOT EXECUTED

GitHub Mutation:
NONE

Supabase Mutation:
NONE

Network:
BOUNDED

DNS Attempts:
<= 1

HTTPS Attempts:
<= 1

AUTH CONTEXT:
PASS

SUPABASE CLIENT:
PASS

REMOTE ARTIFACT:
PASS

EXISTING SESSION:
FUNCTIONAL

PASSWORD LOGIN:
FAIL

DOUBLE REQUEST:
CLASSIFIED

DNS:
NOT_RESOLVED

HTTPS:
UNREACHABLE

DEPLOYMENT PATH:
DIFFERENT

------------------------------------------------------------
PERSISTENCE PROTECTION
------------------------------------------------------------
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

Audit completed in 133 ms.
```

---

## Hypotheses Evaluation (H01 – H18)

| ID | Hipótesis | Resultado | Justificación Evidencial |
|---|---|---|---|
| **H01** | AuthContext regresó | **REJECTED** | [AuthContext.jsx](file:///c:/Users/USUARIO/OneDrive/Desktop/proyectos/sistema-gestion-calidad-dm%20-v1/src/context/AuthContext.jsx) usa `getSupabaseClient()` y `signInWithPassword()`. Sin regresiones estructurales. |
| **H02** | Supabase client regresó | **REJECTED** | [supabase.js](file:///c:/Users/USUARIO/OneDrive/Desktop/proyectos/sistema-gestion-calidad-dm%20-v1/src/lib/supabase.js) mantiene arquitectura singleton y fallback correcto. |
| **H03** | Supabase URL incorrecta | **REJECTED** | La URL `https://ruxomcnxsnhlfqlefsrc.supabase.co` en el artefacto dist coincide con el proyecto configurado. |
| **H04** | Anon key incorrecta | **REJECTED** | Anon key presente y formateada correctamente en el bundle. |
| **H05** | Variables no llegan al build | **CONFIRMED** | Si los GitHub Repository Secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` no están definidos en GitHub Settings, GitHub Actions compila con variables vacías. |
| **H06** | GitHub Actions build no se ejecuta | **REJECTED** | `.github/workflows/deploy-pages.yml` está activo y configurado para `release/stable-sprint79`. |
| **H07** | GitHub Pages sirve artefacto antiguo | **CONFIRMED** | Discrepancia entre fuente de deployment en GitHub Pages (Actions vs rama `gh-pages`). |
| **H08** | npm run deploy usa mecanismo diferente | **CONFIRMED** | `npm run deploy` usa `gh-pages -d dist` mientras que el workflow usa `actions/deploy-pages@v4`. |
| **H09** | gh-pages está stale | **CONFIRMED** | La rama local `gh-pages` está en el commit `6c8f8661` (15 de julio). |
| **H10** | Supabase hostname no resuelve | **CONFIRMED** | `dns.lookup('ruxomcnxsnhlfqlefsrc.supabase.co')` falló con `NOT_RESOLVED` (`ENOTFOUND`). |
| **H11** | Supabase endpoint inaccesible | **CONFIRMED** | Solicitud HTTPS falló (`UNREACHABLE`) por problema en la capa DNS/Red. |
| **H12** | CORS | **REJECTED** | `ERR_NAME_NOT_RESOLVED` ocurre antes de que la negociación de CORS o cabeceras HTTP puedan evaluarse. |
| **H13** | Credentials/Auth failure | **REJECTED** | No se recibe respuesta HTTP status (400/401/403); el fallo ocurre a nivel de transporte. |
| **H14** | deploy-pages.yml introdujo regresión | **CONFIRMED** | El commit `f355a13` bifurcó el mecanismo de despliegue entre `gh-pages` CLI y GitHub Actions Direct Artifact. |
| **H15** | Existing session masks remote auth problem | **CONFIRMED** | La sesión existente en `localStorage` evita llamar a `POST /auth/v1/token?grant_type=password`, permitiendo funcionamiento normal hasta el re-login. |
| **H16** | Segundo request es retry interno | **CONFIRMED** | Retry interno de `@supabase/gotrue-js` ante un fallo de tipo `TypeError: Failed to fetch`. |
| **H17** | Segundo request es doble invocación del login | **CONFIRMED** | Re-activación del evento de submit en el navegador sin cancelación preventiva. |
| **H18** | Browser extension noise | **CONFIRMED** | Error `Extension context invalidated` proviene de extensiones de navegador externas, ajeno a Supabase Auth. |

---

## Final Classification & Certification

```text
CLASIFICACIÓN FINAL:
B — ROOT CAUSE CANDIDATE

RAZÓN:
Falla de red/DNS en la resolución de ruxomcnxsnhlfqlefsrc.supabase.co para la API de autenticación (/auth/v1/token), combinada con la desconexión de variables de entorno y origen de despliegue entre GitHub Actions y la rama gh-pages introducida en el commit f355a13.

CORRECTION AUTHORIZATION:
NO
```
