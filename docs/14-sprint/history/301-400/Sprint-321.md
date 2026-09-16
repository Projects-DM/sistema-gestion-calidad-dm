# Sprint 321 — Operational Status Views & Metrics · Controlled Correction

- **Estado:** CERTIFIED (exit=0) · 80/80 gates E01–E30 + Pruebas A–E · ~3.2s · timebox <60s OK
- **Suite:** `scripts/sprint-321-operational-status-views-metrics-controlled-correction.mjs`
- **Base:** Sprint 320 CERTIFIED (auditoría forense) — la arquitectura necesaria ya existía.
- **Dependencias:** Sprint 317 (filtros), 318 (auditoría exportación), 319 (Informe de Evidencia), 320 (auditoría status/views/metrics).

## Objetivo

Convertir los cinco indicadores superiores de Despachos en **controles de vista**, reutilizando
completamente el pipeline certificado (`records → activeView → viewFilters → search → filters →
filteredRecords`) y corrigiendo Alertas a **KPI global** (invariante de vista). Sin pipeline nuevo,
sin dataset nuevo, sin queries, sin SSOT, sin persistencia.

## Cambios (solo `UniversalOperationalRuntime.jsx`)

1. **Handler `handleMetricView(viewKey)`** — `setActiveView(viewKey) + setFilters({}) + setSelectedIds(new Set())`.
   Semántica idéntica a la del selector de Vista Operacional ya certificada (una sola forma de cambiar vista).
2. **Indicadores clicables** — cada tarjeta pasó de `<div>` a `<button type="button">` con
   `onClick={() => handleMetricView(item.view)}`, `aria-pressed` y estilo `cursor-pointer`
   + `ring` en la vista activa. Mapping data-driven:
   - Total → `all`
   - Pendientes → `pending`
   - En proceso → `inProcess`
   - Completados → `completed`
   - Alertas → `inconsistent`
3. **Alertas corregida** — `count: records.filter(r => inconsistencias || duplicados).length`
   (era `filteredRecords.filter(...)`, que dependía de la vista activa).

## Invariantes verificadas

- **0 segundo pipeline / dataset**: un único `filteredRecords` y un único `viewFilters`.
- **Alertas = KPI global**: Prueba A demuestra el conteo invariante ante cualquier vista.
- **Selección única** (`selectedIds`) y `select all` intactos; el clic del indicador conserva la
  limpieza de filtros/selección del selector.
- **Acciones operacionales** (Cambiar estado/Aprobar/Cerrar/Reabrir/Eliminar) intactas, gate
  `selectedIds.size > 0`, mismo orchestrator y servicio.
- **Exportar CSV** y **Informe de Evidencia** (adapter 319 → modelo/renderer 315) intactos.
- **Importar / Nuevo / Dashboard** intactos (Dashboard no consume `activeView`).
- Sin `fetch`/`supabase`/storage/`insert`/`upsert` nuevos; forbidden files sin cambios (E28 vía git).

## Clasificación final

```
STATUS ACTIONS       PRESERVED           EVIDENCE REPORT  PRESERVED
OPERATIONAL VIEWS    PRESERVED+CONNECTED IMPORT            PRESERVED
METRICS              STANDARDIZED        DASHBOARD         PRESERVED
ALERTS               CORRECTED           NO NEW QUERY      PASS
FILTERS              PRESERVED           NO NEW SSOT       PASS
SELECTION            PRESERVED           NO PERSISTENCE    PASS
EXPORT               PRESERVED           BUILD             PASS
                                        SCOPE             PASS
STATUS: CERTIFIED
```

## Notas

- La convergencia del motor de filtros (filterCore/sgcFilterAdapter vs. inline de Despachos)
  permanece como trabajo futuro (Sprint 317 es el patrón SGC); no se migró en este sprint.
- `Alertas → vista inconsistent` reutiliza el predicado existente (`inconsistent`); el KPI suma
  también duplicados según el contrato auditado (Sprint 320), sin crear un predicado nuevo.
- Regresión histórica 296–320 no ejecutada (dirigida y timeboxed, como desde Sprint 316).
