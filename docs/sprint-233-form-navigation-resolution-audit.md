# Sprint 233 — Form Navigation Resolution Audit & Runtime Route Reuse Certification

> Nivel 5 · Auditoría de resolución de navegación · Reutilización del Runtime Bridge ·
> Corrección de apertura de Formularios Dinámicos

## Tipo
Architecture Audit · Runtime Navigation Validation · Presentation Stabilization

**Impacto:** **auditoría exclusiva** — no se modifica ningún archivo de implementación.
No modifica Alert Engine, Notification Engine, Runtime, Persistencia, Metadata,
AlertConfigurationResolver, Providers ni Contracts. Estado esperado: **FORM NAVIGATION
CERTIFIED** (el origen del error queda localizado para el Sprint 234).

---

## 1. Objetivo

Auditar por qué las tarjetas proyectadas desde `alertConfigurations[]` abren correctamente
los **Repositorios Documentales**, pero producen **"Formulario no encontrado"** al intentar
abrir un **Formulario Dinámico**. Localizar el punto exacto donde se pierde la referencia
del formulario antes de aplicar cualquier corrección.

## 2. Problema observado

| Destino | Acción | Resultado |
|--------|--------|-----------|
| Repositorio | "Ir al repositorio" (`go-to-document`) | ✔ abre correcto |
| Formulario | "Ir al formulario" (`open-form`) | ✖ "Formulario no encontrado" |

Ambos parten de la **misma colección** `alertConfigurations[]`. Conclusión: la colección no
es el problema; la navegación existe; el Runtime funciona. La divergencia está en **cómo la
proyección construye el payload** de cada tarjeta.

## 3. Hipótesis validadas (FN-01 … FN-05)

| Hipótesis | Veredicto | Evidencia |
|-----------|-----------|-----------|
| FN-01: la tarjeta no conserva el identificador correcto del formulario | **CONFIRMADA** | `projectConfigCards` envía `resource?.id` (id numérico), no el `slug`. |
| FN-02: envía `id` cuando el Runtime espera `formSlug`/`formId` | **CONFIRMADA** | `resolveActionRoute('open-form')` usa `resourceId` → `formSlug` (`ExistingModuleRouteResolver:90`). |
| FN-03: la proyección elimina metadata necesaria | **CONFIRMADA** | `projectConfigCards` toma `resource?.id` y descarta `resource?.slug`, aunque el formulario lo expone (`getFormsByModule` selecciona `slug`). |
| FN-04: CardButton reusa open-form pero recibe payload incompleto | **CONFIRMADA (parcial)** | `CardButton` y `open-form` son correctos; reciben `resourceId: id` (inválido como slug). |
| FN-05: la pérdida ocurre solo en la proyección | **CONFIRMADA** | Resolver entrega bien la colección; la pérdida está en `projectConfigCards`. |

## 4. Auditoría técnica (A1–A4)

### A1 · AlertMonitoringExperience.jsx
- `configCards = projectConfigCards(existing)` → la colección llega completa al card.
- `CardButton` recibe `card.action = { action: 'open-form', resourceId: resource?.id }`.
- La navegación `open-form` consume `resourceId`.

### A2 · projectConfigCards()
Comparación de la propiedad usada para abrir el formulario:

| Origen | Identificador enviado a `open-form` |
|--------|-------------------------------------|
| Tarjeta Runtime (histórica) | `formId = alert.resource = form.slug` ✔ |
| Tarjeta colección (Sprint 232) | `resourceId = resource?.id` ✖ (id numérico) |

**Propiedad que dejó de proyectarse:** `resource.slug`.

### A3 · CardButton / open-form
- `open-form` → `resolveActionRoute('open-form', { moduleSlug, resourceId })`.
- Parámetro esperado: `resourceId === formSlug` (ej. `"mantenimiento"`).
- Recibe hoy `resourceId === resource.id` (UUID/numérico) → ningún formSlug registrado
  coincide → "Formulario no encontrado".

### A4 · Runtime Navigation
- Flujo histórico (funciona): `boundContext.resource = form.slug` → `formId` →
  `resolveAlertNavigation` `resourceId = formId` → `resolveFormRoute(formSlug)`.
- Flujo colección (roto): `projectConfigCards` `resourceId = resource.id` → mismo
  `resolveFormRoute(formSlug=id)` → no coincide.
- **Primer punto de divergencia:** `src/modules/experiences/AlertMonitoringExperience.jsx`,
  `projectConfigCards()`, la construcción de `action` para `open-form`.

## 5. Archivo y línea de la pérdida

- **Archivo:** `src/modules/experiences/AlertMonitoringExperience.jsx`
- **Función:** `projectConfigCards()`
- **Línea:** la rama `isForm` que construye
  `action: { action: 'open-form', resourceId: resource?.id }`.
- **Certidumbre:** es **problema de la proyección**, en la construcción de la referencia
  (`id` en lugar de `slug`); **no** del Resolver ni del CardButton.

## 6. Corrección a aplicar en Sprint 234 (documentada, NO implementado aquí)

El Sprint 234 deberá **reutilizar exactamente** la navegación certificada y solo corregir el
payload de la proyección:

```
Formulario → action: { action: 'open-form', resourceId: resource.slug ?? resource?.name ?? resource?.id }
Repositorio → sin cambio (go-to-document resuelve por módulo y ubica por documentId) ✔
```

Sin crear rutas, `NavigationService`, `FormResolverV2`, `RouteResolverV2`, ni modificar
Runtime/Engine/AlertConfiguration.

## 7. Certificación de la auditoría (FN-A1 … FN-A5)
Suite `sprint-233-form-navigation-{resolution}-audit-certification.mjs` →
verifica la pérdida en `projectConfigCards`, el contrato `open-form`→`formSlug`, el
`form.slug` histórico, la ausencia de motores/servicios de navegación nuevos y que
Runtime/Alert Engine/Persistencia/Metadata no fueron modificados.

## 8. Regresión
Auditoría exclusiva → sin cambios de código; el `git status` debería quedar sin
modificaciones de fuentes.

## 9. Resultado de la auditoría (evidencia)
- **¿Qué dato usaba la implementación histórica?** `form.slug` (`RuntimeBindingResolver`, como `formId`).
- **¿Qué dato usa actualmente la colección?** `resource.id` (id numérico).
- **¿Qué propiedad dejó de proyectarse?** `resource.slug`.
- **¿En qué archivo ocurre?** `AlertMonitoringExperience.jsx`, `projectConfigCards()`.
- **¿Resolver, proyección o CardButton?** **Proyección** (`projectConfigCards`). Resolver y CardButton correctos.

## 10. Continuidad
Con el punto de pérdida localizado, el **Sprint 234** se limitará a restaurar la referencia
correcta del formulario (`resource.slug`) reutilizando la navegación certificada, sin nueva
lógica paralela.