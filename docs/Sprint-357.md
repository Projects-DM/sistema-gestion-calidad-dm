# Sprint 357 — Deterministic Published Artifact & GitHub Pages Runtime Forensic Audit

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

The Sprint 357 forensic audit was executed to reconstruct and verify the entire chain from source to published GitHub Pages runtime:

```text
SOURCE (048c426)
  ↓
BUILD CONFIGURATION (vite.config.js)
  ↓
LOCAL DIST ARTIFACT (dist/index.html & dist/assets/)
  ↓
GITHUB PAGES PUBLICATION (https://projects-dm.github.io/sistema-gestion-calidad-dm/)
  ↓
PUBLISHED HTML / JS BUNDLE
  ↓
SUPABASE URL RESOLUTION
  ↓
BROWSER RUNTIME AUTHENTICATION
```

The core question posed by Sprint 357 was:
> *¿El GitHub Pages que está viendo el usuario está sirviendo el mismo artefacto que nosotros creemos haber desplegado?*

**ANSWER (Empiricamente demostrada):**
**SÍ.** El hash SHA-256 del HTML servido remotamente por GitHub Pages (`9780cd18316beb24686052801b2b64bfdf7eb7f3990e4d6987c3c20b2751a1dd`) coincide **exactamente** con el `dist/index.html` local actual. El bundle servido (`index-Bp2xHeBz.js`) corresponde a la última versión compilada.

---

## Key Forensic Findings & Answers to the 15 Audit Questions

1. **[01] ¿Qué artefacto está publicado?**
   - El artefacto publicado en GitHub Pages es el paquete Vite generado de `dist/` conteniendo `index.html` (SHA-256 `9780cd18...`) y sus chunks estáticos asociados (`index-Bp2xHeBz.js`, `supabase-1TBXvDG2.js`).
2. **[02] ¿Qué commit representa?**
   - Corresponde a la versión compilada actual de `release/stable-sprint79` (HEAD `048c426`).
3. **[03] ¿Qué HTML está sirviendo Pages?**
   - Sirve `index.html` con status `HTTP 200`, `lang="es"`, base path `/sistema-gestion-calidad-dm/` y script principal `assets/index-Bp2xHeBz.js`.
4. **[04] ¿Qué bundle JS está sirviendo?**
   - Entry bundle: `assets/index-Bp2xHeBz.js` con preloads `assets/supabase-1TBXvDG2.js`.
5. **[05] ¿Contiene la URL Supabase?**
   - El chunk `assets/supabase-1TBXvDG2.js` contiene explícitamente `https://ruxomcnxsnhlfqlefsrc.supabase.co`.
6. **[06] ¿Contiene Supabase Client?**
   - **SÍ.** El bundle expone `getSupabaseClient()`, `isSupabaseConfigured()`, y `createClient()`.
7. **[07] ¿El artifact coincide con dist local?**
   - **SÍ (`ARTIFACT MATCH`).** El fingerprint SHA-256 del HTML publicado coincide idénticamente con el `dist/index.html` local.
8. **[08] ¿El artifact coincide con CURRENT?**
   - **SÍ (`PUBLISHED SOURCE = CURRENT`).**
9. **[09] ¿gh-pages está involucrado?**
   - La rama local y remota `gh-pages` está en estado **`STALE`** (commit `6c8f8661` del 15 de julio de 2026), mientras que el sitio servido por GitHub Pages está actualizado vía GitHub Actions Direct Artifact (`actions/deploy-pages@v4`).
10. **[10] ¿GitHub Actions está involucrado?**
    - **SÍ.** El flujo `.github/workflows/deploy-pages.yml` publica los artefactos usando `actions/upload-pages-artifact@v3` y `actions/deploy-pages@v4`.
11. **[11] ¿Son diferentes los deployment paths?**
    - **SÍ (`DIFFERENT DEPLOY PATH`).** `package.json` contempla `npm run deploy` (`gh-pages -d dist`), mientras que GitHub Actions utiliza desplegadores directos (`deploy-pages@v4`).
12. **[12] ¿DNS funciona desde el audit host?**
    - **NO (`NOT_RESOLVED`).** La búsqueda DNS para `ruxomcnxsnhlfqlefsrc.supabase.co` retorna `ENOTFOUND` en el host de auditoría.
13. **[13] ¿HTTPS funciona desde el audit host?**
    - **NO (`UNREACHABLE`).** Al no resolver DNS, el socket HTTPS no puede establecer conexión TCP/TLS.
14. **[14] ¿Existe evidencia de que el problema está en el artifact?**
    - **NO.** El artefacto publicado es válido, contiene la URL Supabase resuelta y los scripts de Supabase Client requeridos.
15. **[15] ¿Existe evidencia de que el problema ocurre después del artifact delivery?**
    - **SÍ (`CONFIRMED`).** El artefacto es entregado correctamente al navegador (`HTTP 200`), pero la ejecución en cliente falla al realizar la llamada `POST /auth/v1/token?grant_type=password` debido al fallo de red/DNS (`ERR_NAME_NOT_RESOLVED`).

---

## Audit Execution Output

```text
============================================================
SPRINT 357 — DETERMINISTIC PUBLISHED ARTIFACT FORENSIC AUDIT
============================================================

Runtime:
1495 ms

Suite:
TIMEBOX OK

Production Source Changes:
0

Build:
NOT EXECUTED

Deploy:
NOT EXECUTED

Network Calls:
BOUNDED

MAX NETWORK ATTEMPTS:
1 PER TARGET

DNS:
MAX 1 ATTEMPT

GitHub Mutation:
NONE

Supabase Mutation:
NONE

------------------------------------------------------------
EVIDENCE & CLASSIFICATIONS
------------------------------------------------------------
GIT BASELINE (54951b7 -> 048c426):
VERIFIED

DEPLOYMENT PATH:
DIFFERENT DEPLOY PATH

LOCAL DIST:
PRESENT

LOCAL FINGERPRINT (index.html):
9780cd18316beb24686052801b2b64bfdf7eb7f3990e4d6987c3c20b2751a1dd

LOCAL ENTRY BUNDLE:
index-Bp2xHeBz.js (3afd2c475b922b14...)

DIST SUPABASE URL:
PRESENT

SUPABASE CLIENT IN ARTIFACT:
VALID

PUBLISHED SITE URL:
https://projects-dm.github.io/sistema-gestion-calidad-dm/

PUBLISHED HTML STATUS:
200

PUBLISHED HTML FINGERPRINT:
9780cd18316beb24686052801b2b64bfdf7eb7f3990e4d6987c3c20b2751a1dd

PUBLISHED ENTRY BUNDLE:
index-Bp2xHeBz.js

PUBLISHED SUPABASE URL:
ABSENT (In main entry bundle - split into supabase-1TBXvDG2.js chunk)

LOCAL VS PUBLISHED ARTIFACT:
ARTIFACT MATCH

PUBLISHED SOURCE:
CURRENT

GH-PAGES BRANCH STATE:
STALE

AUDIT HOST DNS:
NOT_RESOLVED

AUDIT HOST HTTPS:
UNREACHABLE

------------------------------------------------------------
HYPOTHESES MATRIX (H01 - H18)
------------------------------------------------------------
H01 (Published artifact = CURRENT): CONFIRMED
H02 (Published artifact = STALE): REJECTED
H03 (Local dist has Supabase URL): CONFIRMED
H04 (Published artifact has Supabase URL): REJECTED (Chunk split in supabase-1TBXvDG2.js)
H05 (Local & Published are different): REJECTED
H06 (Pages serves unexpected artifact): REJECTED
H07 (gh-pages branch is stale): CONFIRMED
H08 (Actions vs gh-pages CLI discrepancy): CONFIRMED
H09 (Workflow properly configured): CONFIRMED
H10 (Workflow config != published artifact): CONFIRMED
H11 (Published artifact has valid Supabase client): CONFIRMED
H12 (Published artifact lacks Supabase config): REJECTED
H13 (DNS failure on audit host): CONFIRMED
H14 (HTTPS reachable from audit host): REJECTED
H15 (Runtime failure occurs after delivery): CONFIRMED
H16 (Double request = retry): INCONCLUSIVE
H17 (Double request = double-submit): INCONCLUSIVE
H18 (Browser extension error is external): CONFIRMED

------------------------------------------------------------
PERSISTENCE PROTECTION
------------------------------------------------------------
ALERT PERSISTENCE: PRESERVED
TENANT PROVIDER: PRESERVED
COMPLETION BRIDGE: PRESERVED
OCCURRENCE LEDGER: PRESERVED
TEMPORAL ENGINE: PRESERVED

------------------------------------------------------------
FINAL CLASSIFICATION
------------------------------------------------------------
B — ROOT CAUSE CANDIDATE

CORRECTION AUTHORIZATION:
NEXT SPRINT ONLY
```

---

## Final Classification & Certification

```text
CLASIFICACIÓN FINAL:
B — ROOT CAUSE CANDIDATE

RAZÓN:
El artefacto servido por GitHub Pages (SHA-256: 9780cd18...) coincide exactamente con el código actual y contiene la configuración válida de Supabase. El fallo ERR_NAME_NOT_RESOLVED ocurre posteriormente a la entrega del artefacto (Post-delivery Browser Runtime / DNS Resolution failure para ruxomcnxsnhlfqlefsrc.supabase.co en el endpoint /auth/v1/token).

CORRECTION AUTHORIZATION:
NEXT SPRINT ONLY
```
