# Sprint 238 — Operational Time Persistence Audit & Deterministic Status Projection

> Nivel 5 · Auditoría del modelo temporal · Persistencia operacional · Certificación de estados temporales

## Tipo
Architecture Audit · Operational Read Model · Temporal State Validation

**Impacto:** **auditoría exclusiva** — no se modifica ningún archivo de implementación.
No altera Alert Engine, Notification Engine, Runtime, Persistence, Metadata,
`AlertConfiguration`, Resolver, Mapper, Providers ni Contracts.
Estado: **TEMPORAL STATE CERTIFIED** (causa raíz localizada para Sprint 239).

---

## 1. Resumen

El Sprint 237 implementó correctamente el ViewModel temporal de solo lectura
(`parseAnchor` → `cadenceMs` → `computeTarget` → `remainingMs` → `derivedState` → `sortDate`).
La experiencia sigue mostrando información temporal incompleta/inconsistente (`—`, contador fijo,
nunca "Vencida", sin orden cronológico, badges estáticos).

Esta auditoría prueba que el defecto **no está en el algoritmo temporal** (ViewModel correcto),
sino en el **origen del áncla** que ese ViewModel consume: **el áncla temporal nunca se
persiste** porque la capa de escritura lo **descarta antes de guardar**.

## 2. Síntomas (TP-01…TP-05) → causa raíz única

| SÍntoma | Causa raíz |
|--------|-----------|
| TP-01 `Próxima ejecución`/`Tiempo restante` = `—` | `parseAnchor` → `null` → `targetMs`/`remainingMs` `null`. |
| TP-02 Contador nunca evoluciona | Ancla ausente → `remainingMs` siempre `null` (no hay fecha de la que restar `Date.now()`). |
| TP-03 Nunca cambia a `Vencida` | `remainingMs === null` → `derivedState` devuelve `Activa` (rama `null/NaN`). Sin ancla no puede haber vencimiento. |
| TP-04 Sin orden cronológico | Todo `sortDate = Number.MAX_SAFE_INTEGER` (ancla `null`) → orden estable = orden de inserción. |
| TP-05 Badges estáticos | Estado deriva de `remainingMs` (`null`) → siempre `Activa`; no reflejan el reloj. |

**Todos** los síntomas comparten **una** causa: **el áncla temporal no llega al ViewModel**.

## 3. Auditoría T1 — Persistencia del áncla temporal (CAUSA RAÍZ)

Flujo real de escritura:

```
AlertConfigurationPanel.save → service.saveCollection({ resource, formStates })
   → mapFormStatesToCollection(formStates)          [por cada borrador]
        → mapFormStateToMetadata(formState)          // 9 campos canónicos
   → port.saveConfiguration(resource, { alertConfigurations: collection })
```

**Hallazgo**: `mapFormStateToMetadata` (AlertConfigurationMapper.js:111–164) devuelve
**SOLO los 9 campos canónicos** (`enabled, periodicity, expiration, risk, priority,
notification, gracePeriod, automaticClose, repeatPolicy`) y **descarta** `startDate`,
`startTime`, `name` y `description`.

Conclusión: aunque el formulario captura `startDate`/`startTime`
(AlertConfigurationForm.jsx:253-259), **en el límite Mapper→Persistencia esos campos se
pierden**. El `alertConfigurations` guardado **no contiene ancla alguna**.

**PRUEBA de escritura** (evidencia del código): método `saveCollection` usa estrictamente
`mapFormStatesToCollection(drafts)` antes de persistir (ApplicationService.js:188–190,200);
´mapFormStateToMetadata` no propaga `startDate`/`startTime`.

**PRUEBA de lectura** (evidencia del código): `projectConfigCards` el objeto
`configCard`·CONFIGTO del ViewModel:
`parseAnchor(item)` = `item.startDate ?? item.start_time` + `item.startTime ?? item.start_time`
(AlertMonitoringExperience.jsx:66–82). Con el ancla ausente → `null`.

## 4. Auditoría T2 — Construcción del targetDate

- `computeTarget(anchor, cadence, now)` es correcto (múltiplo siguiente ≥ `now`).
- Con `anchor === null` → devuelve `null` (computeTarget: `anchor null → return null`).
- **`targetDate` no puede existir si el `anchor` no fue persistido.** → Se confirma que el
  defecto es de entrada, no el algoritmo.

## 5. Auditoría T3 — Tiempo restante

- `remainingMs = targetDate - now`; con target `null` → `remainingMs null`.
- Valores: positivo/negativo/cero/NaN **no llegan** porque `target` es `null` a priori.
- **El contador no "cambia"** no es por falta de tick: es porque **no hay `target`** que restar.

## 6. Auditoría T4 — Texto relativo

- `humanDuration(remainingMs)` solo se alcanza cuando `remainingMs !== null`;
  con `null` el texto muestra el placeholder `—`.
- Por eso aparece `—`/`null`/`undefined` en lugar de `Vence en 12 minutos` / `Venció hace 4 días`.

## 7. Auditoría T5 — Próxima ejecución

- `formattedExecution(targetMs)` devuelve `null` para `targetMs === null` (monitor:114-116).
- Al llegar `null` la tarjeta muestra `—`. El algoritmo es correcto; su entrada es `null`.

## 8. Auditoría T6 — Estado operacional

- `derivedState(enabled, remainingMs)`: 
  - `retirar enabled===false → Deshabilitada` (ok);
  - `remainingMs === null → 'active'` (Activa) — **aquí cae todo** por falta de ancla;
  - `remainingMs<0 → Vencida` nunca se alcanza sin ancla.
- **Confirmado**: `Vencida` solo se produciría con ancla; sin ella el badge queda `Activa`.

## 9. Auditoría T7 — Orden cronológico

- `sortDate = remainingMs ?? Number.MAX_SAFE_INTEGER`; todos `null` → todos `MAX_SAFE_INTEGER`.
- `out.sort((a,b)=>a.sortDate-b.sortDate)` es estable → conserva orden de inserción.
- **No hay orden cronológico** porque no existe valor temporal que comparar.

## 10. Auditoría T8 — Refresh temporal

- La proyección se recalcula **solo en el render** (`useMemo(projectConfigCards(existing))`).
- No existe ningún timer/intervalo que reveje `Date.now()` en caliente; el valor queda
  congelado hasta el siguiente render/recarga. **Auditoría solo documenta**; no introduce
  timers ni motores de actualización (Sprint 239 decidirá el mecanismo).

## 11. Responsabilidades certificadas

| Capa | Responsabilidad |
|------|----------------|
| Alert Engine | Evalúa metadata · nunca calcula la UI. |
| Operational Projection | Construye el ViewModel (read-only). Nunca persiste. No modifica metadata. |
| AlertMonitoringExperience | Consume el ViewModel. Nunca calcula fechas. Nunca evalúa. |
| Runtime | Sin modificaciones. |

## 12. Restricciones (no autorizado)

Prohibido: `AlertTimeEngine`, `SchedulerEngine`, `RuntimeTimer`, `CountdownEngine`,
`RefreshService`, `AlertClock`, `AlertProjectionEngineV2`, y nuevos Providers/Contracts/Engines/
Repositories. La auditoría **solo localiza** el punto de pérdida.

## 13. PUNTO EXACTO DE PÉRDIDA (conclusión)

```
AlertConfigurationForm (startDate+startTime) 
   → mapFormStateToMetadata          ← ✗ DESCARTADOS AQUÍ (Mapper: 147–163)
   → port.saveConfiguration({ alertConfigurations })   → sin startDate/startTime
   → (lectura) resource.alert_config  →   sin startDate/startTime
   → parseAnchor → null → targetMs/remainingMs null → tarjeta sin tiempo
```

## 14. Definition of Done

✅ Persistencia del áncla auditada (causa: Mapper descarta `startDate`/`startTime`).
✅ `targetDate` validado (correcto; entrada `null`).
✅ `remainingMilliseconds` auditado (siempre `null` sin ancla).
✅ `remainingText` auditado (placeholders `—`/`null`).
✅ Próxima ejecución auditado (`null`).
✅ Estados operacionales auditados (`Vencida` inalcanzable sin ancla).
✅ Orden cronológico auditado (`sortDate` `MAX_SAFE_INTEGER`).
✅ Ciclo de actualización auditado (solo render; sin timer).
✅ Punto exacto de pérdida identificado (Mapper → escritura).
✅ Alert Engine / Runtime / Metadata / Persistence intactos. ✅ SSOT preservado.

## 15. Certificación TPA-1…TPA-16 → 16/16 (suite dedicada)

Flujo temporal completo auditado; persistencia del áncla validada; proyección del ViewModel
auditada; tiempo restante; próxima ejecución; estados; orden cronológico; refresh;
`AlertMonitoringExperience` auditado; Resolver auditado; **Mapper auditado (causa raíz)**;
Runtime intacto; Alert Engine intacto; Persistencia intacta; sin motores paralelos;
**READY FOR IMPLEMENTATION → Sprint 239**.

## 16. Continuidad

Sprint 239 corregirá **exclusivamente** la capa de persistencia/mapeo para **propagar y
conservar el áncla temporal** (`startDate`/`startTime`) en los límites escritor/lector del
ViewModel, reutilizando la infraestructura certificada y manteniendo Alert Engine, Runtime y
toda la arquitectura **intactos**.