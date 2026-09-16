# Sprint 248 — Alert Workspace Preview Removal & Direct Editing Certification

> Nivel 5 · Simplificación del Workspace · Eliminación de vista previa redundante · Certificación de edición directa

## Tipo
Presentation Layer · Workspace UX Simplification · Direct Editing Certification

**Impacto:** exclusivamente Presentation Layer (`AlertConfigurationPanel.jsx`). No modifica Alert
Engine, Notification Engine, Runtime, Persistencia, Metadata, `AlertConfigurationApplicationService`,
`AlertConfigurationResolver`, `AlertConfigurationMapper`, Providers, Contracts ni
`alertConfigurations[]`. Estado: **DIRECT EDITION WORKSPACE CERTIFIED**.

---

## 1. Objetivo

Eliminar la información duplicada entre el selector de alertas y el formulario de edición. El
formulario ya representa completamente la alerta seleccionada mediante `activeKey`; por tanto, el
bloque "Alerta activa" introducido en el Sprint 247 resulta redundante y aumenta el ruido visual. El
Workspace pasa a un flujo directo **Colección → Selector → Formulario**, sin capas intermedias.

## 2. Cambio

Se **elimina el bloque "Alerta activa"** (`data-testid="active-alert-preview"`) y su uso de
`activeConfig` / `scheduleLabel(activeConfig)`. El Workspace queda compuesto únicamente por el
selector expandible y el formulario. El formulario es la **única** representación visual de la alerta
seleccionada (sigue consumiendo `configs[active.key]` y remontando por `key={activeKey}`).

**Estado colapsado:** `Alertas configuradas (N) — Seleccionar alerta` (identidad de la colección).
**Expandido:** lista (nombre, estado, programación, prioridad, canal) + Nueva alerta + Duplicar +
Eliminar. Después del selector comienza directamente el formulario.

## 3. Fuente única de representación
La alerta activa queda representada exclusivamente por `AlertConfigurationForm`, que consume
`configs[activeKey]`. No existe representación paralela (sin Preview/Summary/ActiveAlertCard).

## 4. Reutilización certificada y restricciones
Reutiliza `AlertConfigurationPanel`, `AlertConfigurationForm`, `activeKey`, `configs`,
`saveCollection()`, `alertConfigurations[]`, el selector expandible, la toolbar y el flujo
Expand/Collapse. Prohibido crear `AlertPreview` / `AlertSummary` / `ActiveAlertCard` /
`WorkspacePreview` / `AlertWorkspaceV2` / `AlertSelectorV2` / Context / Redux / Zustand / Providers /
Hooks / servicios / motores. Intervención únicamente de presentación.

## 4. Definition of Done
✅ Se elimina completamente el bloque "Alerta activa".
✅ El Workspace queda compuesto únicamente por el selector expandible y el formulario.
✅ No existe información duplicada entre selector y formulario.
✅ `activeKey` continúa siendo la única fuente de verdad.
✅ El formulario representa íntegramente la alerta seleccionada.
✅ La selección visual continúa funcionando correctamente.
✅ Nueva alerta permanece visible en el selector expandido.
✅ Expand/Collapse mantiene el comportamiento certificado.
✅ `saveCollection()` permanece intacto.
✅ `alertConfigurations[]` permanece intacto.
✅ Runtime, Persistencia, Metadata, Resolver, Mapper, Alert Engine y Notification Engine intactos.
✅ Build PASS · Regression PASS · SSOT preservado.

## 7. Certificación AWP-1…AWP-18 → 18/18 PASS (suite dedicada)
Workspace simplificado · eliminación del Preview certificada · eliminación de duplicidad visual ·
flujo directo Selector → Formulario · `activeKey` fuente única · formulario sincronizado · selector
expandible certificado · edición directa certificada · sin componentes redundantes · sin nuevas capas
arquitectónicas · Persistencia intacta · Runtime intacto · Metadata intacta · Resolver intacto ·
Mapper intacto · Alert Engine intacto · Notification Engine intacto ·
**DIRECT EDITING WORKSPACE CERTIFIED**.

## 8. Continuidad
Con el Sprint 248 el Workspace alcanza un modelo de interacción limpio y consistente: la colección
actúa únicamente como selector expandible y el formulario es la única representación de la alerta
seleccionada — reutilizando la infraestructura certificada (`activeKey`, `saveCollection()`,
`alertConfigurations[]`, Runtime y Alert Engine) sin nuevas capas, componentes o lógica paralela.