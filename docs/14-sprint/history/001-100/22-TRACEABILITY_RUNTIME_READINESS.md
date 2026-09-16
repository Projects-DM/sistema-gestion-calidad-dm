# TRACEABILITY_RUNTIME_READINESS.md — SPRINT T1.0 (Traceability Module Runtime Readiness)

> Restricción: NO IMPLEMENTAR CAMBIOS. Solo inspección/documentación.

## Resumen ejecutivo
El módulo **Trazabilidad → Historial de Despachos** está funcional para operación UI con Supabase, pero **NO está listo** para ser integrado como “port/event source” directo en el Runtime Engine (Audit → Analytics → Scoring → Decision → Selection).

## 1) Evaluación por capas Runtime (para despachos)

### Audit Layer Compatibility
- **PARTIAL (≈ 35%)**
  - Existe infraestructura de auditoría para *formularios* en otras partes (`sgc_audit_logs`), pero para *despachos* no hay tabla de eventos ni escritura audit por despacho.
  - En el mejor caso, se puede reconstruir parcialmente con `despachos.created_at` y campos de estado, pero no con “quién/cuándo/cómo” auditables.

### Analytics Layer Compatibility
- **NOT READY (≈ 10%)**
  - No hay métrica derivable de ejecuciones/proveedores; solo registros estáticos.
  - Dashboard existente usa conteos y/o mocks; no se observa pipeline basado en `sgc_audit_logs` o en un modelo común de eventos.

### Scoring Layer Compatibility
- **NOT READY (≈ 5%)**
  - No hay features normalizadas tipo duración/éxito/fallo por evento para construir scoring determinista.

### Decision Layer Compatibility
- **NOT READY (≈ 0%)**
  - No hay motor de reglas/decisiones automatizadas en despachos; depende de UI y estado.

### Selection Layer Compatibility
- **NOT READY (≈ 0%)**
  - El módulo no participa en selección de providers ni switching automatizado.

## 2) Clasificación global
- **NOT READY** para integración directa en Sprint 23.0.

## 3) Requisitos mínimos para llegar a PARTIAL/READY (solo como hallazgo)
- Event contract persistente para despachos:
  - Añadir/usar (en DB) una estructura auditable por despacho (quién/cuándo/operación/antes-después).
- Identidad unificada:
  - correlationId/transactionId/recoveryId equivalentes.
- Escalabilidad:
  - paginación y filtros SQL (evitar select completo).

## 4) Porcentaje estimado de preparación para Runtime
- **≈ 20% global** (Audit parcial por posibilidad de reconstrucción, pero falta evento contract y pipeline completo).

## 5) Final Verdict
- **FINAL STATUS: NOT READY**

