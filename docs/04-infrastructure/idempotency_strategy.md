# Idempotency Strategy — SGC-DM (Durable Persistence Prep)

**Documento:** Idempotency Strategy

**Alcance:** Formaliza los contratos documentales para garantizar *replay safety* y *deduplicación* en escenarios de **reintentos**, **offline recovery** y **reenvíos duplicados** hacia la capa de persistencia.

**Restricciones:**
- No asume cambios de código ni SQL.
- Define **identidades operacionales** y reglas verificables para Durable Persistence.
- Mantiene *database-agnostic persistence*.

---

## 1. Propósito

SGC-DM es una plataforma enterprise audit-ready que persiste operaciones operacionales (submit/verify/workflow) con integración a auditoría y analítica. En entornos runtime-first y offline-first, el sistema debe ser robusto ante:

- reintentos por errores transitorios
- duplicación por reenvío del cliente
- recuperación offline (replay del intento lógico)
- latencia/timeout con incertidumbre sobre el resultado de persistencia

La estrategia de idempotencia define:

1) claves canónicas de identidad operacional.
2) reglas obligatorias de deduplicación y replay safety.
3) invariantes para consistencia de auditoría y analítica.

---

## 2. Definiciones y términos

- **Operación lógica:** una intención de persistir (ej. *submit de una respuesta de formulario*, *verify de una respuesta* o *transición de workflow*).
- **Intento físico:** una ejecución concreta (un request/llamada) realizada por el cliente o recuperador.
- **Replay:** re-ejecución de intentos físicos que corresponden a una operación lógica ya intentada.
- **Idempotency Key:** identificador operacional que permite deduplicación.
- **Correlation ID:** identificador que habilita trazabilidad end-to-end entre runtime, persistencia, auditoría y analítica.

---

## 3. Claves oficiales de identidad operacional

Estas claves son la base documental de la identidad operacional para Durable Persistence.

### 3.1 `correlationId`

**Tipo:** identificador único operacional.

**Origen lógico:** se genera/propaga en el **Runtime** al construir el *TransactionPayload* o *VerificationPayload*.

**Rol:**
- Identifica la **trayectoria operacional** de extremo a extremo.
- Permite correlacionar auditoría y datasets analíticos con una única operación lógica.

**Obligatorio para:**
- submit
- verify
- workflow transitions
- registro de evidencias

### 3.2 `transactionId`

**Tipo:** identificador único de **operación lógica de persistencia**.

**Origen lógico:** lo genera el Runtime en el inicio del intento lógico y permanece estable durante reintentos y replay.

**Rol:**
- Identifica inequívocamente la unidad de trabajo persistente.
- Es la base para la **deduplicación** en reintentos.

**Obligatorio para:**
- `submitFormResponse`
- `verifyFormResponse`
- `updateWorkflowStatus`

### 3.3 `recoveryId`

**Tipo:** identificador único de la **sesión o mecanismo de recuperación offline**.

**Origen lógico:** se asigna cuando el runtime entra en modo offline recovery (ej. replay desde `draftSnapshot`/cola de carga).

**Rol:**
- Aísla la semántica de recuperación para evitar correlación ambigua.
- Permite diferenciar “mismo intent lógico” vs “misma sesión de replay”.

**Obligatorio para:**
- operaciones originadas desde offline recovery.

> **Regla de consistencia:**
> - Para una misma operación lógica, `transactionId` NO cambia.
> - Para replays desde mecanismos distintos, `recoveryId` puede cambiar, pero debe conservarse `correlationId` y `transactionId`.

---

## 4. Contratos e invariantes (deduplicación y replay safety)

### 4.1 Identidad lógica (Logical Identity)

**Contrato L1 (estabilidad):**
- Para una operación lógica, el Runtime debe mantener **inalterables** `correlationId` y `transactionId` en todos los reintentos y replays.

**Contrato L2 (propagación):**
- La capa de persistencia debe propagar `correlationId` y `transactionId` hasta la frontera de auditoría y hasta los registros de analítica (o a su pipeline de correlación).

### 4.2 Deduplicación (Deduplication Contract)

**Contrato D1 (deduplicación por `transactionId`):**
- Para una misma `transactionId`, la persistencia debe asegurar que:
  - el conjunto de entidades persistidas (respuesta + values + evidencias + auditoría) se materializa una sola vez a nivel lógico.

**Contrato D2 (resultado estable):**
- Si un intento físico reintenta y corresponde al mismo `transactionId`, el sistema debe retornar un resultado **consistente** con el primer commit lógico (si ya ocurrió) o con el estado de recuperación (si no ocurrió aún).

**Contrato D3 (no duplicar auditoría):**
- Para una misma `transactionId`, el sistema no debe crear múltiples entradas equivalentes de auditoría para la misma operación lógica.

**Contrato D4 (no duplicar correlaciones analíticas):**
- Los pipelines analíticos deben usar `correlationId`/`transactionId` para evitar duplicar datasets, métricas o eventos derivados.

### 4.3 Replay safety

**Contrato R1 (safe replay):**
- Replays por timeouts/redes/liveness failure se consideran **replay seguros** si el cliente/persistencia usa las claves oficiales.

**Contrato R2 (zona de incertidumbre):**
- Si el cliente no conoce el estado final de la operación (timeout sin respuesta), el replay debe:
  - reutilizar `transactionId`.
  - no asumir éxito.
  - permitir deduplicación del lado persistencia/auditoría.

### 4.4 Offline recovery

**Contrato O1 (replay offline preserva identidad):**
- Los intentos offline deben reusar `correlationId` y `transactionId` extraídos del `draftSnapshot`.

**Contrato O2 (recoveryId como contexto):**
- `recoveryId` se usa únicamente como contexto de recuperación y no debe afectar la deduplicación principal.

---

## 5. Reglas obligatorias de escenarios

### 5.1 Escenarios válidos

**V1 — Reintento transitorio (retryable):**
- Condición: error transitorio; `retryable=true`.
- Obligatorio: conservar `transactionId` y `correlationId`.
- Resultado esperado: persistencia deduplica y retorna resultado estable.

**V2 — Timeout con incertidumbre:**
- Condición: el request expira pero no se conoce confirmación.
- Obligatorio: replay con misma `transactionId`.
- Resultado esperado: persistencia evita duplicados.

**V3 — Replay offline desde draft:**
- Condición: el usuario pierde conectividad después de uploads o durante submit.
- Obligatorio: conservar `correlationId` y `transactionId` y asignar `recoveryId`.
- Resultado esperado: deduplicación + SAGA/compensación coherente (según contratos de storage).

**V4 — “At-least-once” de infraestructura:**
- Condición: colas/eventos pueden reentregar mensajes.
- Obligatorio: pipelines downstream deben deduplicar con `transactionId` o con `correlationId`.

### 5.2 Escenarios inválidos (prohibidos por contrato)

**I1 — Cambiar `transactionId` en reintentos:**
- El cliente debe prohibirse cambiar la idempotency identity.
- Motivo: rompe deduplicación.

**I2 — Duplicar auditoría por replay no identificable:**
- No se permite que replays sin claves oficiales creen auditoría duplicada.

**I3 — Correlación analítica sin `correlationId`:**
- No se permite publicar eventos analíticos sin claves de correlación mínimas.

---

## 6. Consistencia de auditoría y analítica

### 6.1 Audit consistency

**Contrato A1:**
- Para una `transactionId`, el sistema debe garantizar que:
  - o existe una sola auditoría completa (equivalente conceptual)
  - o existe auditoría de compensación/fracaso (si corresponde a recuperación), sin falsos “success”.

### 6.2 Analytics consistency

**Contrato M1:**
- Las transformaciones/ETL deben ser determinísticamente recomponibles.
- Usar `correlationId`/`transactionId` como llaves de deduplicación.

**Contrato M2:**
- En datasets derivados (métricas, alerts, AI dataset), no se deben generar duplicados por replays.

---

## 7. Consideraciones futuras para Durable Persistence

1) Si el motor físico implementa constraints de idempotencia (unique constraints) o idempotency table, `transactionId` debe ser el valor determinístico.
2) Si se agregan nuevos payloads (ej. nuevas operaciones), deben incorporar estas claves.
3) Para multi-storage, la evidencia debe correlacionarse por `correlationId`/`transactionId` y `storage_path` (según `storage_architecture.md`).

---

## 8. Checklist de verificación documental (para Sprint 9)

- [ ] `correlationId` existe, se propaga y es obligatorio.
- [ ] `transactionId` existe, es estable en reintentos y es base de deduplicación.
- [ ] `recoveryId` existe en offline recovery y no rompe deduplicación.
- [ ] Se definieron contratos de auditoría y analítica para replay.
- [ ] Escenarios válidos/invalidos están cerrados.

