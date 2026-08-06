# Sprint 234 — Form Navigation Payload Correction & Runtime Route Compatibility

> Nivel 5 · Corrección de navegación de Formularios Dinámicos · Compatibilidad con Runtime ·
> Reutilización certificada

## Tipo
Presentation Layer Correction · Runtime Compatibility · Navigation Payload Fix

**Impacto:** únicamente en la construcción del payload de navegación dentro de la proyección
operacional (`projectConfigCards`). No modifica Alert Engine, Notification Engine, Evaluation
Engine, Runtime, `ExistingModuleRouteResolver`, `AlertConfigurationResolver`,
`AlertConfigurationMapper`, Providers, Contratos, Persistence ni Metadata. Estado esperado:
**FORM NAVIGATION RESTORED · RUNTIME COMPATIBILITY CERTIFIED**.

---

## 1. Objetivo

Corregir la navegación del botón **"Ir al formulario"** reutilizando exactamente el flujo
certificado del Runtime. No se modifica ninguna ruta, ni React Router, ni el Runtime Bridge.
**Únicamente** se corrige el dato enviado desde `projectConfigCards()`.

## 2. Causa raíz certificada (Sprint 233)

La proyección construía `action: { action: 'open-form', resourceId: resource.id }` (id
numérico), pero el Runtime espera `resourceId === form.slug`. Eso producía
`resolveFormRoute(formSlug = id)` → **Formulario no encontrado**.

## 3. Corrección autorizada

En `projectConfigCards()` (única rama `open-form`):
```
Antes:  resourceId: resource.id
Después: resourceId: resource?.slug ?? resource?.formSlug ?? resource?.identifier ?? resource?.id
```
Se respeta el orden de prioridad del identificador del formulario. La rama `go-to-document`
**no se toca**.

## 4. Alcance

| Elemento | Detalle |
|----------|---------|
| Archivo | `src/modules/experiences/AlertMonitoringExperience.jsx` |
| Función | `projectConfigCards()` → rama `open-form` |
| Sin cambios | `go-to-document`, CardButton, ACTION_ROUTE, resolver, hook |

## 5. Reutilización certificada

Rehúsa íntegra: `AlertMonitoringExperience`, `CardButton`, `ExistingModuleRouteResolver`,
`resolveActionRoute()`, Runtime Navigation, Runtime Bridge, `AlertConfigurationResolver`,
`alertConfigurations[]`. No se crea `NavigationService`, `RouteResolverV2`,
`RuntimeNavigator`, `AlertLinkResolver`, `FormNavigationAdapter` ni `AlertCardV2`.

## 6. Validaciones (Casos 1–5)

1. Alerta sobre un formulario → "Ir al formulario" abre el formulario.
2. Tres alertas sobre el mismo formulario → cada tarjeta abre el mismo formulario (✔).
3. Alertas sobre formularios distintos → cada tarjeta abre **su** formulario.
4. Repositorios → "Ir al repositorio" continúa funcionando (sin regresiones).
5. Legacy single `alertConfiguration` → 1 tarjeta → abre el formulario.

## 7. Guardas de arquitectura
- **No cambia** rutas, React Router, Runtime, `ExistingModuleRouteResolver`, Engine,
  Persistence, Metadata, Resolver, Mapper.
- La corrección se limita al **payload de navegación** de la proyección.
- UI sigue siendo únicamente **consumidora** (no evalúa, no persiste).

## 8. Certificación CP-1 … CP-10 → **10/10 PASS**
Payload `open-form` con slug (orden `slug→formSlug→identifier→id`); sin payload id-only;
`go-to-document` intacto; reuso del resolver certificado; sin servicios/adaptadores/V2;
retrocompatibilidad legacy single; colección como única fuente; sin duplicidad; UI
consumidora; sin cambios en Runtime/Engines/Resolver/Mapper/Persistence/Metadata; SSOT
preservado.

## 9. Regresión
Build **PASS**. Suites Sprint 233 (auditoría) y Sprint 234 verdes. La base unificada queda
estable para los próximos sprints (estados visuales Activa · Próxima · Hoy · Vencida ·
Deshabilitada, centro de notificaciones y dashboard consolidado).

## 10. Continuidad
Con la navegación restaurada (formularios y repositorios reutilizando el Runtime), la
experiencia operacional queda unificada: una sola representación, una tarjeta por alerta,
navegación funcional, sin lógica paralela ni cambios a la arquitectura certificada.