# Sprint 316 — Advanced Filtering & Record Selection · Forensic Architecture Audit

- **Rama:** `release/stable-sprint79`
- **Fecha:** 2026-08-16
- **Modo:** AUDIT ONLY · LEVEL 5 · FORENSIC CERTIFICATION
- **Estado:** **CERTIFIED** (70/70)
- **Dependencias:** Sprint 314 CERTIFIED · Sprint 315 CERTIFIED
- **Suite:** `node scripts/sprint-316-advanced-filtering-record-selection-forensic-audit.mjs`

---

## 1. Objetivo

Auditoría forense completa pero acotada de la capacidad actual de **Historial y Consulta** y del filtro de **Despachos** (Experiencias Operacionales) para determinar:

1. Por qué la selección individual de registros no está disponible correctamente.
2. Cómo funciona actualmente `selectedIds` y qué componente controla los checkboxes.
3. Cómo se relaciona la selección con XLSX y con el Informe de Evidencia de Registros (315).
4. Cómo funciona el sistema de filtros de Despachos (actor real, estado, operadores, reset, búsqueda).
5. Qué actores, componentes, estado y contratos pueden reutilizarse.
6. Si el filtro de Despachos puede convertirse en un patrón reutilizable para Historial y Consulta.
7. Qué arquitectura mínima debe implementar el futuro Sprint 317.
8. Qué debe permanecer intacto para evitar crear una segunda fuente de verdad.

**Este sprint NO implementa la corrección.**

---

## 2. Pregunta forense

> ¿Existe actualmente una arquitectura reutilizable de filtros y selección de registros que permita evolucionar Historial y Consulta sin crear un nuevo sistema de consulta, una nueva fuente de datos o una segunda lógica de selección?

**Respuesta ejecutable: `PARTIAL`**

| Componente | Estado |
|---|---|
| Motor de filtros de Despachos | **YES** — genérico, contract-driven, compartido por 5 experiencias |
| Selección de Historial/Consulta | **YES** — existe y funciona (`selectedIds → records.filter → XLSX e Informe`) |
| Motor de filtros en Historial/Consulta | **NO** — búsqueda + "Filtros Avanzados" son PRESENTATION ONLY |
| Selección individual libre | **NO** — restringida por presentación + guard mal aplicado |

---

## 3. Arquitectura actual

```
Registros (dynamicService.getModuleResponses)
   │
   ▼
DynamicRecordsView
   ├── filteredRecords (quick filter: todos/hoy/pendientes/aprobados/rechazados/criticos)
   ├── selectedIds (array de ids)
   │      ├── Exportar → exportService → XLSX
   │      └── Informe de Evidencia → evidenceReportModel → evidenceReportRenderer → PDF (315)
   ├── search (decorativo)  ── PRESENTATION ONLY
   └── "Filtros Avanzados" (decorativo) ── PRESENTATION ONLY

Despachos (OperationalExperienceRegistry → UniversalOperationalRuntime)
   ├── searchTerm + filters{} + activeView + page/pageSize (motor GENÉRICO)
   ├── filteredRecords (pipeline activa: activeView → search → filters)
   └── selectedIds (Set) → bulk actions / export CSV
```

---

## 4. Owner de selección

- **Único dueño:** `src/components/DynamicRecordsView.jsx`
  - `selectedIds` — `useState([])` (línea 192)
  - `toggleSelection(id)` — toggle individual (196)
  - `toggleSelectAll()` — opera sobre `filteredRecords` (200)
- **Consumo idéntico** (2 ocurrencias) en Exportar e Informe:
  `records.filter((r) => selectedIds.includes(r.id))`
- Contrato: array de ids → soporta **0 / 1 / N / ALL** sin consulta adicional.
- SELECT ALL = **filteredRecords** (el conjunto filtrado, no el dataset completo).
- La selección **persiste** al cambiar de filtro (`setFilter` no limpia `selectedIds`).

---

## 5. Owner de filtros

- **Despachos:** el filtro vive en el motor **GENÉRICO** `src/modules/experiences/UniversalOperationalRuntime.jsx`, registrado vía `OperationalExperienceRegistry` (`experienceKey: 'dispatches'`). No es código despachos-específico.
- **Historial/Consulta:** no hay motor; solo quick filter + controles decorativos.

---

## 6. Filtro de Despachos (actor real)

| Aspecto | Hallazgo |
|---|---|
| Componente | `UniversalOperationalRuntime.jsx` (compartido por 5 experiencias) |
| Estado | `searchTerm`, `filters{}`, `activeView`, `page`, `pageSize`, `showFilterPanel` |
| Selección | `selectedIds` (Set) + `toggleSelect`/`toggleSelectAll` |
| Criterios | `filterFields = tableFields − id`; valores únicos en memoria |
| Operadores | Igualdad por campo (`===`), búsqueda substring sobre `canonicalFields`, predicados `viewFilters` |
| Motor | `filteredRecords = useMemo` (activeView → search → filters) |
| UI | Input de búsqueda + panel de selects + "Limpiar filtros" + contador + paginación |
| Reset | `setFilters({})` y `setSelectedIds(new Set())` al cambiar de vista |
| Configuración | En el contrato del Registry (`ui.tableFields`, `fieldDisplay`, opciones de estado) |
| Fuente de datos | `orchestrator.loadRecords()` (persistencia existente) |
| Queries | Ninguna nueva en el motor |

---

## 7. Mapa de reutilización

| Elemento | Clasificación |
|---|---|
| UI del filtro | **REUSABLE** |
| Estado del filtro | **REUSABLE** |
| Operadores | **REUSABLE** |
| Selector de valores | **REUSABLE** |
| Aplicación del filtro | **REUSABLE** |
| Clear/reset | **REUSABLE** |
| Modelo de datos | **ADAPTER** (SGC es anidado: `sgc_forms`/`profiles`/`sgc_response_values`; el motor usa campos planos) |
| Query | **REUSE · MUST NOT COPY** (`getModuleResponses`) |
| Persistencia | **REUSE · MUST NOT COPY** |

Núcleo reutilizable mínimo: motor UOR + adaptador de campos para la forma SGC. **No** copiar el componente de Despachos.

---

## 8. Hallazgo de selección

**Causa raíz de la selección individual restringida:**

1. **ROLE GUARD (primaria · presentación):** la columna de checkboxes se renderiza solo si `isVerificador = rol === 'administrador' || rol === 'calidad'`. Los roles `operativo`, `consulta` y `conductor` **no ven checkbox** → no pueden seleccionar, exportar ni generar informe. Es restricción de **presentación** (no hay `RoleGate`, no cambia autorización).
2. **UI GUARD MISAPPLIED (secundaria):** `disabled={!canVerifyRecord && rec.status === 'pendiente_revision'}` con título *"No puedes verificar tus propios registros"*. La segregación de verificación (`created_by === user.id`) se aplicó al **checkbox de selección**: un verificador no puede seleccionar (ni exportar/informe) sus propios registros pendientes. La intención es de VERIFICAR, no de SELECCIONAR.

Clasificación §5.3: **Role restriction** (presentation) + **UI/Handler restriction** (misapplied). **No** es State/Export/Data restriction: el estado, la exportación y los datos soportan selección libre real (el mecanismo existe y funciona).

---

## 9. Hallazgo de filtros

- `search` y "Filtros Avanzados" de DynamicRecordsView: **PRESENTATION ONLY** (sin `value`/`onChange`/`onClick`, sin estado, sin lógica; no modifican `records` ni la consulta).
- Única lógica de filtrado real: quick filter por estado/fecha (`todos/hoy/pendientes/aprobados/rechazados/criticos`).
- Factibilidad de filtrado local (§9) — **0 consultas nuevas**:

| Filtro | Clasificación |
|---|---|
| Formulario | AVAILABLE (`sgc_forms.name`) |
| Usuario | AVAILABLE (`profiles.nombre`) |
| Estado | AVAILABLE (`status`) |
| Fecha | AVAILABLE (`created_at`) |
| Rango de fechas | AVAILABLE (derivable en memoria) |
| Módulo | AVAILABLE (prop `moduleName`, contexto cargado) |
| Verificación | AVAILABLE (`verified_at`/`verifier`) |
| Hallazgo / alerta | AVAILABLE (`computedStatus` + `recordBadge`) |

`module_name` no viaja en cada registro (MISSING DATA en la proyección) → se resuelve con la prop `moduleName`, **no** con una consulta nueva (§14).

---

## 10. Dependencias

- Sprint 314 CERTIFIED — inventario de datos/exportación para el informe.
- Sprint 315 CERTIFIED — `evidenceReportModel` + `evidenceReportRenderer` + botón "Informe de Evidencia" (misma selección que XLSX).
- Motores reutilizables: `UniversalOperationalRuntime.jsx` + `OperationalExperienceRegistry`.

---

## 11. Restricciones (AUDIT ONLY)

- **NO** ejecutar regresión histórica 296–315 (contexto histórico, no ejecución obligatoria).
- **NO** reintentos ni timeout de horas: timebox en **minutos** (una evidencia anormal → FAIL/BLOCKED con diagnóstico).
- **NO** modificar `src/` (componentes, hooks, servicios, queries, Supabase, persistencia, runtime, contratos, exportadores, Evidence Report).
- **NO** activar "Filtros Avanzados" ni implementar ningún filtro.

---

## 12. Arquitectura recomendada (Sprint 317)

```
                 FILTER PRESENTATION
                         │
                         ▼
                 FILTER CONTRACT  (motor UOR adaptado a la forma SGC)
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
       Historial     Despachos    Futuras vistas
       y Consulta

records (fuente única getModuleResponses)
   ├── FILTER → filteredRecords        (motivo, sin .sort() nuevo, sin query)
   └── selectedIds → XLSX + Evidence Report  (UNA selección, sin duplicar)
```

Principios de diseño:
1. Reutilizar el motor de Despachos (UI/estado/operadores/selector/aplicación/reset REUSABLE).
2. Adaptador de campos SGC: `formulario→sgc_forms.name`, `usuario→profiles.nombre`, `estado→status`, `fecha→created_at`, `módulo→moduleName (prop)`.
3. Separar **VERIFICAR** de **SELECCIONAR** (el guard de segregación no debe bloquear la selección).
4. Decidir el alcance por rol para no-verificadores (presentación), conservando la autorización de verificación intacta.
5. Cero consultas nuevas, cero fuentes nuevas, cero SSOT nuevos, una sola selección.

---

## 13. Evidencia E01–E20

```
E01   OWNER                       PASS  — owner selección (DynamicRecordsView) y filtro (UOR)
E02   selectedIds                 PASS  — flujo Checkbox → Handler → selectedIds → XLSX/Informe
E03   INDIVIDUAL SELECTION        PASS  — mecanismo real + causa de bloqueo clasificada
E04   SELECT ALL                  PASS  — toggleSelectAll sobre filteredRecords
E05   EXPORT INTEGRATION          PASS  — selección → exportService → XLSX
E06   EVIDENCE REPORT INTEGRATION PASS  — selección → buildEvidenceReportModel → render
E07   FILTER OWNER                PASS  — Despachos usa motor genérico compartido por 5
E08   FILTER STATE                PASS  — searchTerm/filters/activeView/page/pageSize + Set
E09   FILTER OPERATORS            PASS  — igualdad + substring + predicados
E10   FILTER REUSE                PASS  — §7: REUSABLE + ADAPTER + REUSE/MUST NOT COPY
E11   ADVANCED FILTERS            PASS  — búsqueda + "Filtros Avanzados" = PRESENTATION ONLY
E12   NO NEW QUERY                PASS  — 0 consultas nuevas (selección sobre datos cargados)
E13   NO NEW SSOT                 PASS  — sin segunda representación persistente
E14   MULTI-FORM                  PASS  — selección por id, hoja por formulario, sin contaminación
E15   MULTI-MODULE                PASS  — moduleId/moduleName por props, contexto del módulo cargado
E16   ORDERING                    PASS  — orden created_at DESC conservado; sin .sort() nuevo
E17   ROLES                       PASS  — restricción de presentación + guard mal aplicado (sin tocar permisos)
E18   EXPORT COMPATIBILITY        PASS  — una sola selección alimenta XLSX y PDF
E19   SCOPE                       PASS  — src/ sin modificaciones (LIMPIO)
E20   BUILD                       PASS  — npm run build → ✓ built
TOTAL: 70/70 PASS
```

---

## 14. Regresión

- **NO ejecutada** por este sprint (§19-§20, §25).
- La familia 296–315 queda registrada como **contexto histórico**; las certificaciones anteriores permanecen válidas.
- Una futura operación `FULL PLATFORM REGRESSION` podrá ejecutarla de forma independiente, controlada y optimizada.

## 15. Scope

- `git status --short src/` → **LIMPIO** (AUDIT ONLY).
- Único artefacto nuevo: `scripts/sprint-316-advanced-filtering-record-selection-forensic-audit.mjs` y este documento.

## 16. Build

- `npm run build` → **✓ built** (PASS).

---

## 17. Clasificación final

| Condición | Resultado |
|---|---|
| CURRENT SUITE | PASS |
| SELECTION AUDIT | PASS |
| FILTER AUDIT | PASS |
| REUSE ANALYSIS | PASS |
| EXPORT INTEGRATION | PASS |
| EVIDENCE REPORT | PASS |
| NO NEW QUERY | PASS |
| NO NEW SSOT | PASS |
| NO SRC MODIFICATION | PASS |
| BUILD | PASS |
| SCOPE | PASS |

**STATUS: CERTIFIED** · TOTAL: 70/70 PASS

---

## 18. Próximo Sprint (317 · CONTROLLED CORRECTION)

Habilitado por esta auditoría:

- **Individual Selection + Advanced Filtering** sobre **UN ÚNICO FILTER SYSTEM**.
- Implementar el motor de filtros de Historial/Consulta reutilizando el núcleo de Despachos (adaptador de forma SGC).
- Separar **VERIFICAR** (segregación de funciones) de **SELECCIONAR** (exportar/informe).
- Definir el alcance por rol para no-verificadores.
- Respetar: una sola selección (`selectedIds → records.filter`), cero consultas nuevas, cero SSOT nuevos, orden de fuente conservado, XLSX e Informe intactos.