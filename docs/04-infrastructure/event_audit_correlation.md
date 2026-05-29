# Event → Audit → Analytics Correlation Model — SGC-DM

**Documento:** Event Audit Correlation

**Alcance:** Formaliza un modelo de correlación operacional y audit-trail requirements para asegurar que cualquier evento generado en el Runtime pueda rastrearse de forma determinística hacia:

1) persistencia
2) auditoría
3) analítica
4) dataset IA

**Restricciones:**
- Documental; no impone cambios de código ni SQL.
- Database-agnostic.

---

## 1. Propósito

SGC-DM exige **audit-ready infraestructura** y **IA-ready extensibility**. Para Durable Persistence, toda operación debe cumplir:

- correlación inequívoca de eventos y consecuencias
- trazabilidad end-to-end (Runtime → Persistencia → Audit → Analytics → IA)
- eliminación de ambigüedad futura en modelos de eventos

Este documento establece un *correlation contract* (campos obligatorios y reglas por capa).

---

## 2. Modelo de capas y eventos

Definimos una cadena determinística de eventos/cambios de estado.

### 2.1 Capas

- **Runtime (R):** produce eventos/solicitudes lógicas.
- **Persistencia (P):** materializa resultados, y define eventos de commit/compensación.
- **Audit (A):** genera bitácora inmutable y audit-trail consistente.
- **Analytics (X):** consume materializaciones o audit-trail y precalcula datasets.
- **IA (I):** consume datasets analíticos para entrenamiento/inferencia.

### 2.2 Línea de eventos (Event Chain)

> Formato conceptual:

**Evento Runtime** → **Evento Persistencia** → **Evento Audit** → **Evento Analytics** → **Evento IA**

Cada evento debe incluir identificadores mínimos (ver §3).

---

## 3. Claves de correlación obligatorias por capa

Este modelo asume las claves oficiales definidas en `idempotency_strategy.md`:

- `correlationId`
- `transactionId`
- `recoveryId` (solo cuando aplique)

Adicionalmente, se define una clave universal temporal y de semántica.

### 3.1 `eventId` (obligatorio en Persistencia y downstream)
- Identificador único del evento emitido por la capa.

### 3.2 `eventType` (obligatorio en todas las capas)
- Tipo semántico del evento.

### 3.3 `occurredAt` (obligatorio en todas las capas)
- Timestamp ISO 8601.

### 3.4 `actorId` (obligatorio cuando exista acción humana)
- Operario/verificador.

### 3.5 `storagePaths[]` (obligatorio en eventos de evidencia)
- Paths determinísticos de Storage usados para correlación física.

---

## 4. Contratos de correlación por etapa

### 4.1 Runtime Event Contract (R → P)

**Evento Runtime** debe contener:
- `eventType`: `submit.request | verify.request | workflow.transition.request`
- `correlationId`
- `transactionId`
- `recoveryId` (si aplica)
- `actorId` (si aplica)
- `occurredAt`
- `formId | responseId | newStatus` según operación
- `valuesSummary` (contenido mínimo para depuración; no requiere payload completo)

**Regla R1 (no ambigüedad):**
- No se permite que dos eventos con distinto `eventType` compartan un mismo `transactionId` sin una razón documentada (ej. el mismo request reintenta con `request` pero el mismo `transactionId`).

### 4.2 Persistencia Event Contract (P → A)

La persistencia debe emitir:
- Evento de **commit** si la materialización ocurre.
- Evento de **compensación** si la materialización falla luego de uploads (SAGA).

**Evento Persistencia** debe contener (mínimos):
- `eventType`: 
  - `submit.committed | verify.committed | workflow.transition.committed`
  - `submit.failed_and_compensated | verify.failed_and_compensated` (nombres conceptuales)
- `correlationId`
- `transactionId`
- `eventId`
- `occurredAt`
- `actorId`
- `responseId` (si aplica y está disponible en el commit)
- `storagePaths[]` (si hay evidencias/firmas)

**Regla P1 (commit precedes audit):**
- El evento Audit debe ocurrir para el mismo `transactionId` solo después del commit lógico.

### 4.3 Audit Event Contract (A → X)

**Evento Audit** se deriva de la auditoría inmutable.

**Requisitos:**
- Debe existir una entrada en `sgc_audit_logs` conceptualmente asociada.
- Debe incorporar:
  - `correlationId`
  - `transactionId`
  - `eventType` (audit: `audit.submit | audit.verify | audit.workflow`)
  - `action_type` (si ya existe semántica de tabla)
  - `modified_by` = `actorId`
  - `occurredAt` (created_at)
  - `storage_path` o referencias dentro de `new_data` cuando corresponda

**Regla A1 (consistencia audit-ready):**
- No se permite auditoría “success” sin el commit lógico asociado.

### 4.4 Analytics Event Contract (X → I)

**Evento Analytics** alimenta pipelines ETL, métricas y alerts.

**Debe contener:**
- `eventType`: `analytics.ingested | analytics.metrics.updated | analytics.alerts.updated`
- `correlationId`
- `transactionId`
- `eventId`
- `occurredAt`
- Identificadores analíticos: `moduleId | formId | userId` cuando aplique
- `datasetIds` o “alcance de recalculado” si existe

**Regla X1 (idempotencia analítica):**
- Analytics debe deduplicar usando `transactionId`/`correlationId` para prevenir duplicados en métricas, alerts y caches.

### 4.5 IA Dataset Traceability Contract (I)

Para IA readiness, el consumo de datasets debe incluir trazabilidad.

**Evento IA** debe contener:
- `eventType`: `ia.dataset.materialized | ia.inference.completed`
- `correlationId`
- `transactionId`
- `eventId`
- `occurredAt`
- `datasetVersion` (si aplica)
- referencias a `features`/`tables/views` de donde proviene el dataset (por nombre lógico)

**Regla I1 (auditabilidad de decisiones asistidas):**
- Si IA genera una predicción/etiquetado, debe quedar trazable a los eventos/commit originales mediante `correlationId`.

---

## 5. Correlation Model canónico (tabla de obligatoriedad)

| Capa | Evento | Campos obligatorios mínimo |
|------|--------|------------------------------|
| Runtime | submit/verify/workflow.request | `eventType, correlationId, transactionId, occurredAt` + `actorId` + (según operación) |
| Persistencia | *.committed / *.failed_and_compensated | `eventType, correlationId, transactionId, eventId, occurredAt, actorId` + `responseId?` + `storagePaths[]?` |
| Audit | audit.* | `eventType, correlationId, transactionId, occurredAt, modified_by(actorId)` + `storage_path/ref` |
| Analytics | analytics.* | `eventType, correlationId, transactionId, eventId, occurredAt` |
| IA | ia.* | `eventType, correlationId, transactionId, eventId, occurredAt` + `datasetVersion?` |

---

## 6. Reglas para eliminación de ambigüedad futura

1) **`eventType` define semántica**, no se permite reutilizarlo con significados distintos.
2) La correlación nunca debe basarse en “orden temporal” solamente; debe basarse en `correlationId`/`transactionId`.
3) Los nombres conceptuales de `action_type` deben mapear 1:1 con `eventType` por convención documental.
4) Los eventos de compensación deben conservar `transactionId` y deben evitar generar auditoría de success.

---

## 7. Checklist de verificación documental (Sprint 9)

- [ ] Hay una cadena explícita Runtime → Persistencia → Audit → Analytics → IA.
- [ ] En cada etapa hay campos obligatorios mínimos.
- [ ] Existe Regla “commit precede audit”.
- [ ] Existe Regla de idempotencia analítica.
- [ ] Existe trazabilidad de IA a eventos/commit.
- [ ] No existen ambigüedades sobre claves.

