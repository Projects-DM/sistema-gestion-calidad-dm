# TODO — Fase 2 (Infrastructure & Persistence Layer) — Documental & Arquitectónico

## Paso 1 — Preparación documental (análisis de coherencia)
- [ ] Verificar existencia de los 6 documentos requeridos en `docs/database/`
- [ ] Identificar colisiones terminológicas con:
  - `docs/contracts/*`
  - `docs/core/*` (runtime_state, workflow, etc.)
  - `docs/core/event_bus_architecture.md`
  - `docs/analytics/analytics_architecture.md`
- [ ] Confirmar que no se introducen “conceptos nuevos” no autorizados

## Paso 2 — Crear/ajustar `storage_architecture.md`
- [ ] Contrato y taxonomía conceptual de Storage (buckets, paths, estados lógicos)
- [ ] Lifecycle management + SAGA/compensación (documental)
- [ ] Offline-first interacción storage↔DB (solo describir, no ejecutar lógica)

## Paso 3 — Crear `runtime_api_contracts.md`
- [ ] Catálogo de contratos runtime↔persistence
- [ ] Contrato de errores transaccionales (retryable / non-retryable)
- [ ] Contrato de idempotencia/deduplicación (documental)

## Paso 4 — Crear `audit_engine.md`
- [ ] Pipeline audit-ready: correlación con storage paths y response_id
- [ ] Modelo de bitácora inmutable y trazabilidad INVIMA/ISO (campos mínimos)
- [ ] Reglas conceptuales de protección contra manipulación (RLS/inmutabilidad)

## Paso 5 — Crear `infrastructure_layers.md`
- [ ] Vista por capas enterprise (runtime state → transaction → persistence orchestrator → adapter → DB/Storage → event/analytics)
- [ ] Fronteras de transacción vs fronteras async (EDA)
- [ ] Resiliencia operacional: retry/backoff/circuit-breaker *conceptual*

## Paso 6 — Crear `database_adapter_architecture.md`
- [ ] Familia de adaptadores y puertos/contratos (conceptual)
- [ ] Diferencias/compatibilidades multi-storage & multi-DB (MySQL/PostgreSQL/SQLServer)
- [ ] Estrategia de EAV/typing + batching conceptual

## Paso 7 — Alinear `persistence_architecture.md` (documento existente)
- [ ] Revisar consistencia terminológica con los nuevos 5 documentos
- [ ] Remover/ajustar contradicciones (si aparecen)
- [ ] Integrar referencias cruzadas a:
  - `storage_architecture.md`
  - `runtime_api_contracts.md`
  - `audit_engine.md`
  - `infrastructure_layers.md`
  - `database_adapter_architecture.md`

## Paso 8 — Revisión final
- [ ] Coherencia global: sin duplicación de contratos ni overlaps conceptuales
- [ ] Verificar que cada doc mantenga el mismo nivel enterprise y estilo existente
