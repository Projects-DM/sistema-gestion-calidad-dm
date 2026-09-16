# Sprint 186 — Alert Capability Operational Resource Integrity Audit (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — OPERATIONAL RESOURCE INTEGRITY AUDIT
- **Type:** Resource Integrity Audit · Master SSOT Level 4
- **Impact:** `alert/runtime-audit/` (nueva capa) · `useAlertRuntime` · Alert Runtime Binding (`alert/runtime-binding/`) · Dynamic Forms · Dynamic Records · Document Repository
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-01
- **Result:** **F1–F8 PASS** · Regresión Sprint 185 **B1–B10+B11 PASS** · Build ~2.33s · Runtime Audit v1 · Resource Integrity CERTIFIED

---

## 1. Problema detectado

Alert Monitoring mostraba recursos que **no aparecen** en el **Workspace Operacional** (Diligenciar Registros / Repositorio Documental):

- Documentos **huérfanos / archivados / ocultos** (p. ej. "Ficha Técnica XXXXX" visible como alerta pero inexistente en el Repositorio).
- Formularios/registros de módulos **no operacionales**, **archivados** o **históricos**.
- Recursos que rompen el **SSOT** (Base de datos → Recursos históricos → Alert Workspace).

## 2. Principio

> **El Runtime solo puede consumir lo que el usuario puede operar.**

```
Administrador → Módulo → Recursos visibles → Runtime Binding → Alert Workspace
```

NUNCA:

```
Base de datos → Recursos históricos → Alert Workspace   (PROHIBIDO)
```

**Workspace Operacional = Dynamic Forms visibles + Dynamic Records visibles + Document Repository visible = Operational Resource Set.**

## 3. Decisiones del usuario

| Pregunta | Decisión |
|----------|----------|
| ¿Cómo se determina la visibilidad de documentos (`sgc_records` sin columna `is_active`)? | **Vía estado de repositorio/categoría** (`sgc_document_repositories.is_active` + `sgc_document_repository_categories.is_active`). Coincide exactamente con `ModuleDocumentViewer` (`repositoriesForUI`). Sin cambio de esquema. |
| ¿Cómo gatea la auditoría el Runtime Binding? | **Filtrar antes del binding**: solo el Operational Resource Set fluye a `runtimeBinding({...base, existing: visibleSet})`; el reporte se devuelve además para diagnóstico. |
| ¿Qué pasa con registros cuyo form padre está inactivo/no visible? | **Se excluyen del runtime** (orphan) — satisface F7/F8. |

## 4. Nueva capa `alert/runtime-audit/` (7 archivos)

| Archivo | Responsabilidad |
|---------|-----------------|
| `RuntimeSourceIntegrityPolicy.js` | Estados de integridad (`valid/orphan/archived/hidden/detached/inactive/deleted/unknown`); `isModuleOperational` (solo `state==='operational'` && `visible` && `is_active`); `classifyForm/classifyRecord/classifyDocument`. |
| `ResourceVisibilityValidator.js` | `buildResourcePolicyContext` + `validateResourceVisibility` (exists && belongsToModule && visibleInWorkspace && enabled && navigable); `buildDocumentVisibilityIndex` mapea `type → { moduleSlug, repositoryActive, categoryActive }`. |
| `WorkspaceResourceResolver.js` | Resuelve SOLO Dynamic Forms + Dynamic Records + Document Repository. Nunca tablas externas, históricos, módulos archivados ni recursos ocultos. |
| `OperationalResourceAudit.js` | Inventario `{forms:[], records:[], documents:[]}`. Audita forms PRIMERO; los form ids visibles son los ÚNICOS padres válidos de records. Nunca consulta Runtime ni genera Alert Context. |
| `RuntimeAuditReport.js` | Reporte `{scanned, valid, orphan, archived, hidden, rejected}` (cada uno con `{forms, records, documents, total}`) + `mergeRuntimeAuditReports` (agregación global). |
| `RuntimeIntegrityBoundary.js` | Bloquea Historical · Archived · Detached · Hidden · Unknown · Orphan. `evaluateIntegrityBoundary(inventory)` → `{ blocked, allowed, enforced }`. |
| `index.js` | Entrada consolidada: `runResourceIntegrityAudit` + contrato `AlertRuntimeAuditContract` (`RUNTIME_AUDIT_VERSION = '1'`) + exports completos. |

**Facade:** `src/core/capabilities/alert/index.js` expone `runtimeAudit` (→ `runResourceIntegrityAudit`), `runtimeAuditBoundary` (→ `RUNTIME_INTEGRITY_BOUNDARY`) y `contracts.runtimeAudit`.

## 5. Consumo UI (`src/hooks/useAlertRuntime.js`)

El hook ahora:

1. Recolecta recursos existentes **+ repositorios/categorías** del módulo (visibilidad documental real).
2. Ejecuta `AlertCapability.runtimeAudit({ forms, records, documents, module, repositories, categories })`.
3. Solo el **`audit.operational`** (Operational Resource Set) fluye a `runtimeBinding({ ...base, existing: visibleSet })` → **los recursos huérfanos/archivados/ocultos NUNCA llegan al Runtime**.
4. Deriva las reglas desde el snapshot normalizado (`binding.existing`).
5. Expone `audit` en el retorno para diagnóstico (reporte, boundary, inventory).
6. **Global (Dashboard):** audita cada módulo runtime por separado y agrega reportes (`mergeRuntimeAuditReports`); `getRuntimeModules` reemplazado por `getModules()` filtrado (visible && no archivado/deprecado).

## 6. Validaciones funcionales — Resultados

| # | Validación | Resultado |
|---|-----------|-----------|
| F1 | Formulario visible → permitido | **PASS** |
| F2 | Formulario oculto (`is_active=false`) → excluido | **PASS** |
| F3 | Documento visible (repositorio + categoría activos) → permitido | **PASS** |
| F4 | Documento archivado (categoría/repositorio inactivos) → excluido | **PASS** |
| F5 | Registro visible (form padre visible) → permitido | **PASS** |
| F6 | Registro eliminado/stale (sin id) → excluido | **PASS** |
| F7 | Recursos huérfanos (módulo incorrecto) → excluidos (form/record/doc) | **PASS** |
| F8 | Recursos de módulo histórico/archivado/deprecado → excluidos | **PASS** |

**Integración:** solo el Operational Resource Set llega al Runtime Binding (3 fuentes, únicamente recursos visibles `f1/r1/d1`).

## 7. Certificación

- **Sprint 186:** F1–F8 **PASS** (`C:\tmp-test\sprint-186-resource-integrity-certification.mjs`).
- **Regresión Sprint 185:** B1–B10 + B11 **PASS** (`C:\tmp-test\sprint-185-runtime-binding-certification.mjs`).
- **Build:** `npm run build` **PASS** (~2.33s).
- **Runtime Integrity:** `RUNTIME_INTEGRITY_BOUNDARY` activo; `RESOURCE INTEGRITY CERTIFIED`.

## 8. No se modificó / No se creó

- **No se modificó:** Runtime Engine · Capability Resolver · Dynamic Forms/Records/Document Repository · Dashboard · React Router · Assignment Engine · Registries.
- **No se creó:** Alert Engine · runtime paralelo · dashboard paralelo · nueva persistencia · nuevo CRUD · Notification Engine.
