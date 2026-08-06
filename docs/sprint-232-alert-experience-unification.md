# Sprint 232 — Alert Experience Unification & Navigation Reuse Certification

> Nivel 5 · Consolidación definitiva de la experiencia operacional · Reutilización de
> navegación certificada · Eliminación de duplicidad SSOT

## Tipo
Architecture Consolidation · Presentation Refactoring · Runtime Navigation Reuse

**Impacto:** exclusivo en **Presentation Layer**. No modifica Alert Engine, Notification
Engine, Evaluation Engine, Runtime, Persistence, Metadata, Providers, Resolver ni Mapper.
Estado esperado: **SINGLE ALERT EXPERIENCE CERTIFIED** — una sola experiencia operacional.

---

## 1. Objetivo

Eliminar definitivamente la coexistencia entre **"Alertas Configuradas"** y **"Alertas
Activas"**, dejando una única experiencia operacional que:
- represente la **colección persistida** (`alertConfigurations[]`),
- mantenga la **navegación certificada** ("Ir al formulario" / "Ir al repositorio"),
- reutilice el **Runtime Bridge** (`useAlertRuntime`),
- reutilice la lógica existente de apertura de formularios y repositorios.

## 2. Gap detectado tras Sprint 231

El Sprint 231 eliminó el componente externo y su bloque, pero dentro de la experiencia aún
coexistían **dos superficies de tarjetas**:

| Superficie | Contenido |
|-----------|-----------|
| **Alertas configuradas** | tarjetas de la colección (`configCards`) |
| **Alertas Activas** | tarjetas del Runtime (priority groups) |

Sprint 232 **unifica**: la colección es la **única** fuente de tarjetas; desaparece la
cabecera/sección paralela del Runtime.

## 3. Modelo final (único)

```
Configuración
  └ alertConfigurations[]
      └─ Resolver (extractResourceAlertCollection / resolveResourceAlertCollection)
          └── AlertMonitoringExperience                  ← única experiencia
              └── projectConfigCards(existing) → una tarjeta POR ALERTA
                  └── grouped por prioridad (Alta · Media · Baja)
                      └── CardButton                       ← Card certificada
                          ├── Ir al formulario    (open-form)
                          └── Ir al repositorio  (go-to-document)
No existe otra representación.
```

- Un formulario con 3 alertas → **3 tarjetas independientes**, sin duplicar superficie.
- Legacy single `alertConfiguration` → colección de 1 → **1 tarjeta** (retrocompatible).
- Recurso nunca configurado → **0 tarjetas**.

## 4. Cambios implementados (solo presentación)

| Archivo | Cambio |
|--------|--------|
| `AlertMonitoringExperience.jsx` | `alertConfigurations[]` como **única fuente** (`projectConfigCards(existing)`); se eliminan el bloque "Alertas configuradas" y los priority groups del Runtime ("Alertas Activas"); una sola cabecera "Alertas"; tarjetas agrupadas por prioridad y renderizadas por `CardButton` con la navegación certificada. Se retiran `viewModel`/`priorityGroups` y el import `AlertTriangle` no usado. |

**No se crean** `AlertNavigationService`, `AlertRuntimeNavigator`, `AlertCardV2`,
`AlertOperationalCard`, `NavigationAdapter`, `RuntimeNavigationV2`,
`OperationalAlertCardV2` ni `AlertLinkResolver`. Toda la navegación ya existía.

## 5. Auditoría de reutilización (A1–A4)
- **A1** `AlertMonitoringExperience.jsx` → navegación/handlers/callbacks/Runtime Bridge reutilizados.
- **A2** `projectConfigCards()` → proyecta colección por alerta; no duplica metadata.
- **A3** `CardButton` ya soporta `open-form` / `go-to-document` → reutilizado tal cual.
- **A4** `open-form`, `go-to-document`, `navigate()`, `ExistingModuleRouteResolver`, Runtime actions → **sin reimplementar**.

## 6. Guardas de arquitectura
- **No evalua:** la UI nunca importa `evaluateAlert` / `AlertEvaluationEngine`.
- **No persiste:** no `saveConfiguration` / `saveCollection`.
- **No modifica** Alert Engine, Notification, Runtime, Persistence, Metadata, Providers, Resolver, Mapper.
- **Una única representación** visual por dominio; **SSOT preservado**.

## 7. Certificación AU1–AU16 → **16/16 PASS**
Reúso de `AlertExperience` única; `alertConfigurations[]` como fuente única; una tarjeta por
alerta; `CardButton` (sin V2); navegación certificada reutilizada; Resolver reutilizado;
coexistencia eliminada; sin V2/servicios de navegación; Alert Engine, Notification, Runtime,
Persistence/Providers/Contracts/Metadata intactos; UI consumidora; retrocompatibilidad legacy;
sin servicios nuevos; SSOT preservado.

## 8. Regresión
Sprint 229 (PC1–PC16) y Sprint 227 (AC1–AC15) verificados verdes tras la unificación;
build **PASS**.

## 9. Continuidad
Queda certificada una **única experiencia operacional** comandada por la colección persistida.
Próximos incrementos (estados visuales Activa · Próxima · Hoy · Vencida · Deshabilitada, Bell
del Dashboard y dashboard consolidado) consumirán únicamente el estado del Alert Engine, sin
crear nuevas superficies.