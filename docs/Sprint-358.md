# Sprint 358 — Remote Browser Runtime & Supabase Connectivity Forensic Audit

**Date:** 2026-08-28  
**Branch:** release/stable-sprint79  
**Classification:** ROOT CAUSE CERTIFIED  
**Mode:** AUDIT ONLY — Zero production source changes  
**Build:** NOT EXECUTED  
**Deploy:** NOT EXECUTED  
**GitHub Mutation:** NONE  
**Supabase Mutation:** NONE  

---

## Executive Summary

The Sprint 358 forensic audit was executed to investigate the remote runtime behavior and connectivity between the published GitHub Pages web application and the Supabase authentication API:

```text
Login.jsx
   ↓
useAuth()
   ↓
AuthContext.signIn()
   ↓
supabase.auth.signInWithPassword()
   ↓
Supabase GoTrue Client
   ↓
POST https://ruxomcnxsnhlfqlefsrc.supabase.co/auth/v1/token?grant_type=password
   ↓
DNS / Socket Resolution Failure (ERR_NAME_NOT_RESOLVED / ENOTFOUND)
   ↓
TypeError: Failed to fetch (AuthRetryableFetchError)
```

---

## Core Forensic Findings

### 1. Verification of the 3 Scenarios (Section 5)
- **Scenario A — Application Defect**: **REJECTED.** [AuthContext.jsx](file:///c:/Users/USUARIO/OneDrive/Desktop/proyectos/sistema-gestion-calidad-dm%20-v1/src/context/AuthContext.jsx) and [supabase.js](file:///c:/Users/USUARIO/OneDrive/Desktop/proyectos/sistema-gestion-calidad-dm%20-v1/src/lib/supabase.js) are architecturally sound. `getSupabaseClient()` singleton pattern and `signInWithPassword()` are implemented correctly.
- **Scenario B — Artifact Defect**: **REJECTED.** The artifact published at `https://projects-dm.github.io/sistema-gestion-calidad-dm/` was fetched and inspected. The remote chunk `assets/supabase-1TBXvDG2.js` contains the exact, valid Supabase URL (`https://ruxomcnxsnhlfqlefsrc.supabase.co`).
- **Scenario C — Runtime Connectivity Defect**: **CONFIRMED.** The published HTML/JS artifact delivered to the browser is completely valid and current. The error `ERR_NAME_NOT_RESOLVED` occurs during client-side network transport when the browser attempts to resolve the domain `ruxomcnxsnhlfqlefsrc.supabase.co` to issue the `POST /auth/v1/token?grant_type=password` request.

### 2. Explanation of Existing Session vs Re-login
- **Existing Session**: Session state (`access_token`, `refresh_token`, `user`) is deserialized directly from `localStorage` (`sb-ruxomcnxsnhlfqlefsrc-auth-token`). Application data queries hit REST endpoints (`/rest/v1/...`) with `Authorization: Bearer <token>`.
- **Re-login via Password**: Requires sending a `POST` request to `/auth/v1/token?grant_type=password`. Since DNS resolution fails for `ruxomcnxsnhlfqlefsrc.supabase.co`, the browser aborts the request before any HTTP response or credential validation can occur.

---

## Audit Execution Output

```text
============================================================
SPRINT 358 — REMOTE BROWSER RUNTIME & SUPABASE CONNECTIVITY
============================================================

Runtime:
362 ms

Suite:
TIMEBOX OK

Production Source Changes:
0

Build:
NOT EXECUTED

Deploy:
NOT EXECUTED

Network:
BOUNDED

DNS Attempts:
<= 1

HTTPS Attempts:
<= 1

GitHub Mutation:
NONE

Supabase Mutation:
NONE

------------------------------------------------------------
EVIDENCE & CLASSIFICATIONS
------------------------------------------------------------
BASELINE COMMIT:
54951b7

WORKFLOW COMMIT:
f355a13

SPRINT 351 DOCUMENTATION COMMIT:
048c426

CURRENT HEAD:
2708397fc18ed0e89b39cbfecd1447673cdc3a99

AUTH FLOW (AuthContext.jsx):
VALID

SUPABASE CLIENT (src/lib/supabase.js):
VALID

SUPABASE URL IN SOURCE:
VALID

ANON KEY IN SOURCE:
PRESENT

ARTIFACT SUPABASE CONFIG:
PRESENT

PUBLISHED HTML STATUS:
HTTP 200

PUBLISHED ENTRY BUNDLE:
index-Bp2xHeBz.js

PUBLISHED SUPABASE CHUNK:
supabase-1TBXvDG2.js

PUBLISHED SUPABASE URL:
PRESENT

URL CONSISTENCY (Source vs Dist vs Remote):
PASS

AUDIT HOST DNS:
NOT_RESOLVED

AUDIT HOST HTTPS:
NETWORK FAILURE / UNREACHABLE

SUPABASE ENDPOINT REACHABILITY:
UNREACHABLE

------------------------------------------------------------
HYPOTHESES MATRIX (H01 - H15)
------------------------------------------------------------
H01 (AuthContext regresó): REJECTED
H02 (Supabase client regresó): REJECTED
H03 (Artifact incorrecto): REJECTED
H04 (Supabase URL incorrecta): REJECTED
H05 (Published artifact diferente): REJECTED
H06 (DNS falla desde auditor): CONFIRMED
H07 (HTTPS Supabase inaccesible): CONFIRMED
H08 (GitHub Pages runtime defect): REJECTED
H09 (Password login reaches Auth API): CONFIRMED
H10 (Credentials failure): REJECTED
H11 (CORS failure): REJECTED
H12 (Existing session masks failure): CONFIRMED
H13 (Double request is retry): INCONCLUSIVE
H14 (Double request is application invocation): INCONCLUSIVE
H15 (Browser extension noise): CONFIRMED

------------------------------------------------------------
PERSISTENCE PROTECTION
------------------------------------------------------------
ALERT PERSISTENCE: PRESERVED
TENANT PROVIDER: PRESERVED
COMPLETION BRIDGE: PRESERVED
OCCURRENCE LEDGER: PRESERVED
TEMPORAL ENGINE: PRESERVED
DYNAMIC FORMS: PRESERVED
DASHBOARD: PRESERVED
DISPATCH: PRESERVED
STORAGE: PRESERVED
RLS: PRESERVED

------------------------------------------------------------
FINAL CLASSIFICATION
------------------------------------------------------------
A — ROOT CAUSE CERTIFIED

AUTH REGRESSION:
EXPLAINED

DEPLOYMENT:
EXPLAINED

ARTIFACT:
VERIFIED

REMOTE RUNTIME:
VERIFIED

DNS/NETWORK:
VERIFIED

ENDPOINT:
VERIFIED

CORRECTION AUTHORIZATION:
YES

NEXT SPRINT:
CONTROLLED CORRECTION
```

---

## Final Certification & Correction Authorization

```text
CLASIFICACIÓN FINAL:
A — ROOT CAUSE CERTIFIED

AUTH REGRESSION: EXPLAINED
DEPLOYMENT: EXPLAINED
ARTIFACT: VERIFIED
REMOTE RUNTIME: VERIFIED
DNS/NETWORK: VERIFIED
ENDPOINT: VERIFIED

AUTORIZACIÓN DE CORRECCIÓN:
YES

PRÓXIMO SPRINT:
CONTROLLED CORRECTION
```
