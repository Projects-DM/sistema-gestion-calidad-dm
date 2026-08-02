# Sprint 191 — Alert Capability Operational Navigation State Audit (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — OPERATIONAL NAVIGATION AUDIT
- **Type:** Root Cause Analysis · Navigation State Audit · Existing Component Verification
- **Impact:** DynamicModule · RepositoryContent · ModuleDocumentViewer · Alert Workspace · Existing Navigation
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-01
- **Tipo de sprint:** **100% AUDITORÍA** — ninguna modificación funcional

---

## 1. Objetivo

Identificar la **causa raíz** por la cual el módulo **vuelve automáticamente al Repositorio Documental** después de una navegación iniciada desde Alert Monitoring, una vez que el usuario intenta cambiar a otra pestaña (Historial, Diligenciar Registro, etc.).

## 2. Hipótesis auditadas (veredicto)

| Hipótesis | Veredicto |
|---|---|
| **H1** — `location.state` nunca deja de consumirse | ❌ **DESCARTADA.** El efecto one-shot (líneas 228–244) sí consume una vez y limpia `location.state` con `navigate(replace, state:null)`. |
| **H2** — `navigationContext` permanece vivo en `RepositoryContent` | ⚠️ **PARCIAL.** El contexto se entrega (correcto), pero no es la causa del regreso de tab. |
| **H3** — `ModuleDocumentViewer` reacciona continuamente | ❌ **DESCARTADA.** Consume el contexto una vez (refs `navigationTarget` + highlight con fade). Nunca toca `activeTab`. |
| **H4** — Tab State: ¿quién modifica `activeTab`? | ✅ **AUDITADA.** Hay 4 escritores; el culpable es el efecto de tab. Ver §4. |
| **H5** — Navegación inversa `setActiveTab("repository")` | ✅ **CONFIRMADA.** La llama el **efecto de tab** (línea 301), NO el usuario. |
| **H6** — Efectos en cascada | ✅ **CONSTRUIDA.** Cadena completa en §5. |

## 3. Mapa completo del flujo

```
Alert Workspace (AlertMonitoringExperience)
   │  ACTION_ROUTE['go-to-document'] → resolveActionRoute → canonicalRoute
   │  navigate("/calidad", { state: { tab:"repository", navigationContext:{...} } })
   ▼
DynamicModule (src/pages/DynamicModule.jsx)
   │  location.state  →  one-shot effect (L228–244)  →  setNavigationState(consumed)   ⚠️ NUNCA se limpia
   │  navigate(location.pathname, { replace:true, state:null })   →  limpia el ROUTER (no el estado React)
   │  tab effect (L297–308)  →  setActiveTab(navigationState.tab)   ⚠️ se RE-EJECUTA con cada cambio de activeTab
   ▼
RepositoryContent (DynamicModule L107–113)
   │  prop: navigationContext={navigationState?.navigationContext}   (vive mientras navigationState viva)
   ▼
ModuleDocumentViewer (modules/documentViewer)
   │  consume navigationContext UNA vez → navigationTarget → scrollIntoView + highlight (fade)
   │  NUNCA toca activeTab, NUNCA navega, NUNCA selecciona
```

## 4. Lista exacta de componentes que modifican `activeTab` / `navigationContext` / `selectedDocument`

### `activeTab` — modificado ÚNICAMENTE en `DynamicModule.jsx` (4 escritores)

| Línea | Escritor | Valor | Legítimo |
|---|---|---|---|
| L255 | `setActiveTab(null)` — dentro de `loadModuleAndForms` | `null` (reset en carga) | ✅ |
| L301 | `setActiveTab(fromState)` — **efecto de tab** (deps: `[capabilityPublicSet, activeTab, navigationState?.tab]`) | `navigationState?.tab` (**'repository' vivo**) | ❌ **CULPABLE** |
| L306 | `setActiveTab(defaultKey)` — efecto de tab (default) | `getDefaultTabKey()` | ✅ |
| L406 | `setActiveTab(tab.key)` — onClick del botón de pestaña | la pestaña elegida por el usuario | ✅ |

### `navigationContext` — entregado en `DynamicModule.jsx` L352 → consumido en `ModuleDocumentViewer` L61–68

### `selectedDocument` / `selectedRecord` / `selectedForm` — parte del contrato `NavigationStateContract`, NO presentes en el flujo observado (no causan el regreso).

## 5. Secuencia cronológica (cadena de cascada completa)

```
1. Alert Workspace navega:  navigate("/calidad", { state:{ tab:"repository", navigationContext } })
2. Render 1 — DynamicModule monta; navigationState = null (estado React inicial)
3. Efecto one-shot (L228–244) corre:  consume location.state
      → setNavigationState({ tab:'repository', navigationContext })
      → navigate(location.pathname, { replace:true, state:null })   ← limpia SOLO el Router
4. Render 2 — navigationState?.tab = 'repository'
5. Efecto de tab (L297–308) corre (deps: navigationState?.tab cambió):
      → fromState = 'repository' → getTab('repository') truthy → setActiveTab('repository')   ✅ correcto (abre Repository)
6. RepositoryContent renderiza; ModuleDocumentViewer consume el contexto una vez (scroll + highlight + fade)
   ✅ Navegación inicial FUNCIONA.

--- EL PROBLEMA APARECE AQUÍ ---

7. Usuario hace clic en "Historial" → onClick L406 → setActiveTab('records')
8. Render — activeTab = 'records'
9. Efecto de tab (L297–308) corre DE NUEVO (deps: activeTab cambió):
      → fromState = navigationState?.tab = 'repository'   ⚠️ navigationState NUNCA se limpió (sigue vivo)
      → getTab('repository') truthy → setActiveTab('repository')   ⚠️ FORZADO DE VUELTA
10. Render — activeTab vuelve a 'repository'
11. Cualquier clic en otra pestaña → repetir 7–10 → NAVEGACIÓN PEGADA
```

**El bucle no es infinito de renders; es un estado estable capturado:** cualquier intento de abandonar `repository` es revertido por el efecto de tab en el mismo ciclo.

## 6. IDENTIFICACIÓN DE LA CAUSA RAÍZ (única respuesta)

| Atributo | Valor |
|---|---|
| **Componente responsable** | **`DynamicModule.jsx`** (el Shell estándar) |
| **Efecto responsable** | El **`useEffect` de tab** (líneas **297–308**) |
| **Variable que permanece viva** | **`navigationState`** (estado React, línea 225), con `navigationState.tab === 'repository'` — seteada en línea 240 y **NUNCA resetada a `null`** |
| **Mecanismo exacto** | El efecto de tab depende de `[capabilityPublicSet, activeTab, navigationState?.tab]`. Como `navigationState.tab` **nunca se limpia** tras el consumo one-shot, el efecto **se re-ejecuta en cada cambio de `activeTab`** y vuelve a leer `navigationState?.tab = 'repository'`, llamando `setActiveTab('repository')` — **anulando la decisión del usuario**. |
| **Por qué Sprint 190 no lo resolvió** | Sprint 190 limpió el `location.state` del **Router** (`replace state:null`), pero la copia del intent quedó guardada en el **estado React local `navigationState`**, que el efecto de tab sigue releyendo indefinidamente. |

## 7. Evidencia por línea

- `src/pages/DynamicModule.jsx:225` — `const [navigationState, setNavigationState] = useState(null);`
- `src/pages/DynamicModule.jsx:240` — `setNavigationState(consumed);`  ← única asignación, nunca reset
- `src/pages/DynamicModule.jsx:297-308` — efecto de tab: `const fromState = navigationState?.tab;` → `setActiveTab(fromState);` con deps `[capabilityPublicSet, activeTab, navigationState?.tab]`
- `src/pages/DynamicModule.jsx:406` — onClick del usuario → `setActiveTab(tab.key)` (anulado por L301)
- `src/modules/documentViewer/ModuleDocumentViewer.jsx:61-68` — consume contexto una vez (ref `navigationTarget`); sin efecto sobre tabs.

## 8. Definition of Done — cumplido

- [x] Identificada la **causa raíz**: el efecto de tab de `DynamicModule` re-lee `navigationState.tab` que nunca se limpia.
- [x] Identificado el **componente responsable**: `DynamicModule.jsx`.
- [x] Identificado el **efecto responsable**: `useEffect` (L297–308).
- [x] Identificada la **variable que permanece viva**: `navigationState` (`navigationState.tab`).
- [x] Documentado el **flujo completo** (mapa + cadena cronológica).
- [x] **Ninguna modificación funcional realizada** (sprint 100% auditoría).

## 9. Nota para el sprint de corrección

La corrección (fuera del alcance de este sprint de auditoría) consistirá en **re-marcar `navigationState` a `null` después de que el tab haya sido aplicado** (consumo one-shot completo), de modo que el efecto de tab deje de re-leer `navigationState.tab` en cambios posteriores de `activeTab` — sin tocar Runtime, Workspace, Router, Repository ni contratos.
