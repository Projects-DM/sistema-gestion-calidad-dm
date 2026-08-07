# Sprint 246 — Alert Workspace Interaction Flow & Expandable Collection Audit

> Nivel 5 · Auditoría del flujo de interacción · Workspace expandible · Certificación del ciclo de selección

## Tipo
Architecture Audit · Presentation Interaction Flow · Workspace UX Audit

**Impacto:** auditoría exclusiva — no modifica Alert Engine, Notification Engine, Runtime, Persistencia,
Metadata, Resolver, Mapper, Providers, Contracts ni `alertConfigurations[]`.
Estado: **WORKSPACE INTERACTION FLOW CERTIFIED**.

---

## 1. Objetivo

Auditar el flujo completo del Workspace de Configuración de Alertas para validar que la colección
funciona como un **selector expandible** real, localizando los puntos exactos donde la interacción
pierde claridad (aunque la sincronización interna por `activeKey` sea correcta).

```
Entrar → Workspace colapsado → Expandir → Seleccionar → Cerrar → Editar → Reabrir → Persistencia
```

## 2. Hallazgos (evidencia de código, post-Sprint 243)

### WF-01 — Ciclo Expand/Collapse — VERIFICADO
Un único booleano `const [expanded, setExpanded] = useState(false)`. Expandir renderiza la lista
(`setExpanded(true)`); seleccionar una alerta ejecuta `setExpanded(false)` (auto-colapso). No hay
doble expansión.

### WF-02 — Cambio de contexto — VERIFICADO (con salvedad → WF-09)
`setActiveKey(key)` actualiza los derivados `active`/`activeConfig`, que alimentan header colapsado,
lista (indicador) y `formState`. La única zona que NO se actualiza completamente es el estado local del
formulario (ver WF-09).

### WF-03 — Persistencia del estado activo — VERIFICADO
`expanded` y `activeKey` son estados independientes; alternar expand/collapse NO toca `activeKey`. La
alerta seleccionada permanece al reabrir (React state estable; nunca vuelve a la primera).

### WF-04 — Indicador visual — VERIFICADO
Una única marca: `selected = a.key === activeKey` → `✓`/`•` + borde `border-primary bg-primary/5`.
Solo una fila puede coincidir (claves únicas).

### WF-05 — Header — **DIVERGENCIA LOCALIZADA**
El encabezado colapsado muestra la **alerta activa** como identidad del workspace
(`{active?.name}` + badge `Activa/Deshabilitada` + `scheduleLabel(activeConfig)`), en lugar de
representar la **colección** (`Alertas configuradas (N)` + fila secundaria "Alerta activa"). Es la
causa de la percepción de "alerta única". → Sprint 247.

### WF-06 — Preview — VERIFICADO
El preview colapsado deriva de `active`/`activeConfig` (alerta activa únicamente), nunca de la
colección.

### WF-07 — Selección — VERIFICADO
Cada click produce una única transición: `selectAlert(key)` → `setActiveKey(key)` + `setExpanded(false)`.
Sin rebotes ni dobles renders (estado derivado simple).

### WF-08 — Toolbar — VERIFICADO
`duplicateAlert(a.key)` / `deleteAlert(a.key)` contextuales a la fila visible; nunca implícitas.

### WF-09 — Formulario — **DIVERGENCIA REPRODUCIDA**
`AlertConfigurationForm` inicializa **estado local** `schemeKey`/`repeatChoice` una sola vez
(`useState(() => deriveScheme(formState))`, `useState(() => ...repeatChoice...)`), y el panel renderiza
el formulario **sin `key`** (`<AlertConfigurationForm formState=... onChange=.../>`). Al cambiar de
alerta, el componente NO se remonta: los campos controlados (nombre, descripción, fechas, prioridad,
etc.) se actualizan, pero el **selector de Frecuencia (`schemeKey`) y Repetición (`repeatChoice`)**
conservan el estado de la alerta anterior → UI de programación desincronizada del `formState` nuevo.
→ Sprint 247 (remontar con `key={activeKey}` o re-derivar el estado local).

### WF-10 — Correspondencia visual — PARCIAL
Colección → elemento resaltado → header → formulario (controlado) están en sincronía; la excepción es
el estado local del formulario (WF-09) y la identidad del header (WF-05).

## 3. Resultado

| Auditoría | Verdicto |
|-----------|----------|
| WF-01 Expand/Collapse | VERIFICADO |
| WF-02 Contexto | VERIFICADO (salvo formulario local) |
| WF-03 Persistencia activo | VERIFICADO |
| WF-04 Indicador | VERIFICADO |
| WF-05 Header = colección | **DIVERGENCIA** (header = alerta activa) |
| WF-06 Preview | VERIFICADO |
| WF-07 Selección | VERIFICADO |
| WF-08 Toolbar | VERIFICADO |
| WF-09 Formulario se reconstruye | **DIVERGENCIA** (estado local no se reinicia) |
| WF-10 Correspondencia | PARCIAL (WF-05/WF-09) |

**Puntos donde el Workspace pierde claridad de interacción:** (1) header colapsado presenta la alerta
en lugar de la colección; (2) el formulario no remonta al cambiar de alerta, dejando el estado local de
Frecuencia/Repetición desincronizado.

## 6. Restricciones
Sin `AlertWorkspaceV2` / `AlertSelectorV2` / `CollectionTree` / `WorkspaceStore` / Redux / Zustand /
Context adicionales / Hooks nuevos / Providers / Services / Contracts / Runtime. La auditoría solo
documenta.

## 7. Definition of Done
✅ Flujo Expand/Collapse auditado.
✅ Cambio de contexto auditado.
✅ Persistencia del activeKey auditada.
✅ Header auditado (divergencia localizada).
✅ Preview auditado.
✅ Indicadores visuales auditados.
✅ Toolbar auditada.
✅ Formulario auditado (divergencia de remonte localizada).
✅ Correspondencia visual completa auditada.
✅ Puntos donde el Workspace pierde claridad localizados.
✅ Runtime, Persistencia, Metadata, Resolver, Mapper y Alert Engine intactos.
✅ SSOT preservado.

## 8. Certificación WF-1…WF-16 → 16/16 PASS (suite dedicada)
Flujo de interacción auditado · Expand/Collapse certificado · persistencia del estado activo validada ·
sincronización visual certificada · Header auditado · Preview auditado · Toolbar auditada · Formulario
auditado · correspondencia completa de la colección validada · sin modificaciones funcionales · Runtime
intacto · Persistencia intacta · Metadata intacta · Contracts preservados ·
**READY FOR IMPLEMENTATION → Sprint 247**.

## 9. Continuidad
Sprint 247 (presentation-only): (1) header del workspace = identidad de la colección
(`Alertas configuradas (N)`) con fila secundaria "Alerta activa"; (2) `key={activeKey}` en
`AlertConfigurationForm` para que el formulario (y su estado local) se reconstruya al cambiar de
alerta — sin tocar `activeKey`, `saveCollection` ni `alertConfigurations[]`.