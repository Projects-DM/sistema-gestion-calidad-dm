# Sprint 235 — Operational Alert Prioritization & Visual Status Projection

> Nivel 5 · Refinamiento operacional · Priorización visual · Proyección de estado de alertas

## Tipo
Presentation Layer Enhancement · Operational Read Model · UX Prioritization

**Impacto:** exclusivamente **Presentation Layer**. No modifica Alert Engine, Notification
Engine, Evaluation Engine, Runtime, Persistencia, Metadata, Resolver, Mapper, Providers ni
Contracts. Estado esperado: **OPERATIONAL ALERT PRIORITIZATION CERTIFIED**.

---

## 1. Objetivo

Transformar las tarjetas de alertas en una **vista operativa priorizada** que permita saber
de un vistazo qué alerta atender primero, cuánto falta para su ejecución, qué está vencida,
qué ejecuta hoy y cuál es la siguiente — reutilizando la metadata existente.

## 2. Principio arquitectónico

La UI **representa**; nunca administra, nunca persiste, nunca evalúa el Alert Engine.

```
AlertConfiguration  →  Metadata existente  →  Operational Resource  →  Tarjeta operacional
```

## 3. Información operacional por tarjeta

- **Cabecera:** nombre, prioridad, y un **estado operacional único**:
  🔴 Vencida · 🟠 Hoy · 🟡 Próxima · 🟢 Activa · ⚫ Deshabilitada.
- **Frecuencia:** "Cada semana", "Cada mes", "Una vez", "Cada X días", "Al vencimiento".
- **Próxima ejecución:** proyección relativa.
- **Tiempo restante:** "En X día(s)", "En X horas", "Hoy".
- **Canal (si existe):** Email · Sistema · Push · Bluetooth.
- **Acciones reutilizadas:** "Ir al formulario" / "Ir al repositorio".

## 4. Orden operacional

Las tarjetas no se muestran en orden de carga; se agrupan por **estado operacional**:

```
Vencidas → Hoy → Próximas → Activas → Deshabilitadas
(dentro de cada grupo, la fecha más cercana primero)
```

## 5. Campos reutilizados (sin campos nuevos)

Se proyectan los campos **canónicos persistidos** (`periodicity`, `expiration`, `priority`,
`notification`, `enabled`). No se crean campos nuevos: el contrato canónico (9 campos) no
persiste `startDate`/`startTime`, por lo que la proyección no los inventa.

| Canónico | Proyección |
|----------|-----------|
| `periodicity {amount, unit}` / `'once'` | frecuencia ("Cada X …" / "Una vez") |
| `expiration` | banda de vencimiento / estado |
| `priority` | prioridad Alta · Media · Baja |
| `notification.channel` | canal (solo si existe) |
| `enabled` | Activa / Deshabilitada |

## 6. Cambios implementados (Sprint 235)

| Archivo | Cambio |
|--------|--------|
| `AlertMonitoringExperience.jsx` | +`operationalState`, +`cadenceDays`, +`frequencyLabel`, +`relativeLabel`, +`channelLabel`; `projectConfigCards` proyecta estado/frecuencia/próxima ejecución/tiempo y ordena (`order` + días); `CardButton` muestra los campos operacionales; agrupación por estado (Vencidas→Hoy→Próximas→Activas→Deshabilitadas). |

La proyección es **temporal y read-only** (no evalúa, no persiste): cuando el Alert Engine
exponga estados operacionales certificados, la UI los reemplazará sin cambiar el diseño
(compatibilidad SSOT).

## 7. Reutilización y no-creación
Reutiliza `AlertMonitoringExperience`, `CardButton`, `AlertConfigurationResolver`,
`alertConfigurations[]`, Runtime Bridge, `ExistingModuleRouteResolver`.
No se crean `AlertPriorityEngine`, `AlertScheduler`, `AlertStatusService`, `AlertCardV2`,
`AlertRuntimeEngine`, `NotificationCenterV2`.

## 8. Definition of Done
✅ Tarjetas con estado operacional. Para ✅ frecuencia, ✅ próxima ejecución, ✅ tiempo
restante, ✅ orden automático (Vencidas→Hoy→Próximas→Activas), ✅ acciones "Ir al
formulario"/"Ir al repositorio", ✅ sin motores/servicios nuevos, ✅ Build PASS,
✅ Regression PASS, ✅ SSOT preservado.

## 9. Certificación OP-1 … OP-12 → **12/12 PASS**
Estado proyectado; 5 estados representados; frecuencia/próxima ejecución/tiempo restante/canal;
orden y agrupación por estatus; navegación preservada; sin motores nuevos; UI consumidora;
sin cambios en Runtime/Engines/Resolver/Mapper/Persistence/Metadata; metadata canónica
reutilizada sin campos inventados.

## 10. Regresión
Build **PASS**; suites Sprint 234 (CP 10/10) y Sprint 229 (PC 16/16) verificadas verdes.

## 11. Evolución posterior
Con la priorización operacional, la lista de alertas es una herramienta de trabajo. Cuando
el Alert Engine provea estados certificados, la UI reemplaza su proyección temporal por
esos estados sin cambiar el diseño ni la UX, preservando la arquitectura SSOT.