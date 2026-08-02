# Sprint 187 — Alert Capability Operational Navigation Consolidation (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — OPERATIONAL NAVIGATION CERTIFIED
- **Type:** Navigation Consolidation · Existing Workspace Integration
- **Impact:** Alert Workspace · Dynamic Module · Document Repository · Runtime Navigation
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-01
- **Result:** **N1–N8 PASS** · Regresión Sprint 185 **B1–B10+B11 PASS** · Regresión Sprint 186 **F1–F8 PASS** · Build ~2.32s · Operational Navigation CERTIFIED

---

## 1. Objetivo

Consolidar la **navegación operacional** del Alert Workspace: todas las acciones conducen al **recurso operativo correcto reutilizando exclusivamente la navegación existente** de la aplicación.

Este Sprint **no modifica** el Runtime, el Binding ni la Visibilidad; **no crea** rutas nuevas ni componentes nuevos. Únicamente **certifica** la navegación operacional.

## 2. Problema detectado

- **Formularios** → `Ir al formulario` → Diligenciar Registro → ✅ correcto.
- **Documentos** → `Abrir documento` → ❌ no navegaba correctamente (abría el PDF directamente).

Lo correcto: `Ir al documento` → **Repositorio Documental** → **seleccionar el documento automáticamente** → el usuario lo visualiza o elimina (reutilizando el repositorio existente).

## 3. Decisión arquitectónica

> **Alert Monitoring NUNCA abre documentos directamente.**
> Su responsabilidad termina al entregar un **Navigation Descriptor**; la navegación reutiliza por completo el Repository existente.

```
Alert Workspace → Action Descriptor → Dynamic Module → Repositorio Documental → Documento seleccionado
```

NUNCA: `Alert Workspace → PDF Viewer → Documento`.

## 4. Cambios implementados

### `AlertNavigationResolver` (`alert/workspace/`)
- Acción documental **cambió**: `open-document` (Abrir documento) → **`go-to-document`** (**`Ir al documento`**) con `tab: 'repository'`.
- El descriptor ahora produce `{ action, resourceType, resourceId, documentId, moduleId, tab, metadata }`.

### `AlertWorkspaceActionDescriptor` (`alert/workspace/`)
- Nuevo contrato documental: `{ "action": "go-to-document", "moduleId", "resourceId", "documentId", "tab": "repository" }`. **Nunca ejecuta navegación; solo describe.**

### Pipe de `documentId` (hook + descriptor)
- `deriveRulesFromBinding` (hook) incluye `documentId` real del documento.
- `AlertRuleDescriptor` / `AlertConfigurationResolver` / `AlertConfigurationDescriptor` propagan `documentId` y `priorityLabel/message/active`.
- `alertsFromDescriptor` (hook) entrega `documentId` en la card documental.

### `AlertMonitoringExperience` (UI)
- `ACTION_ROUTE` documental → `{ path: /modulo/:slug, state: { tab: 'repository', selectedDocumentId } }`. Nada abre PDFs directo.

### `DynamicModule` (shell estándar)
- Lee `location.state.selectedDocumentId` y lo entrega a `RepositoryContent` → `ModuleDocumentViewer`.

### `ModuleDocumentViewer` (repositorio existente)
- Acepta `selectedDocumentId`: **scroll automático** + **resaltado** del documento.
- No modifica documentos, no abre modal nuevo, no crea visor nuevo. Visualizar/eliminar siguen disponibles tal como estaban.

## 5. Validaciones — Resultados

| # | Validación | Resultado |
|---|-----------|-----------|
| N1 | Formulario → navega correctamente (`open-form`) | **PASS** |
| N2 | Documento → abre Repositorio (`go-to-document`, `tab=repository`, `documentId`) | **PASS** |
| N3 | Documento seleccionado automáticamente (documentId presente) | **PASS** |
| N4 | Documento puede visualizarse (visor existente) | **PASS** |
| N5 | Documento puede eliminarse (navegación no administra) | **PASS** |
| N5B | Registro → sin cambios (`open-record`) | **PASS** |
| N6 | Workspace sin navegaciones rotas; etiqueta "Ir al documento" | **PASS** |
| N7 | Action Descriptor describe (nunca ejecuta navegación) | **PASS** |
| N8 | 100% navegación existente; sin rutas ni visores nuevos | **PASS** |

## 6. Certificación

- **Sprint 187:** N1–N8 **PASS** (`C:\tmp-test\sprint-187-navigation-certification.mjs`).
- **Regresión Sprint 185:** B1–B10 + B11 **PASS**.
- **Regresión Sprint 186:** F1–F8 **PASS**.
- **Build:** `npm run build` **PASS** (~2.32s).

## 7. Restricciones respetadas

- **No modificado:** Runtime Engine · Runtime Binding · Runtime Visibility · Alert Workspace ViewModel · Dashboard · Capability Resolver · Assignment Engine.
- **No creado:** Document Viewer nuevo · PDF Viewer nuevo · Repository nuevo · Navegador nuevo · Alert Module · Runtime paralelo.

```
LEVEL 4
ALERT CAPABILITY
OPERATIONAL NAVIGATION CERTIFIED

Workspace Navigation ............... ✅
Dynamic Forms Navigation ........... ✅
Document Repository Navigation ..... ✅
Action Descriptor .................. ✅
Dynamic Module Integration ......... ✅

100% Existing Navigation
100% Existing Repository
100% Existing Components
0 New Routes
0 New Viewers
0 Parallel Navigation
```
