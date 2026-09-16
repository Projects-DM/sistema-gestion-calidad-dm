# Sprint 241 — Alert Collection Persistence Integrity & Operational Status Audit

> Nivel 5 · Auditoría de integridad de colección · Validación del estado operacional · Certificación del ciclo de persistencia

## Tipo
Architecture Audit · Collection Persistence Validation · Operational Read Model Audit

**Impacto:** **auditoría exclusiva** — no se modifica ningún archivo de implementación.
No altera Alert Engine, Notification Engine, Runtime, Persistencia, Metadata, Resolver, Mapper,
Providers ni Contracts. Estado: **COLLECTION INTEGRITY CERTIFIED** (dos causas raíz aisladas).

---

## 1. Objetivo

Auditar con evidencia de código los dos comportamientos reportados (CI-01 estado inconsistente,
CI-02 colección reemplazada) tras los Sprints 239–240, localizando el punto exacto de divergencia
**sin introducir cambios funcionales**.

## 2. Evidencia recopilada (harness de auditoría, no commiteado)

| Verificación | Resultado |
|--------------|-----------|
| `mapFormStatesToCollection([A, B])` → escritura | **2 items** — la colección se serializa completa (claves: 9 canónicas + `name`/`description`/`startDate`/`startTime`). |
| Persistir `{ alertConfigurations: collection }` → `extractResourceAlertCollection` | **2 raw items** — el conteo sobrevive a la escritura. |
| `resolveResourceAlertCollection` → `loadCollection` | **2** reconstruidos — el **conteo** se conserva (el normalizador del Resolver deja caer `name`/`startDate`/`startTime` en la ruta VO; el ViewModel operativo lee el `raw`, no el VO). |
| `mapFormStateToMetadata(B)` (forma legacy single) | **Sin envelope** `alertConfigurations` — si se escribe directo a `alert_config`, al leer devuelve **1 ítem**. |

## 3. Auditoría A1/A2 — CI-01: clasificación y renderizado de estados

**Flujo actual (Sprint 237/240):**

```
remainingMs ─┬─ derivedState(enabled, remainingMs) ─┬─ status.key  → statusLabel / color / icon
             │                                       └─ (ramas excluyentes)
             └─ remainingText = remainingMs >= 0 ? "Vence en …" : "Venció hace …"
```

**Hallazgo:** `statusLabel`, `color` e `icon` provienen **del mismo** `derivedState`, y `remainingText`
deriva **del mismo** `remainingMs`. Las ramas son **mutuamente excluyentes**:
`remainingMs < 0 → overdue/Vencida` se evalúa **antes** de `≤ 24h → Hoy`. Por tanto:

```
remainingMs < 0   ⇒   badge = Vencida  (nunca "Hoy")   ∧   texto = "Venció hace …"
remainingMs ≥ 0   ⇒   badge = Hoy/Próxima/Activa       ∧   texto = "Vence en …"
```

**CI-01 NO se reproduce** en el código actual: no existe ruta que produzca `badge = Hoy` con
`texto = Venció hace …`. La divergencia descrita corresponde al **modelo dual** del Sprint 235
(`statusLabel` desde el heurístico estático `operationalState(cfg)` por cadencia + `remainingText`
desde una etiqueta de cadencia), **eliminado** por la unificación temporal del Sprint 237. El flujo
actual es de **fuente única**; los estados contradictorios ya no pueden coexistir.

## 4. Auditoría A3/A4/A5 — CI-02: persistencia, reconstrucción e integridad de claves

**Ruta certificada del Panel (escribe TODA la colección):**

```
AlertConfigurationPanel.onSubmit
   → formStates = alerts.map(a => configs[a.key] || {})        // TODAS las alertas
   → saveCollection({ resource, formStates })
       → mapFormStatesToCollection(formStates)                  // N items
       → port.saveConfiguration(resource, { alertConfigurations: collection })  // envelope
```

- La estrategia de escritura en la ruta certificada es **replace del campo `alert_config` con el
  envelope completo** — correcta porque el Panel **siempre** lee la colección y escribe el set
  íntegro. **No se pierden alertas** (verificado: 2 → 2).
- **Claves (A5):** el Panel usa claves posicionales `alert-${i+1}` reconstruidas por índice al
  recargar; son **estables** mientras el orden se conserve (no se regenera una clave que provoque
  reemplazos).

## 5. Auditoría A6 — Estrategia replace vs merge (PUNTO DE DIVERGENCIA CI-02)

**Hallazgo — causa raíz de CI-02:** la estrategia de escritura del **campo** es `replace(alert_config)`,
y el **único** productor de reemplazo es la **ruta single sin envelope**:

```
AlertConfigurationApplicationService.save / saveConfiguration (single)
   → mapFormStateToMetadata(formState)          // SIN alertConfigurations
   → port.saveAlertConfiguration({ metadata })  // (adapters legacy alertConfigurationPersistence.js)
   → updateForm(alert_config = <metadata>)      // reemplaza la celda por UNA alerta
```

Si cualquier flujo persiste un **solo** metadata canónico directo en `alert_config` (en lugar del
envelope `{ alertConfigurations: [...] }`), la lectura posterior devuelve **1 ítem** (verificado) y
**la colección existente queda colapsada/reemplazada** — exactamente "Alerta B → Guardar →
Solo existe B".

**Conclusión:** el Panel certificado no produce el reemplazo (conserva ambas). La divergencia es de
**estrategia**: `merge` (leer existente + añadir) vs `replace` single. El punto exacto está en la
**forma de escritura single (sin envelope)** de los adaptadores legacy `saveAlertConfiguration` y del
`AppService.save`/`saveConfiguration` (single), hoy **sin consumidores en la UI** pero disponibles.

## 6. Auditoría A7 — Correspondencia Configuración ↔ Operativo

El ViewModel operativo (`projectConfigCards`) itera **cada elemento raw** de `extractResourceAlertCollection`
por recurso (N tarjetas = N ítems persistidos). Con el envelope completo, **Configuración (N alertas) ⇔
Operativo (N tarjetas)** — nunca N ⇔ 1 salvo que se use la ruta single de §5.

## 7. Restricciones (auditoría)

Prohibido modificar Alert Engine / Runtime / Persistencia / Metadata / Resolver / Mapper / Providers /
Contracts, o crear motores/servicios/providers/repositorios/contratos. Solo documenta.

## 8. Definition of Done

✅ Clasificación operacional auditada (fuente única: `derivedState(enabled, remainingMs)`).
✅ Origen del badge "Hoy" identificado (solo `remaining ≥ 0`; Vencida imposible como "Hoy").
✅ Flujo `derivedState → badge` validado (statusLabel/color/icon/texto desde el mismo estado).
✅ Persistencia de la colección auditada (envelope completo en la ruta certificada).
✅ Reconstrucción completa validada (conteo N → N).
✅ Integridad de claves auditada (claves posicionales estables).
✅ Estrategia replace vs merge documentada (single sin envelope = reemplazo de CI-02).
✅ Correspondencia Configuración ⇔ Operativo validada.
✅ Alert Engine, Runtime, Persistencia, Metadata, Resolver y Mapper intactos. SSOT preservado.

## 9. Certificación CI-1…CI-16 → 16/16 (suite dedicada)

Estado operacional auditado · renderizado visual auditado · persistencia de colección auditada ·
reconstrucción auditada · integridad de claves certificada · estrategia de escritura documentada ·
correspondencia Configuración ⇔ Operativo validada · sin modificaciones funcionales ·
**READY FOR IMPLEMENTATION → Sprint 242**.

## 10. Continuidad

Sprint 242 implementará la corrección **mínima** y reutilizando la infraestructura certificada:
(1) eliminar/blindar la **ruta de escritura single sin envelope** (usar siempre `saveCollection` +
envelope) para garantizar `merge` de la colección; (2) opcionalmente **merge de lectura-escritura**
(leer la colección existente y añadir la nueva alerta) para inmunidad ante reemplazos. Sin tocar
Alert Engine, Runtime ni la arquitectura certificada.