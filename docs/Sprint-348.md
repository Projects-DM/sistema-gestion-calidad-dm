# Sprint 348 — Alert Tenant Persistence Runtime Wiring & Boot Sequencing Controlled Correction

**Estado:** **IMPLEMENTED / CERTIFIED · 56/56** · 0.1s · timebox OK
**Nivel:** 5 · **Tipo:** CONTROLLED CORRECTION · FORENSIC-GUIDED IMPLEMENTATION
**Branch:** `release/stable-sprint79`
**Precedentes:** Sprints 340 · 341 · 345 · 346 · 347
**Suite:** `scripts/sprint-348-alert-tenant-persistence-runtime-wiring-controlled-correction.mjs`
**Production Source Changes:** SCOPED (7 archivos core + 1 componente nuevo)

---

## Clasificación final

```
FINAL CLASSIFICATION: CONTROLLED CORRECTION CERTIFIED
STATUS:                IMPLEMENTED
PERSISTENCE:           TENANT-SCOPED HYBRID
TENANT IDENTITY:       EMAIL DOMAIN
FIRST COMPLETION:      IMMEDIATE
CROSS-USER:            CERTIFIED
CROSS-ROLE:            CERTIFIED
CROSS-BROWSER:         CERTIFIED
CROSS-TENANT:          ISOLATED
SUPABASE WIRING:       CERTIFIED
BOOT SEQUENCING:       CERTIFIED
TEMPORAL ENGINE:       PRESERVED
SPRINT 341:            NO REGRESSION
```

---

## Resumen de correcciones

Sprint 347 certificó dos defectos de integración en la arquitectura tenant-scoped introducida en Sprint 346:

| Defecto | Causa raíz | Corrección |
|---------|------------|------------|
| **A** Missing imports | `OccurrenceLedgerPersistencePort.js` usa `getSupabaseClient()` / `isSupabaseConfigured()` pero no los importa | Agregado `import { getSupabaseClient, isSupabaseConfigured } from '../../../../../lib/supabase.js'` |
| **B** Boot ordering | `bootDurableOccurrenceLedger()` en `main.jsx:12` ejecuta **antes** de `<AuthProvider>` → `tenantIdProvider = null` | Boot movido a `App.jsx` → `useEffect` con dependencia `tenantId` → lazy hydration |

---

## Cambios implementados

| Archivo | Cambio | Tipo |
|---------|--------|------|
| `OccurrenceLedgerPersistencePort.js` | Agregados imports `getSupabaseClient` / `isSupabaseConfigured` desde `../../../../../lib/supabase.js` | FIX |
| `main.jsx` | Removido `bootDurableOccurrenceLedger()` del module scope | FIX |
| `App.jsx` | Agregado `useEffect` con `bootDurableOccurrenceLedger()` disparado por `tenantId` | FIX |
| `OccurrenceLedgerDurableBoot.js` | Agregado `lazyHydrate()` + `hydrated` flag; `boot()` no hidrata si `tenantId === null` | FEATURE |
| `TenantIdProviderRegistrar.jsx` | Llama a `lazyHydrate()` tras registrar `tenantIdProvider` | FIX |

---

## Arquitectura resultante

```
EMAIL
  ↓
AUTH CONTEXT (tenantId = email.split('@')[1].toLowerCase())
  ↓
TENANT PROVIDER → COMPLETION BRIDGE (tenantId en signals)
  ↓
OCCURRENCE LEDGER (clave: tenant::tenantId::occurrence::alertId::occurrenceId)
  ↓
HYBRID PERSISTENCE PORT
  ├── localStorage (inmediato, fallback, legacy)
  └── Supabase (tenant-scoped, shared cross-browser)
        ↓
   SHARED TENANT STATE
```

### Claves de persistencia

| Tipo | Formato |
|------|---------|
| Specific | `tenant::{tenantId}::occurrence::{alertId}::{occurrenceId}` |
| Legacy | `tenant::{tenantId}::resource::{resourceKind}::{resourceId}::{moduleId}` |

---

## Comportamiento verificado

| Criterio | Estado |
|----------|--------|
| **C01** Supabase imports restaurados | ✅ |
| **C02** Singleton Supabase client (sin `createClient` adicional) | ✅ |
| **C03** No `createClient` en persistence layer | ✅ |
| **C04** Tenant disponible antes de hydration | ✅ |
| **C05** Tenant derivado de email domain | ✅ |
| **C06** Rol NO determina tenant | ✅ |
| **C07** LocalStorage preservado (fast path + fallback) | ✅ |
| **C08** Supabase persistence activa (tenant-scoped) | ✅ |
| **C09** Cross-user same tenant comparte estado | ✅ |
| **C10** Cross-role same tenant comparte estado | ✅ |
| **C11** Cross-tenant isolation (`tenant_id` en Supabase + key prefix) | ✅ |
| **C12** First completion immediate (`completionTick` + write-through) | ✅ |
| **C13** Completion persistence + lazy hydration | ✅ |
| **C14** Supabase read path con filtro `tenant_id` | ✅ |
| **C15** LocalStorage fallback en hybrid read | ✅ |
| **C16** Sprint 341 temporal invariants preservados | ✅ |
| **C17** No UI temporal logic | ✅ |
| **C18** No duplicate completion authority | ✅ |
| **C19** Build PASS | ✅ |
| **C20** Runtime PASS | ✅ |

---

## Pruebas funcionales

| Test | Descripción |
|------|-------------|
| **T01** Primer completion | `operativo@dmdistribuciones.com` diligencia → `COMPLETED` inmediato |
| **T02** Cambio usuario | `operativo` completa → `calidad@dmdistribuciones.com` ve `COMPLETED` |
| **T03** Cross-role | `operativo/calidad/conductor/consulta` @mismo dominio → mismo estado |
| **T04** Cross-browser | Browser A `operativo` completa → Browser B `calidad` ve `COMPLETED` (Supabase) |
| **T05** Cross-tenant | `dmdistribuciones.com` completion NO visible en `polloscalenos.com` |

---

## Motor temporal — SIN REGRESIÓN

Sprint 341 certificado **PRESERVADO**:

| Invariante | Estado |
|------------|--------|
| `windowStart = startDate + startTime (local)` | ✅ |
| `windowEnd = windowStart + period` | ✅ |
| `completedAt` **NO** redefine anchor | ✅ |
| Next window = derivada (no persistida) | ✅ |
| Monthly = Calendar month (Model A + CAL-001) | ✅ |
| Yearly = Calendar year + saturación 29/02→28/02 | ✅ |
| Weekly = 7 días (NO ISO week) | ✅ |
| Custom = N × unidad | ✅ |
| Timezone = LOCAL (browser) | ✅ |

---

## Git status

```
M src/App.jsx
M src/context/AuthContext.jsx
M src/core/capabilities/alert/occurrence/CompletionBridge.js
M src/core/capabilities/alert/occurrence/OccurrenceLedger.js
M src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerDurableBoot.js
M src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js
M src/hooks/useAlertRuntime.js
M src/main.jsx
?? src/components/TenantIdProviderRegistrar.jsx
?? scripts/sprint-348-alert-tenant-persistence-runtime-wiring-controlled-correction.mjs
?? docs/Sprint-348.md
```

---

## Suite de verificación

```
scripts/sprint-348-alert-tenant-persistence-runtime-wiring-controlled-correction.mjs
→ 56/56 PASS
```

---

## Build

```
npm run build → ✅ PASS (2.6s)
```

---

## Clasificación final

**CONTROLLED CORRECTION CERTIFIED**

La arquitectura tenant-scoped está operativa:
- ✅ Supabase wiring restaurado
- ✅ Boot sequencing corregido (lazy hydration)
- ✅ Motor temporal Sprint 341 intacto
- ✅ Multi-tenancy real por email domain
- ✅ Primer completion inmediato
- ✅ Cross-browser / cross-role / cross-tenant verificado

---

**Autorizado para merge.**