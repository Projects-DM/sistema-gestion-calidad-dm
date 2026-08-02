# Sprint 189 — Alert Capability Context Navigation Decoupling (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — CONTEXT NAVIGATION CERTIFIED
- **Type:** UI Context Decoupling · Existing Repository Integration
- **Impact:** Alert Workspace · Dynamic Module · Repository Context Navigation
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-01
- **Result:** **C1–C10 PASS** · Regresión Sprint 185 **B1–B10+B11 PASS** · Regresión Sprint 186 **F1–F8 PASS** · Regresión Sprint 187 **N1–N8 PASS** · Regresión Sprint 188 **R1–R10 PASS** · Build ~2.34s · Context Navigation CERTIFIED

---

## 1. Objetivo

Desacoplar por completo la **navegación operacional** del **estado interno del Repository**.

El Alert Workspace debe **navegar al módulo**, **abrir la pestaña correspondiente** y **mostrar el contexto del recurso**, pero **nunca modificar el estado operativo interno** del componente que lo consume.

## 2. Problema detectado

```
Alert Workspace → DynamicModule → Repository → selectedDocumentId = documentId
```

El Repository interpretaba `selectedDocumentId` como si el usuario hubiera realizado una **selección manual**:

- el documento quedaba **seleccionado**,
- **permanecía activo**,
- **bloqueaba la navegación**,
- obligaba al usuario a **deseleccionarlo**.

Eso rompe el principio de **consumo pasivo**.

## 3. Decisión arquitectónica

> **El Workspace únicamente puede entregar un Navigation Context. Nunca un Selection State.**

Existe una diferencia fundamental entre:

- **Context** — "este es el recurso que vengo a ver": navegar, abrir pestaña, localizar, scroll, resaltado temporal.
- **Selection** — "el usuario marcó este documento": persistente, activa menús, bloquea navegación.

El Workspace entrega **Context**. El Repository decide cómo presentarlo **sin mutar su estado interno**.

## 4. Flujo certificado

```
Alert Workspace
  → Action Descriptor (go-to-document, documentId)
  → Existing Route Resolver (canonicalRoute = /:slug)
  → Dynamic Module (tab = repository)
  → Repository (navigationContext)
  → Scroll / Highlight temporal
  → Estado limpio (contexto consumido → null)
```

NUNCA: `Selection`.

## 5. Cambios implementados

### `AlertMonitoringExperience` (UI)
- `go-to-document` ya NO entrega `selectedDocumentId`. Entrega **`navigationContext`**:
  ```json
  {
    "tab": "repository",
    "navigationContext": {
      "resourceType": "document",
      "resourceId": "doc-1"
    }
  }
  ```
- El Workspace sigue consumiendo el mismo Action Descriptor y el mismo Route Resolver (Sprint 188).

### `DynamicModule` (shell estándar)
- `RepositoryContent` recibe **`navigationContext`** (`location.state?.navigationContext`) en lugar de `selectedDocumentId`. El tab se dirige igual por `location.state?.tab`.

### `ModuleDocumentViewer` (Repository existente — reutilizado)
- Nuevo contrato de entrada: `{ moduleSlug, navigationContext }`.
- **Consumo único:** el contexto se consume UNA vez (`navigationTarget`); tras el primer render el Repository vuelve a estado neutro.
- **Localización:** `documentRefs` + `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
- **Resaltado temporal:** `contextHighlightId` + `highlightVisible` con **fade programado** (`setHighlightVisible(false)` tras ~1.6s, limpieza total a los ~2.4s).
- **NUNCA:** `selected=true`, apertura de menú, modo edición, modo reemplazo, modo eliminación. Visualizar/eliminar siguen disponibles como siempre (el contexto no los bloquea).

## 6. Validaciones — Resultados

| Validación | Resultado |
|---|---|
| C1 — Navega correctamente al módulo | ✅ |
| C2 — Abre automáticamente Repository | ✅ |
| C3 — Hace scroll al documento | ✅ |
| C4 — Resalta temporalmente el documento | ✅ |
| C5 — No queda seleccionado | ✅ |
| C6 — Puede cambiar inmediatamente a Historial | ✅ |
| C7 — Puede cambiar inmediatamente a Diligenciar Registro | ✅ |
| C8 — No bloquea navegación del módulo | ✅ |
| C9 — No modifica estado interno del Repository | ✅ |
| C10 — Build PASS | ✅ (~2.34s) |

## 7. Definition of Done

- [x] Alert Workspace solo entrega **contexto de navegación**.
- [x] Repository consume el contexto **una única vez**.
- [x] El documento se localiza automáticamente.
- [x] El documento se resalta de forma **temporal** (fade → limpieza).
- [x] No queda seleccionado.
- [x] No bloquea ninguna pestaña del módulo.
- [x] El usuario puede navegar libremente inmediatamente después.
- [x] Build exitoso.

## 8. Restricciones cumplidas

- **No modificado:** Runtime, Runtime Binding, Runtime Visibility, Workspace core (`alert/workspace/`), Dashboard, Capability Resolver, Assignment Engine, React Router.
- **No creado:** Repository paralelo, Navigation Engine, Selection Engine, Highlight Manager, nuevo estado global.
- **100% Existing Repository · 100% Existing Navigation · 100% Stateless Context.**

## 9. Certificación

```
SPRINT 189 — ALERT CAPABILITY · CONTEXT NAVIGATION CERTIFIED
  Existing Navigation ............. ✅
  Repository Context .............. ✅
  Temporary Highlight ............. ✅
  Stateless Navigation ............ ✅
  UI Decoupling ................... ✅

  100% Existing Repository · 100% Existing Navigation · 100% Stateless Context
  0 Persistent Selection · 0 UI Lock · 0 Parallel Components · 0 Parallel Navigation
```

**CONTEXT NAVIGATION CERTIFIED.**
