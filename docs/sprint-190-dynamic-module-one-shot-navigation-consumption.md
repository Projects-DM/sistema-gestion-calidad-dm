# Sprint 190 — Dynamic Module One-Shot Navigation Consumption (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — CORE NAVIGATION SHELL CERTIFIED
- **Type:** Core Shell Navigation Correction
- **Impact:** DynamicModule · DynamicModuleById · Core Navigation · Repository · Dynamic Forms · Dynamic Records · Operational Experiences
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-01
- **Result:** **D1–D10 PASS** · Regresión Sprint 185 **B1–B10+B11 PASS** · Regresión Sprint 186 **F1–F8 PASS** · Regresión Sprint 187 **N1–N8 PASS** · Regresión Sprint 188 **R1–R10 PASS** · Regresión Sprint 189 **C1–C10 PASS** · Build ~2.43s · Core Navigation Shell CERTIFIED

---

## 1. Objetivo

Eliminar definitivamente el **bloqueo de navegación provocado por `location.state`** implementando un mecanismo de **One-Shot Navigation Consumption** dentro del Dynamic Module: cualquier navegación contextual proveniente del Router se consume **exactamente una vez** y, tras el primer render, el estado de navegación desaparece automáticamente **sin afectar el historial del navegador**.

## 2. Problema certificado

```
navigate("/calidad", { state: { tab: "repository", navigationContext: {...} } })
```

permanece **vivo durante toda la vida del módulo**. Cada render ejecutaba nuevamente `if (location.state.tab === "repository")`, provocando:

- regreso automático al Repository,
- imposibilidad de cambiar de pestaña,
- navegación "pegada".

## 3. Solución arquitectónica

Se introduce un **único consumidor** del estado de navegación:

```
React Router → location.state → NavigationStateConsumer → DynamicModule → clear consumed state → UI libre
```

## 4. Componentes (`core/navigation/`)

### `NavigationStateContract.js`
- Shape certificado del estado navegable: `tab`, `navigationContext`, `selectedRecord`, `selectedForm`, `selectedDocument`.
- `isNavigationState`, `extractNavigationState`, `validateNavigationState` — solo consume claves certificadas, nunca arbitrarias.

### `NavigationStateConsumer.js`
- `createNavigationStateConsumer()` — consume el estado **exactamente una vez** por mount.
- `consume()` extrae el snapshot una sola vez; un segundo `consume()` devuelve `null` (guard).

### `NavigationStateLifecycle.js`
- `createNavigationLifecycle()` — después del consumo ejecuta el único `replace(currentPath, { state: null })` **no histórico** (no agrega entrada al historial).
- Limpieza **idempotente**: nunca limpia dos veces (`already-cleared`), nunca hace push, nunca re-inyecta estado.

### `NavigationStateBoundary.js`
- Orquestador de un solo mount que combina Consumer + Lifecycle.
- Garantiza: **nunca consumir dos veces**, **nunca re-inyectar state**, **nunca producir loops** (`consumeOnce`).
- `reset()` permite consumo fresco en cada montaje (cambio de módulo).

### `DynamicModule` (Shell estándar)
- Sustituye la lectura directa de `location.state?.tab` / `location.state?.navigationContext` por un estado `navigationState` consumido una vez.
- El intent se extrae con `extractNavigationState` y el `location.state` se limpia con `navigate(location.pathname, { replace: true, state: null })`.
- `navigationState?.tab` dirige el tab inicial; `navigationState?.navigationContext` se entrega al Repository. Las pestañas quedan **libres** inmediatamente.
- Mismo intent repetido → `navigationProcessedRef` lo descarta (sin loops). Nuevo intent (otra alerta / otro módulo) → nuevo consumo.

## 5. Validaciones — Resultados

| Caso | Esperado | Resultado |
|---|---|---|
| D1 — Entrar desde Alert Workspace | consume tab + contexto | ✅ |
| D2 — Abrir Repository | tab consumido una vez, replace no histórico | ✅ |
| D3 — Cambiar inmediatamente a Historial | sin re-captura del intent | ✅ |
| D4 — Cambiar a Diligenciar Registro | forms libre | ✅ |
| D5 — Cambiar nuevamente a Repository | decisión de tab normal, no forzada | ✅ |
| D6 — Cambiar de módulo | cada mount consume su intent | ✅ |
| D7 — Volver mediante otra alerta | contexto nuevo | ✅ |
| D8 — El Router state desaparece tras el primer render | `replace → state:null` | ✅ |
| D9 — Sin loops | segundo consume → null | ✅ |
| D10 — Build PASS | shell sin Router paralelo | ✅ (~2.43s) |

## 6. Definition of Done

- [x] El estado recibido desde `location.state` se consume **exactamente una vez**.
- [x] Después del consumo, la navegación del módulo queda **completamente libre**.
- [x] Las pestañas funcionan normalmente.
- [x] Las alertas siguen navegando correctamente.
- [x] No existen bucles de navegación.
- [x] No se crean rutas ni componentes paralelos.
- [x] Build exitoso.

## 7. Restricciones cumplidas

- **No modificado:** Alert Capability, Runtime, Workspace core, Repository, Dynamic Forms, Dynamic Records, Dashboard, React Router, Capability Resolver.
- **No creado:** rutas nuevas, componentes paralelos.
- Solo se corrigió el **consumo del estado de navegación dentro del Shell**.

## 8. Certificación

```
SPRINT 190 — ALERT CAPABILITY · CORE NAVIGATION SHELL CERTIFIED
  D1–D10            → PASS
  Regresión 185     → B1–B10 + B11 PASS
  Regresión 186     → F1–F8 + INT/BOUNDARY PASS
  Regresión 187     → N1–N8 PASS
  Regresión 188     → R1–R10 PASS
  Regresión 189     → C1–C10 PASS
  Build             → PASS (~2.43s)
```

**CORE NAVIGATION SHELL CERTIFIED.** El estado de navegación se consume una sola vez y desaparece tras el primer render; el bloqueo de navegación queda eliminado.
