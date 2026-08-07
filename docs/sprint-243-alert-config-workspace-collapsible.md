# Sprint 243 — Alert Configuration Workspace UX Consolidation & Collapsible Collection Navigator

> Nivel 5 · Workspace de Configuración · Navegador colapsable de colección · Certificación de la experiencia administrativa

## Tipo
Presentation Layer · Workspace Refactoring · UX Consolidation

**Impacto:** exclusivamente sobre la Presentation Layer del módulo de Configuración
(`AlertConfigurationPanel.jsx` y estructura visual asociada). No modifica Alert Engine,
Notification Engine, Runtime, Metadata, Persistencia, Resolver, Mapper, Application Service,
Providers, Contracts ni el modelo `alertConfigurations[]`.
Estado: **COLLAPSIBLE ALERT CONFIGURATION WORKSPACE CERTIFIED**.

---

## 1. Objetivo

Optimizar la experiencia de configuración de alertas (Formularios Dinámicos → Alertas y
Repositorios Documentales → Alertas) sin alterar la arquitectura. La colección sigue
administrándose igual pero deja de ocupar permanentemente la parte superior del panel.

## 2. Modelo UX certificado

- **Estado inicial colapsado**: el panel muestra el resumen de la alerta seleccionada (nombre +
  badge habilitada/deshabilitada + resumen de programación). La colección permanece oculta.
- **Al expandir**: `Alertas configuradas (N)` con el listado resumido de cada alerta (solo vista
  previa: nombre, programación, prioridad, canal, activa) y acciones `Nueva alerta / Duplicar /
  Eliminar`.
- **Al seleccionar una alerta**: el formulario cambia a esa alerta, se marca como activa y el
  selector **se colapsa automáticamente**.
- El formulario (`AlertConfigurationForm`) ocupa el área principal del workspace.

## 3. Selección explícita

`activeAlert` (≙ `activeKey`) **solo** cambia por acción explícita del usuario (selección, crear,
duplicar) o en la **carga inicial** cuando no existe selección (`alerts[0]?.key || null`).
Nunca se reemplaza automáticamente por la primera en cada render.

## 4. Reutilización certificada

Se reutilizan íntegramente `AlertConfigurationPanel`, `AlertConfigurationForm`, los estados
`alerts`/`configs`/`activeAlertKey`, `saveCollection()` y `loadCollection()`. La única
modificación es la **organización visual** del panel. **No** se crean
`AlertWorkspaceV2` / `AlertSidebar` / `AlertNavigatorService` / `AlertAccordionEngine` /
`AlertConfigurationPanelV2` / `AlertTree` / `AlertSelectorService`.

## 5. Guardas arquitectónicas

- `alertConfigurations[]` intacta; la persistencia continúa vía `saveCollection()`.
- El formulario sigue editando una única alerta; la colección sigue administrando múltiples.
- Sin cambios en Alert Engine, Notification Engine, Runtime, Metadata, Persistencia, Resolver,
  Mapper, Providers ni Contracts. SSOT preservado.

## 6. Definition of Done

✅ La colección se presenta inicialmente colapsada.
✅ El formulario de edición ocupa el área principal del workspace.
✅ El usuario puede expandir la colección cuando desee.
✅ La selección de una alerta actualiza el formulario correctamente.
✅ La alerta seleccionada permanece activa hasta que el usuario cambie explícitamente.
✅ La colección sigue permitiendo crear, duplicar, eliminar y habilitar/deshabilitar alertas.
✅ No cambia la persistencia ni el modelo `alertConfigurations[]`.
✅ No se crean nuevos componentes de negocio, motores, servicios o contratos.
✅ Build PASS · Regression PASS · SSOT preservado.

## 7. Certificación UX-1…UX-16 → 16/16 PASS (suite dedicada)

Workspace consolidado · colección colapsable · selección explícita · formulario como foco
principal · reutilización completa del `AlertConfigurationPanel` y `AlertConfigurationForm` ·
persistencia intacta · navegación simplificada · sin nuevas capas arquitectónicas ·
**COLLAPSIBLE ALERT CONFIGURATION WORKSPACE CERTIFIED**.