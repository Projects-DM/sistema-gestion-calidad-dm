# Sprint 295 — Disabled Alert Visual Suppression

Rama: `release/stable-sprint79`
Modo: CONTROLLED PRESENTATIONAL CORRECTION · FORENSIC AUDIT + IMPLEMENTATION
Dependencias: Sprint 284 · 290 · 291 · 292 · 293 · 294

## Objetivo

Ocultar completamente del módulo cualquier estado visual correspondiente a una
alerta `enabled === false`, en las tres superficies: **Formulario**,
**Repositorio** y **Categoría**. La configuración, la persistencia, el dominio,
el runtime y las ocurrencias de esa alerta **permanecen intactos** — solo se
suprime su representación visual.

## Auditoría (forense)

Punto de inicio: `src/utils/alertResourceState.js` → `projectResourceAlertState()`
(el selector de presentación puro establecido por Sprint 290).

Hallazgo: `OccurrenceProjection.projectCurrentOccurrences` proyecta ocurrencias
para TODOS los items con ventana válida (no filtra por `enabled`). El selector
de presentación clasificaba cada una vía `classifyForPresentation`, que devolvía
el cubo `disabled` cuando la configuración del item es `enabled === false`.
Resultado: `present: true, status: 'disabled'` y la UI (RepositoryAlertStateBlock /
FormatAlertState) lo mostraba como «Estado: Deshabilitada · Próximo vencimiento…».

El runtime (b)lacking de los `badges` NUNCA sufrió el bug: la vinculación usa
`shouldProduceAlert` (Resolver), que rechaza `enabled === false`, por lo que las
alerta deshabilitadas no entran al contexto de visibilidad.

## Corrección (punto único)

`projectResourceAlertState()`:

1. Antes de clasificar, descarta las ocurrencias cuya propia alerta está
   explícitamente deshabilitada (`cfg?.enabled === false`).
2. Si no queda ninguna ocurrencia presentable → devuelve `null` (`present: false`
   implícito). Ninguna superficie muestra nada.
3. Se elimina el cubo `disabled` del selector (STATUS_PRESENTATION / STATUS_ORDER)
   y la rama muerta en `classifyForPresentation` — la presentación ya no puede
   producir un estado «Deshabilitada».

El mapa `categoryAlertStates` del viewer (Sprint 294) recibe `null` para una
categoría con configuración propia deshabilitada, y la regla de override del
viewer garantiza que **no cae al fallback del repositorio**.

## Regla única

```
enabled === false → present = false → no panel, no card, no badge, no schedule,
                    no «Deshabilitada», no priority, no events.
alert_config/alertConfiguration → SIGUE PERSISTIENDO.
```

## Regla por superficie

| Recurso | Configuración | Resultado visual |
|---|---|---|
| Formulario | `enabled=true` | Mostrar |
| Formulario | `enabled=false` | Ocultar |
| Repository | `enabled=true` | Mostrar |
| Repository | `enabled=false` | Ocultar |
| Category | `enabled=true` | Mostrar |
| Category | `enabled=false` | Ocultar |
| Category sin config + Repository enabled | — | Heredar |
| Category sin config + Repository disabled | — | Ocultar |
| Category propia disabled + Repository enabled | `disabled` | **Ocultar (no hereda)** |

## No se toca

`AlertConfigurationPanel` · `AlertConfigurationPersistenceAdapter` ·
`AlertConfigurationResolver` · `OccurrenceProjection` · `OccurrenceLifecycle` ·
`Completion` · `OccurrenceLedger` · `CompletionBridge` · `Scheduler` ·
`Configuration` · `Persistence` · `Schema` · `documentRepositoriesService` ·
lógica de categoría/repositorio/formulario (dominio) · `Dashboard KPI` ·
`AlertMonitoringExperience`.

No se eliminan ocurrencias de alertas deshabilitadas.

## STOP

Detener si para ocultar se requiere: modificar `OccurrenceProjection` /
`OccurrenceLifecycle` / `Completion` / persistencia / schema; eliminar
occurrences; crear identidad/estado nuevo; o lógica específica
RepositoryAlert/CategoryAlert/FormAlert.

## Archivos

- `src/utils/alertResourceState.js` — selector de presentación (corrección única).
- `src/modules/documentViewer/ModuleDocumentViewer.jsx` — override de categoría
  sin caída al repositorio cuando posee configuración propia.
- `docs/Sprint-295.md` — este documento.
- `scripts/sprint-295-disabled-alert-visual-suppression.mjs` — certificación.