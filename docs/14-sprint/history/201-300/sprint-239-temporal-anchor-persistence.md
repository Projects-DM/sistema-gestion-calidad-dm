# Sprint 239 — Temporal Anchor Persistence & Operational Countdown Activation

> Nivel 5 · Persistencia del ancla temporal · Activación del contador operacional · Certificación del ciclo temporal completo

## Tipo
Presentation → Application → Persistence Integration · Operational Read Model Activation

**Impacto:** **evolución controlada** de `AlertConfigurationMapper` (write+read) para conservar el
ancla temporal y los identificadores presentacionales. **No** modifica Alert Engine, Notification
Engine, Evaluation Engine, Runtime, Providers, Contracts, arquitectura SSOT, Resolver,
normalizador ni la evaluación certificada.
Estado: **TEMPORAL ANCHOR PERSISTENCE + OPERATIONAL COUNTDOWN ACTIVATED**.

---

## 1. Resumen

Los Sprints 236–238 probaron que el algoritmo temporal del ViewModel (Anchor → Target →
Remaining → Operational State → sortDate) es correcto, pero el ancla persistida **nunca
existía**: `mapFormStateToMetadata` descartaba `startDate`/`startTime` antes de persistir, de modo
que `parseAnchor` → `null` y las tarjetas colapsaban a `—` (sin contador, sin `Vencida`, sin orden
cronológico). Sprint 239 **restablece el ciclo completo** propagando y conservando el ancla en la
capa de mapeo de escritura/lectura.

## 2. Cambio de implementación (único archivo)

`src/core/capabilities/alert/operational-configuration/AlertConfigurationMapper.js`:

- **`mapFormStateToMetadata`** ahora incluye y propaga `startDate`, `startTime`, `name` y
  `description` (además de los 9 campos canónicos). No altera la validación (las claves extra son
  toleradas por `validateAlertConfiguration`/`validateAlertConfigurationForm`).
- **`mapMetadataToFormState`** ahora lee y restaura `startDate`, `startTime`, `name` y
  `description`, evitando perder información al volver a editar.
- **`mapFormStatesToCollection` / `mapCollectionToFormStates`** heredan automáticamente el ancla
  por reutilización del mapeo por elemento (sin cambios propios).

## 3. Ciclo completo restaurado

```
AlertConfigurationForm (startDate/startTime/name/description)
   → mapFormStateToMetadata          ✓ ancla conservada
   → mapFormStatesToCollection       ✓ colección con ancla
   → port.saveConfiguration          ✓ adaptador escribe el objeto completo en alert_config
   → (lectura) extractResourceAlertCollection      → ancla presente en raw
   → parseAnchor → computeTarget → remainingMs → derivedState → sortDate
   → Tarjeta: tiempo restante real + próxima ejecución + estado + orden cronológico
```
Sin capas nuevas; únicamente se reutiliza el Mapper ya certificado.

## 4. Estados operacionales certificados (ahora alcanzables con ancla real)

| Estado | Condición |
|--------|-----------|
| 🔴 Vencida | `remaining < 0` |
| 🟠 Hoy | `remaining ≤ 24h` |
| 🟡 Próxima | `remaining ≤ 72h` |
| 🟢 Activa | `remaining > 72h` |
| ⚫ Deshabilitada | `enabled = false` |

## 5. Contador operacional

Con ancla real la tarjeta muestra `Vence en 18 minutos / 3 horas / 2 días / 3 meses` o
`Venció hace 14 minutos / 2 horas / 3 días`, y la próxima ejecución deja de mostrar `—`
(`Hoy 08:00` · `Mañana 14:00` · `25 Ago 09:30`). Todo sigue siendo read-only/presentación.

## 6. Restricciones (no autorizado)

Prohibido: `AlertTimeEngine`, `CountdownEngine`, `SchedulerEngine`, `RuntimeClock`,
`AlertProjectionV2`, `AlertConfigurationV2`, `TemporalProvider`, `RefreshService`, y nuevos
Contracts/Providers/Repositories/Engines. La solución reutiliza la infraestructura existente.

## 7. Definition of Done

✅ `startDate`/`startTime` persisten desde `AlertConfigurationForm` (write).
✅ `mapMetadataToFormState` read-restaura ancla + ids (read).
✅ `saveCollection`/`loadCollection` mantienen la colección íntegra (ancla incluida).
✅ ViewModel recibe ancla válida y calcula target/remaining/text → next → estado → sort.
✅ Tarjetas muestran tiempo restante real (`Vence en…` / `Venció hace…`).
✅ Próxima ejecución deja de mostrar `—` con ancla válida.
✅ Orden cronológico por vencimiento real (remaining ASC).
✅ No se modifica Alert Engine, Notification Engine, Runtime, Providers, Contracts ni Metadata.
✅ No se crean motores/servicios/proveedores/repositorios paralelos.
✅ Build PASS · Regression PASS · SSOT preservado.

## 8. Certificación TA-1…TA-18 → 18/18 (suite dedicada)

Persistencia del ancla (write) · contrato 9 campos intacto · reconstrucción (read) · round-trip de
colección · integración `saveCollection`→port · adaptador sin strip · lectura raw → resolver VO
intacto · ViewModel consume ancla · estados derivados · texto relativo · próxima ejecución · orden
cronológico · Mapper vs normalizador · contrato canónico · sin motores · capas congeladas · build ·
doc DoD.

## 9. Continuidad

Con el ancla persistido, el ViewModel 237 queda plenamente alimentado. Siguientes sprints podrían
centrarse en el **refresh temporal** (reproyección periódica de `Date.now()`) o en la **sincronización
con el Engine**, siempre sin alterar Alert Engine/Runtime/persistencia certificada.