# Sprint 347 — Alert Tenant Persistence Integration & Supabase Wiring Forensic Audit

**Estado:** **CERTIFIED · 124/124** · 0.1s · timebox OK
**Nivel:** 5 · **Tipo:** FORENSIC ARCHITECTURE AUDIT · AUDIT ONLY
**Branch:** `release/stable-sprint79`
**Precedentes:** Sprints 340 · 341 · 345 · 346
**Suite:** `scripts/sprint-347-alert-tenant-persistence-integration-supabase-wiring-forensic-audit.mjs`
**Production Source Changes:** 0

---

## Clasificación final

```
FINAL CLASSIFICATION: ROOT CAUSE CERTIFIED
STATUS:                CERTIFIED · AUDIT ONLY
ROOT CAUSE:
  1. Missing imports: getSupabaseClient/isSupabaseConfigured en OccurrenceLedgerPersistencePort.js
  2. Boot ordering: bootDurableOccurrenceLedger() antes de AuthContext → tenantIdProvider=null
ARCHITECTURE:          CORRECT — usa getSupabaseClient() singleton existente
CORRECTION AUTHORIZATION: YES — Sprint 348 (fix imports + boot ordering)
```

---

## Resumen del hallazgo

Sprint 346 introdujo una corrección controlada para persistencia tenant-scoped usando un hybrid adapter (localStorage + Supabase). El código compila y el build pasa, pero en runtime falla con:

```
ReferenceError: getSupabaseClient is not defined
    at createTenantScopedSupabaseAdapter (OccurrenceLedgerPersistencePort.js:150)
    at createHybridTenantAdapter (OccurrenceLedgerPersistencePort.js:268)
    at bootDurableOccurrenceLedger (OccurrenceLedgerDurableBoot.js:40)
    at main.jsx:12
```

---

## Root Cause (certificado)

### 1. Missing Imports (Causa directa)
El archivo `src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js` fue modificado en Sprint 346 para usar:
- `getSupabaseClient()`
- `isSupabaseConfigured()`

Pero **NO se agregaron los imports** correspondientes:
```javascript
// FALTANTE en OccurrenceLedgerPersistencePort.js:
import { getSupabaseClient, isSupabaseConfigured } from '../../../../lib/supabase.js';
```

El resto del proyecto (85+ ocurrencias) importa correctamente desde `../lib/supabase` o similar.

### 2. Boot Ordering (Causa contribuyente)
En `main.jsx`:
```javascript
bootDurableOccurrenceLedger();  // línea 12 - ANTES de createRoot

createRoot(...).render(
  <StrictMode>
    <AuthProvider>
      <TenantIdProviderRegistrar />
      <App />
    </AuthProvider>
  </StrictMode>,
);
```

El `bootDurableOccurrenceLedger()` se ejecuta **antes** de que `AuthProvider` se monte, por lo que:
- `tenantIdProvider` es `null` en el momento del boot
- El hybrid adapter recibe `getTenantId: () => null`
- Al intentar escribir en Supabase, `getTenantId()` retorna `null` y la escritura se aborta silenciosamente

---

## Arquitectura (verificada como CORRECTA)

### Supabase Client Ownership
- **Único owner**: `src/lib/supabase.js` exporta `getSupabaseClient()` (singleton) e `isSupabaseConfigured()`
- **85+ consumidores** en el proyecto usan este patrón correctamente
- Sprint 346 **NO introduce** `createClient` nuevo — reusa el singleton existente ✅

### Persistence Port Contract
El contrato original se mantiene intacto:
```javascript
{
  readSignals: () => Promise<Signal[]>,
  writeSignal: (signal) => void,
  clearSignals: () => void
}
```
Los adapters legacy (`in-memory`, `durable/localStorage`) no tocan Supabase. Solo los **nuevos adapters** (`tenant-scoped`, `hybrid`) usan Supabase — cumplen el contrato sin romper consumidores existentes.

### Hybrid Adapter
```javascript
createHybridTenantAdapter({
  localAdapter: createDurableOccurrenceLedgerAdapter(),  // localStorage inmediato
  supabaseAdapter: createTenantScopedSupabaseAdapter()   // Supabase tenant-scoped
})
```
- **Read**: Supabase primero → fallback localStorage
- **Write**: dual write (localStorage + Supabase)
- **Tenant isolation**: `tenant_id` en Supabase + `tenant::` prefix en keys

### Tenant Derivation
```javascript
// AuthContext.jsx
const tenantId = useMemo(() => deriveTenantIdFromEmail(user?.email), [user?.email]);
function deriveTenantIdFromEmail(email) {
  if (!email) return null;
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}
```
- `operativo@dmdistribuciones.com` → `dmdistribuciones.com`
- `calidad@polloscalenos.com` → `polloscalenos.com`
- No depende de rol, solo de email domain

### Boot Ordering Issue
```
main.jsx:12  bootDurableOccurrenceLedger()  ← ANTES de React tree
         14  createRoot().render(
         16    <AuthProvider>              ← AuthContext init aquí
         17      <TenantIdProviderRegistrar />  ← registra tenantIdProvider aquí
```

El boot ocurre **antes** de que `AuthProvider` monte → `tenantIdProvider = null` en boot.

---

## Hipótesis descartadas

| Hipótesis | Estado | Evidencia |
|-----------|--------|-----------|
| H01: Missing imports | **CONFIRMED** | `import { getSupabaseClient, isSupabaseConfigured }` ausente |
| H02: Boot ordering | **CONFIRMED** | `boot()` antes de `AuthProvider` |
| H03: tenantIdProvider null | **CONFIRMED** | `getTenantId: () => tenantIdProvider?.()` retorna null |
| H04: Wrong Supabase API | **REJECTED** | `getSupabaseClient()` existe y es correcto |
| H05: Duplicate client | **REJECTED** | Usa singleton existente, no `createClient` nuevo |
| H06: RLS bloquea | **REJECTED** | Error es `ReferenceError`, no error de RLS |
| H07: Missing migration | **REJECTED** | Error es `ReferenceError`, no tabla faltante |
| H08: Architecture deviation | **REJECTED** | Usa singleton existente, contrato intacto |

---

## Evidencia E01–E25 (resumen)

| E01 | `getSupabaseClient` existe en `lib/supabase.js` |
| E02 | `isSupabaseConfigured` existe en `lib/supabase.js` |
| E03 | Singleton pattern (`let cached`) |
| E04 | Usa `@supabase/supabase-js` `createClient` |
| E05 | **IMPORT FALTANTE** en `OccurrenceLedgerPersistencePort.js` |
| E06 | **IMPORT PATH FALTANTE** (`../../../../lib/supabase.js`) |
| E07 | Sprint 346 introdujo uso de `getSupabaseClient()` |
| E08 | Sprint 346 introdujo uso de `isSupabaseConfigured()` |
| E09 | Hybrid adapter implementado |
| E10 | Supabase adapter implementado |
| E11 | LocalStorage adapter preservado |
| E12 | Bridge usa `getCurrentTenantId()` |
| E13 | Signals incluyen `tenantId` |
| E14 | `tenantId` derivado de email domain |
| E15 | `tenantId` expuesto en `AuthContext` |
| E16 | `setTenantIdProvider` en boot module |
| E17 | `TenantIdProviderRegistrar` registra provider |
| E18 | `bootDurableOccurrenceLedger()` en `main.jsx` |
| E19 | `AuthProvider` envuelve app |
| E20 | `TenantIdProviderRegistrar` en tree |
| E21 | **BOOT ORDERING ISSUE**: boot() antes de AuthContext |
| E22 | localStorage legacy key preservado |
| E23 | Unique constraint `tenant_id + storage_key` en schema Supabase |
| E24 | Motor temporal preservado (Sprint 341) |
| E25 | **ROOT CAUSE CERTIFIED** |

---

## Corrección autorizada (Sprint 348)

| Cambio | Archivo | Descripción |
|--------|---------|-------------|
| **Fix imports** | `OccurrenceLedgerPersistencePort.js` | Agregar `import { getSupabaseClient, isSupabaseConfigured } from '../../../../lib/supabase.js';` |
| **Fix boot ordering** | `main.jsx` | Mover `bootDurableOccurrenceLedger()` **después** de `createRoot` o usar `useEffect` en `App` |
| **Lazy hydration** | `OccurrenceLedgerDurableBoot.js` | Hacer `hydrateFromPersistencePort()` lazy (cuando `tenantIdProvider` esté listo) |

No se autoriza:
- ❌ Cambiar `getSupabaseClient()` API
- ❌ Introducir segundo `createClient`
- ❌ Cambiar `OccurrenceSchedule` / motor temporal
- ❌ Modificar `CompletionBridge` / `OccurrenceLedger` contracts

---

## Verificación

```
Suite: scripts/sprint-347-...mjs → 124/124 PASS
Build: ✅ 2.5s
Git: 0 production source changes (AUDIT ONLY)
```

---

**Auditoría cerrada:** La arquitectura de persistencia tenant-scoped es correcta. El fallo es puramente de wiring (imports faltantes + boot ordering). Autorizado Sprint 348 para corrección controlada.