# Sprint 231 — Alert Experience Consolidation Audit & Single Operational Projection

> Nivel 5 · Auditoría de arquitectura · Consolidación de experiencias operacionales ·
> Eliminación de duplicidad de representación · SSOT preservado

## Tipo
Architecture Audit · Presentation Consolidation · SSOT Preservation

**Impacto:** elimina la **doble representación** del dominio de alertas introducida en el
Sprint 230. Remueve `OperationalAlertCollectionCards` y su bloque, y deja a
`AlertMonitoringExperience` como la **única** superficie operativa, consumiendo
`alertConfigurations[]` (Sprint 229) mediante el Resolver certificado y conservando la
navegación existente. Solo presentación; Alert Engine, Notification Engine, Runtime,
Providers, Repositories y Contracts permanecen intactos.

---

## 1. Resumen ejecutivo

Los Sprint 227–230 consolidaron la persistencia de la colección de alertas, pero el
Sprint 230 introdujo una **segunda superficie** mostrando el mismo dominio:
`OperationalAlertCollection` ("Alertas configuradas") junto a `AlertMonitoringExperience`
("Alertas Activas"). Ambas consumían la misma metadata → violación SSOT de la capa de
presentación.

Sprint 231 elimina esa duplicidad: **una sola representación**, reusando la experiencia
operativa madura (navegación, integración con Runtime, "Ir al formulario"/"Ir al
repositorio") y cambiando únicamente el origen de lectura: antes `alertConfiguration`
(single), ahora `alertConfigurations[]` (una tarjeta **por alerta**).

## 2. Problema observado (antes)

```
DUPLICIDAD (Sprint 230 y posteriores)
  Bloque nuevo      Bloque histórico
  "Alertas config." "Alertas Activas"
  OperationalAlertCollectionCards  AlertMonitoringExperience
  (sin navegación)  (con navegación)
  → dos sistemas percibidos, dos diseños, dos puntos de mantenimiento
```

## 3. Cambios implementados (Sprint 231)

| Archivo | Cambio |
|--------|--------|
| `src/modules/experiences/OperationalAlertCollection.jsx` | **ELIMINADO** (componente duplicado de Sprint 230). |
| `AlertMonitoringExperience.jsx` | Remueve el import y el bloque duplicado. Añade `projectConfigCards(resources)` (proyección inline, read-only) que consume `extractResourceAlertCollection`/`resolveResourceAlertCollection` y renderiza las tarjetas a través del `CardButton` existente con navegación (`open-form` / `go-to-document`). **Única representación.** |
| `docs/sprint-230-*` / suite `sprint-230-*` | Sustituidos por la certificación/documento de consolidación (supersede). |

### Modelo arquitectónico (después)
```
Configuración
   ↓ alertConfigurations[]
   ↓ Resolver (extract/resolve)                     ← SSOT de metadata intacto
AlertMonitoringExperience  ← única representación
   ↓ Alert Cards (una por alerta)
   ↓ "Ir al formulario" / "Ir al repositorio"       ← navegación existente
   ↓ Formulario / Repositorio dinámico
No existe otra representación.
```
- Tarjeta por **alerta** (no por formulario): 3 alertas sobre un mismo formulario →
  3 tarjetas independientes, cada una con su botón de navegación, sin duplicar la
  supervía de presentación.
- Legacy single `alertConfiguration` → colección de **1** → 1 tarjeta (retrocompatible).
- Recurso nunca configurado → 0 tarjetas.

## 4. Guardas de arquitectura
- **No evalua:** la UI nunca importa `evaluateAlert` / `AlertEvaluationEngine`.
- **No persiste:** nunca `saveConfiguration` / `saveCollection` vía Runtime.
- **No crea** experiencias/componentes paralelos.
- **No modifica** Alert Engine, Notification Engine, Runtime, Providers, Repositories, Contracts ni Metadata.

## 5. Responsabilidades
- **AlertMonitoringExperience:** única superficie operativa; consume `alertConfigurations[]` vía Resolver; navegación preservada; una tarjeta por alerta.
- **Configuración (Panel/Form):** administra y persiste la colección; no proyecta en operativo.
- **Runtime:** estados/estatus; no se toca.

## 6. Certificación CA1–CA14 → **14/14 PASS**
Reúso de `AlertExperience` única; duplicación de Sprint 230 eliminada (import + archivo + bloque); sin nuevas experiencias/componentes; navegación "Ir al formulario"/"Ir al repositorio"; consumición `alertConfigurations[]` vía Resolver; retrocompatibilidad legacy; Alert Engine, Notification Engine, Runtime, Providers/Repositories/Contracts intactos; UI únicamente consumidora; una sola representación por dominio; SSOT preservado.

## 7. Regresión
Suites Sprint 227 (AC), 228 (AR), 229 (PC) verificados verdes tras la consolidación; build **PASS**.

## 8. Continuidad
Queda una única representación operativa basada en la colección persistida. Los siguientes
incrementos (estados visuales Activa · Próxima · Hoy · Vencida · Deshabilitada, Bell del
Dashboard y dashboard consolidado) consumirán únicamente el estado del Alert Engine, sin
crear nuevas superficies.