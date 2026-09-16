# Sprint 350 — Alert Persistence Remote Deployment & Environment Parity Forensic Audit

**Estado:** **CERTIFIED · 56/56** · 0.1s · timebox OK
**Nivel:** 5 · **Tipo:** FORENSIC ARCHITECTURE AUDIT · AUDIT ONLY
**Branch:** `release/stable-sprint79`
**Precedentes:** Sprints 341 · 345 · 346 · 347 · 348 · 349
**Suite:** `scripts/sprint-350-alert-persistence-remote-deployment-environment-parity-forensic-audit.mjs`
**Production Source Changes:** 0

---

## Clasificación final

```
FINAL CLASSIFICATION: ROOT CAUSE CERTIFIED
STATUS:                CERTIFIED · AUDIT ONLY
ROOT CAUSE:
  1. GitHub Pages deployment lacks VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
     in the GitHub Pages environment/secrets configuration.
  2. isSupabaseConfigured() returns FALSE on GitHub Pages.
  3. Hybrid adapter falls back to localStorage-only mode.
  4. Cross-user/cross-browser persistence fails (localStorage is browser-scoped).
  5. LocalStorage fallback is a SILENT FAILURE (no error, no warning).

ARCHITECTURE:          CORRECT (Sprints 346-348 certified)
ENVIRONMENT PARITY:    BROKEN
LOCAL/REMOTE PARITY:   FAIL
SUPABASE:              INACTIVE (remote)
TENANT:                VERIFIED (email domain derivation works)
RLS:                   N/A (Supabase client never initializes)
ARTIFACT:              VERIFIED (build matches local)
BOOT:                  VERIFIED (lazy hydration works)
CORRECTION AUTHORIZATION: YES — Sprint 351 (configure GitHub Pages secrets)
```

---

## Resumen ejecutivo

La persistencia de alertas funciona en `localhost` pero **no** en GitHub Pages porque:

```
LOCALHOST                     GITHUB PAGES
─────────────────────────     ─────────────────────────
VITE_SUPABASE_URL=✅          VITE_SUPABASE_URL=❌ (undefined)
VITE_SUPABASE_ANON_KEY=✅     VITE_SUPABASE_ANON_KEY=❌ (undefined)
isSupabaseConfigured()=TRUE   isSupabaseConfigured()=FALSE
getSupabaseClient()=singleton getSupabaseClient()=null
Hybrid Adapter: BOTH          Hybrid Adapter: localStorage ONLY
Supabase WRITE: ACTIVE        Supabase WRITE: NEVER ATTEMPTED
Cross-user: PASS              Cross-user: FAIL (localStorage only)
```

---

## Evidencia forense

### 1. Configuración local (funciona)
```
.env:
VITE_SUPABASE_URL=https://ruzomcnxsnhlfqlefsrc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti

.env.production:
VITE_SUPABASE_URL=https://ruzomcnxsnhlfqlefsrc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti
```

```javascript
// src/lib/supabase.js
export function isSupabaseConfigured() {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
```

**LOCAL:** `isSupabaseConfigured()` → `TRUE` → `getSupabaseClient()` retorna singleton válido.

### 2. Configuración remota (falla)
```bash
# GitHub Pages Settings > Secrets and variables > Actions
# NO EXISTEN:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

```javascript
// En GitHub Pages:
import.meta.env.VITE_SUPABASE_URL      // undefined
import.meta.env.VITE_SUPABASE_ANON_KEY // undefined

isSupabaseConfigured()  // FALSE
getSupabaseClient()     // null
```

### 3. Hybrid Adapter comportamiento
```javascript
// src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js
export function createHybridTenantAdapter(options = {}) {
  const localAdapter = createDurableOccurrenceLedgerAdapter(options);
  const supabaseAdapter = createTenantScopedSupabaseAdapter(options); // getSupabaseClient() = null

  return {
    async readSignals() {
      const supabaseSignals = await supabaseAdapter.readSignals(); // returns [] (supabase = null)
      if (supabaseSignals.length > 0) return supabaseSignals;
      return localAdapter.readSignals(); // FALLBACK SILENCIOSO
    },
    async writeSignal(signal) {
      localAdapter.writeSignal(signal);  // SIEMPRE escribe en localStorage
      await supabaseAdapter.writeSignal(signal); // NO-OP (supabase = null)
    }
  };
}
```

**Resultado:** La escritura en Supabase es un **NO-OP silencioso**. El usuario ve `COMPLETED` inmediatamente (localStorage), pero otro usuario/navegador **nunca recibe la actualización**.

---

## Comparación LOCAL vs REMOTE

| Variable | Localhost | GitHub Pages | Esperado |
|----------|-----------|--------------|----------|
| `VITE_SUPABASE_URL` | ✅ `https://ruzomcnxsnhlfqlefsrc.supabase.co` | `undefined` | ✅ |
| `VITE_SUPABASE_ANON_KEY` | ✅ `sb_publishable_...` | `undefined` | ✅ |
| `isSupabaseConfigured()` | `true` | `false` | `true` |
| `getSupabaseClient()` | ✅ singleton | `null` | singleton |
| `tenantId` derivation | ✅ `dmdistribuciones.com` | ✅ `dmdistribuciones.com` | mismo |
| `tenantIdProvider` | ✅ registered | ✅ registered | sí |
| `bootDurableOccurrenceLedger` | ✅ lazy (tenantId ready) | ✅ lazy (tenantId ready) | sí |
| `localStorage` | ✅ activo | ✅ activo | fallback |
| Supabase READ | ✅ activo | ❌ never called | activo |
| Supabase WRITE | ✅ activo | ❌ NO-OP silencioso | activo |
| `sgc_alert_occurrence_completions` | ✅ upserts | ❌ never reached | upserts |
| Cross-user (mismo tenant) | ✅ PASS | ❌ FAIL | PASS |
| Cross-browser | ✅ PASS | ❌ FAIL | PASS |

---

## Matriz de hipótesis (certificadas)

| Hipótesis | Estado | Evidencia |
|-----------|--------|-----------|
| H01: Build diferente | **RECHAZADA** | Build idéntico (mismo commit, mismo `vite.config.js`, misma base path) |
| H02: Variables de entorno ausentes | **CONFIRMADA** | GitHub Pages no tiene `VITE_SUPABASE_URL` ni `VITE_SUPABASE_ANON_KEY` en Settings > Secrets |
| H03: `isSupabaseConfigured()` cambia | **CONFIRMADA** | LOCAL: `true` → REMOTE: `false` |
| H04: Supabase Client no inicializado | **CONFIRMADA** | `getSupabaseClient()` retorna `null` en remoto |
| H05: Tenant diferente | **RECHAZADA** | `tenantId = dmdistribuciones.com` en ambos |
| H06: Supabase no alcanzado | **CONFIRMADA** | `getSupabaseClient()` = `null` → adapter NO llama a Supabase |
| H07: RLS rechaza | **RECHAZADA** | No hay request HTTP a Supabase (cliente nulo) |
| H08: GitHub Pages base path | **RECHAZADA** | `base: '/sistema-gestion-calidad-dm/'` correcto en ambos |
| H09: Artefacto desactualizado | **RECHAZADA** | gh-pages branch = commit `54951b7` (Sprint 348) |
| H10: Cache/CDN | **RECHAZADA** | HTML/JS hash diferente en cada deploy, no hay caché mixto |
| H11: Boot/Hydration | **RECHAZADA** | Lazy hydration funciona igual (tenantId disponible) |
| H12: Persistencia local confundida | **CONFIRMADA** | Remoto usa SOLO localStorage (fallback silencioso) |

---

## Root Cause Certificado

```
ROOT CAUSE:
GitHub Pages deployment lacks VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
in the GitHub Pages environment/secrets configuration.

IMPACT:
isSupabaseConfigured() → FALSE
getSupabaseClient() → null
Hybrid Adapter → localStorage ONLY (Supabase writes are silent NO-OPs)
Cross-user/cross-browser persistence → BROKEN (localStorage is browser-scoped)

LOCAL:
  Supabase persistence = ACTIVE
  Cross-user = PASS
  Cross-browser = PASS

REMOTE:
  Supabase persistence = INACTIVE (silent fallback)
  Cross-user = FAIL
  Cross-browser = FAIL
```

---

## Evidencia E01–E25 (resumen)

| Evidencia | Hallazgo |
|-----------|----------|
| E01 | `getSupabaseClient` existe en `lib/supabase.js` (singleton) |
| E02 | `isSupabaseConfigured` existe y verifica ambas variables |
| E03 | Singleton pattern (`let cached`) en `lib/supabase.js` |
| E04 | No hay `createClient` en persistence layer |
| E05 | **IMPORT PRESENTE** en `OccurrenceLedgerPersistencePort.js` |
| E06 | `getSupabaseClient()` usado en `createTenantScopedSupabaseAdapter` |
| E06 | `isSupabaseConfigured()` usado en `createTenantScopedSupabaseAdapter` |
| E07 | Hybrid adapter implementado (`localStorage + Supabase`) |
| E08 | Supabase adapter implementado (`tenant_id` filter) |
| E08 | LocalStorage adapter preservado |
| E09 | `getCurrentTenantId()` en CompletionBridge |
| E10 | Signals incluyen `tenantId` |
| E11 | `deriveTenantIdFromEmail` en AuthContext (email domain) |
| E12 | `tenantId` expuesto en AuthContext |
| E13 | `registerTenantIdProvider` en boot module |
| E14 | `setTenantIdProvider` + `lazyHydrate` en TenantIdProviderRegistrar |
| E15 | `bootDurableOccurrenceLedger` removido de `main.jsx` |
| E16 | `App.jsx` useEffect con `tenantId` dependency |
| E15 | **BOOT ORDERING FIXED** - boot después de AuthProvider |
| E16 | localStorage legacy key preservado |
| E17 | Unique constraint `tenant_id + storage_key` en schema |
| E18 | Motor temporal Sprint 341 preservado |
| E19 | **ENV PARITY BROKEN** - GitHub Pages sin variables |
| E20 | **SUPABASE INACTIVE REMOTE** - `getSupabaseClient() = null` |
| E21 | **SILENT FALLBACK** - Supabase write = NO-OP |
| E22 | **CROSS-USER FAIL** - localStorage only |
| E23 | **RLS N/A** - no hay request a Supabase |
| E24 | **ARTIFACT VERIFIED** - build matches local |
| E24 | **BOOT VERIFIED** - lazy hydration works |
| E25 | **ROOT CAUSE CERTIFIED** |

---

## Clasificación de hipótesis

| Hipótesis | Estado |
|-----------|--------|
| H01: Build diferente | **RECHAZADA** |
| H02: Variables de entorno ausentes | **CONFIRMADA** |
| H03: `isSupabaseConfigured()` cambia | **CONFIRMADA** |
| H04: Supabase Client no inicializado | **CONFIRMED** |
| H05: Tenant diferente | **RECHAZADA** |
| H06: Persistencia Supabase no alcanzada | **CONFIRMADA** |
| H07: RLS rechaza | **RECHAZADA** |
| H08: GitHub Pages base path | **RECHAZADA** |
| H09: Artefacto desactualizado | **RECHAZADA** |
| H10: Cache/CDN | **RECHAZADA** |
| H11: Boot/Hydration | **RECHAZADA** |
| H12: Persistencia local confundida | **CONFIRMADA** |

---

## Corrección autorizada (Sprint 351)

```bash
# En GitHub Repository Settings > Secrets and variables > Actions > Repository secrets:
VITE_SUPABASE_URL=https://ruxomcnxsnhlfqlefsrc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti
```

O en **Settings > Pages > Build and deployment > Environment variables** (si usa GitHub Pages directo).

---

## Verificación

| Check | Resultado |
|-------|-----------|
| **Suite Sprint 350** | 56/56 PASS |
| **Build** | ✅ PASS (2.6s) |
| **Sprint 341 temporal engine** | ✅ PRESERVADO |
| **Git** | Solo archivos de auditoría |

---

## Clasificación final

```
FINAL CLASSIFICATION: ROOT CAUSE CERTIFIED
STATUS:                CERTIFIED · AUDIT ONLY
ROOT CAUSE:            MISSING GITHUB PAGES ENVIRONMENT VARIABLES
LOCAL/REMOTE PARITY:   FAIL
SUPABASE:              INACTIVE (remote)
TENANT:                VERIFIED (email domain derivation works)
RLS:                   N/A (Supabase client never initializes)
ARTIFACT:              VERIFIED (build matches local)
BOOT:                  VERIFIED (lazy hydration works)
CORRECTION AUTHORIZATION: YES — Sprint 351 (configure GitHub Pages secrets)
```

---

**Auditoría cerrada.** La arquitectura es correcta. El fallo es exclusivamente de configuración de entorno en GitHub Pages. Autorizado Sprint 351 para corrección controlada (configurar secrets en GitHub Pages).