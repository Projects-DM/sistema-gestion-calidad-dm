# Durability Contract — SGC-DM (Durable Persistence Layer)

**Documento:** Durability Contract

**Objetivo:** Definir formalmente qué significa **Durable Persistence** dentro de SGC-DM, con garantías y comportamiento esperado ante fallos.

**Restricciones:**
- No modifica código ni SQL.
- No propone tareas futuras.
- No genera pseudo-código.
- Contractual, verificable y database-agnostic.

---

## 1. Definición de Durable Persistence

**Durable Persistence** en SGC-DM significa que una operación lógica de persistencia (submit/verify/workflow) cumple estas garantías mínimas:

1) **Atomicidad lógica (All-or-Nothing conceptual):**
   - la operación se materializa completamente o no se materializa como éxito.

2) **Consistencia de auditoría (Audit-Ready):**
   - si la operación se considera “completada”, la auditoría inmutable existe y correlaciona con evidencia física.

3) **Replay safety y deduplicación:**
   - reintentos y replays no generan duplicados de la operación lógica.

4) **Recuperación segura:**
   - ante offline recovery, el sistema puede retomar y completar sin corromper consistencia.

5) **Recuperación ante fallos de infraestructura (SAGA para storage):**
   - si las evidencias ya fueron subidas y la transacción DB falla, se ejecuta compensación coherente.

> **Nota documental:** Durable Persistence no afirma tolerar cualquier fallo sin pérdida; afirma garantías sobre consistencia operacional y trazabilidad bajo los escenarios definidos.

---

## 2. Identidades operacionales base del durability contract

Este contrato utiliza las claves definidas oficialmente en `idempotency_strategy.md`:
- `correlationId`
- `transactionId`
- `recoveryId`

La durabilidad debe expresarse en términos de “resultado lógico por `transactionId`”.

---

## 3. Garantías formales

### 3.1 Durability guarantees (garantías de durabilidad)

**DG1 — Resultado lógico único por operación:**
- Para cada `transactionId`, el sistema converge a un resultado lógico único:
  - committed (éxito) o
  - compensated/failed (fracaso con compensación donde aplique)

**DG2 — No duplicación material:**
- Las entidades persistidas y la auditoría asociada no se duplican por replays.

**DG3 — Evidencia ↔ auditoría correlacionable:**
- Cuando el commit se considera completado, la evidencia referenciada existe y está correlacionada.

### 3.2 Consistency guarantees (consistencia)

**CG1 — Consistencia audit-ready:**
- Si el resultado es committed, debe existir auditoría completa correlacionada.

**CG2 — Consistencia analítica recomponible:**
- Los pipelines analíticos/IA deben poder reconstruir el estado derivado sin duplicados por replay.

### 3.3 Audit guarantees (garantías de auditoría)

**AG1 — Inmutabilidad conceptual:**
- El sistema no debe fabricar logs de éxito si el commit no ocurrió.

**AG2 — Corrección ante compensaciones:**
- Eventos de compensación se deben reflejar como eventos operacionales coherentes (no como success).

### 3.4 Recovery guarantees (garantías de recuperación)

**RG1 — Convergencia desde offline:**
- Operaciones iniciadas offline pueden ser completadas o fallar de forma consistente sin romper correlación.

**RG2 — Seguridad ante replay:**
- Replays preservan `transactionId` y habilitan deduplicación.

---

## 4. Failure Scenarios (escenarios) y comportamiento esperado

Para cada escenario se establecen: comportamiento esperado, garantías, recuperación y restricciones.

### 4.1 Before commit (fallo antes del commit)

**Condición:** el request lógico no alcanza la frontera transaccional completa o el commit no ocurre.

**Comportamiento esperado:**
- Se preserva el estado del operario para reintento (offline-first semantics).
- No se considera la operación como “success”.

**Garantías del sistema:**
- DG2: no duplicación material.
- CG1/AG1: no se crea auditoría de éxito sin commit.

**Recuperación esperada:**
- Si es retryable: se reintenta con el mismo `transactionId`.
- Si es non-retryable: se conserva snapshot y se retorna error estable.

**Restricciones:**
- No se deben generar registros de auditoría que aparenten commit exitoso.

### 4.2 During commit (fallo durante el commit)

**Condición:** el commit está en progreso y el cliente puede no conocer el resultado final (timeout/red).

**Comportamiento esperado:**
- El sistema converge por `transactionId`.
- El replay debe ser seguro (replay safety).

**Garantías del sistema:**
- DG1: convergencia a un resultado lógico único.
- DG2: deduplicación.
- AG1: auditoría correcta según commit real.

**Recuperación esperada:**
- Cliente puede reintentar; persistencia/audit resuelve estado.

**Restricciones:**
- Nunca asumir éxito por ausencia de respuesta.

### 4.3 After commit (fallo después del commit)

**Condición:** el commit ocurrió, pero falló la confirmación al cliente o falló un pipeline downstream.

**Comportamiento esperado:**
- El sistema debe permitir que un replay confirme “ya completado”.
- Auditoría y correlación deben existir y ser consistentes.

**Garantías del sistema:**
- DG1/DG2: convergencia con mismo `transactionId`.
- CG2: analítica recomponible sin duplicados.

**Recuperación esperada:**
- Reintentos del cliente deben retornar resultado consistente (committed) sin duplicar.

**Restricciones:**
- No se debe ejecutar compensación de storage si el commit ya referenció evidencia de forma válida.

### 4.4 Retry execution (reintento explícito)

**Condición:** error transitorio, `retryable=true`.

**Comportamiento esperado:**
- Reintento mantiene identidades (`correlationId`, `transactionId`).
- PersistenceOrchestrator aplica backoff según contrato existente.

**Garantías del sistema:**
- DG2: no duplicación material.
- AG2: auditoría y compensaciones correctas.

**Recuperación esperada:**
- Convergencia a committed si la persistencia logra completarse.

**Restricciones:**
- `transactionId` no debe cambiar entre reintentos.

### 4.5 Recovery execution (recuperación offline)

**Condición:** operaciones en offline (draft snapshot + upload queue conceptual) requieren replay al reconectar.

**Comportamiento esperado:**
- Se reusa la identidad lógica guardada en snapshot.
- `recoveryId` se usa como contexto de recuperación.
- Se aplica SAGA/compensación coherente si DB falla tras uploads.

**Garantías del sistema:**
- RG1: convergencia.
- DG2: deduplicación.
- CG1/AG1: auditoría coherente.

**Recuperación esperada:**
- Replay seguro hasta éxito o falla consistente.

**Restricciones:**
- No se permite “doble commit lógico” causado por cambios de identidad.

### 4.6 Offline synchronization (sincronización con incertidumbre)

**Condición:** reconexión con incertidumbre sobre si el commit DB ocurrió.

**Comportamiento esperado:**
- Se intenta replay con `transactionId` preservado.
- El sistema decide por estado lógico ya materializado.

**Garantías del sistema:**
- DG1: convergencia.
- DG2: deduplicación.

**Recuperación esperada:**
- Si ya committed: se devuelve éxito consistente.
- Si no committed: se reintenta o falla con consistencia.

**Restricciones:**
- No se permite marcar éxito localmente sin confirmación de persistencia/auditoría.

### 4.7 Duplicate submission attempt (doble envío duplicado)

**Condición:** el cliente envía dos o más intentos físicos que corresponden a la misma operación lógica.

**Comportamiento esperado:**
- Persistencia deduplica por `transactionId`.
- Auditoría y analítica no se duplican.

**Garantías del sistema:**
- DG2/DG3.

**Recuperación esperada:**
- Todos los intentos convergen al mismo resultado lógico.

**Restricciones:**
- La deduplicación no debe depender de heurísticas temporales.

### 4.8 Partial infrastructure failure (fallo parcial de infraestructura)

**Condición:** falla en subsistemas complementarios (ej. storage lifecycle cleanup, eventos downstream) mientras el commit DB pudo ocurrir o no.

**Comportamiento esperado:**
- Si el commit no ocurrió: compensación de storage cuando aplique.
- Si el commit ocurrió: no se compensan evidencias comprometidas; se asegura correlación.
- Downstream analytics/IA deben procesar con idempotencia.

**Garantías del sistema:**
- CG1/AG1: auditoría correcta según commit.
- CG2: analítica recomponible.

**Recuperación esperada:**
- Reprocesos posteriores convergen.

**Restricciones:**
- No se permite reemplazar auditoría con analítica.

---

## 5. Reglas de aceptación documentales (Durability readiness)

Para declarar “Durable Persistence” listo hacia Sprint 9, la documentación debe permitir verificar que:

1) Existe un contrato de identidades operacionales (`correlationId`, `transactionId`, `recoveryId`).
2) Existe deduplicación contractual definida por `transactionId`.
3) Existe regla commit → audit (no hay auditoría success sin commit).
4) Existe SAGA/compensación documental sobre storage huérfano.
5) Existe correlación end-to-end hacia analytics e IA usando claves.

---

## 6. Invariantes finales

- **Invariante DI1:** `transactionId` es la identidad de deduplicación.
- **Invariante DI2:** `correlationId` es la identidad de trazabilidad.
- **Invariante DI3:** la auditoría refleja el estado lógico real de commit/compensación.
- **Invariante DI4:** analítica/IA es recomponible sin duplicados por replay.

