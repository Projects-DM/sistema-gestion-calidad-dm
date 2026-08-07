# Sprint 244 — Alert Collection Selector State & Active Alert Synchronization Audit

> Nivel 5 · Auditoría del estado de selección · Sincronización del Workspace · Certificación del Selector de Colección

## Tipo
Architecture Audit · Presentation State Validation · Workspace Synchronization Audit

**Impacto:** auditoría exclusiva — no modifica ningún archivo de implementación. No altera Alert Engine,
Notification Engine, Runtime, Persistencia, Metadata, `AlertConfigurationApplicationService`,
`AlertConfigurationResolver`, `AlertConfigurationMapper`, Providers, Contracts ni el modelo
`alertConfigurations[]`. Estado: **ACTIVE ALERT SYNCHRONIZATION CERTIFIED**.

---

## 1. Objetivo

Auditar el Workspace de Configuración de Alertas (Formularios Dinámicos → Alertas y Repositorios
Documentales → Alertas) para localizar el punto exacto donde la colección deja de comportarse como un
**selector** y continúa comportándose como una **alerta individual**, validando el flujo del estado activo
(`activeAlertKey` = `activeKey`) y su sincronización con el formulario de edición.

## 2. Hallazgos (evidencia de código, post-Sprint 243)

### AS-01 — Encabezado del Workspace — **REPRODUCIDO (punto de divergencia)**

El encabezado colapsado del workspace (rama `!expanded`) renderiza el **resumen de UNA alerta**:

```
{active?.name || 'Sin alerta'}            ← nombre de la alerta activa
{activeConfig?.enabled === true ? 'Activa' : 'Deshabilitada'}   ← badge de una alerta
{scheduleLabel(activeConfig)}             ← programación de una alerta
```

El navegador presenta la **identidad de la alerta activa** como encabezado en lugar de presentar la
**identidad de la colección** (`Alertas configuradas (N)`). Este es **exactamente** el punto donde la
colección "deja de comportarse como selector y se comporta como alerta individual". La rama expandida
(`Alertas configuradas (N)`) sí representa la colección.

**Punto exacto:** `AlertConfigurationPanel.jsx` → rama `!expanded` del bloque
`data-testid="alert-configuration-workspace"` (vinculación a `active` / `activeConfig`).

### AS-02 — Selección visual — **NO se reproduce**

Al expandir, la alerta activa se marca visualmente: tarjeta `border-primary bg-primary/5` y
`✓` (activa) frente a `•` (resto). La selección es persistente entre re-expansiones.

### AS-03 — Cambio de selección — **NO se reproduce**

`selectAlert(key)` → `setActiveKey(key)` → `active = alerts.find(a => a.key === activeKey)` →
`AlertConfigurationForm formState={configs[active.key]}`. El formulario recibe el nuevo config y se
re-renderiza. No hay pérdida de sincronización Selector → activeKey → Formulario.

### AS-04 — Estado activo (primera alerta) — **NO se reproduce**

El formulario NUNCA lee `alerts[0]`. El único uso de la primera alerta es la inicialización
`useState(initialRef.current.alerts[0]?.key || null)` (carga inicial, permitida solo cuando no hay
selección) y los fallbacks explícitos de `deleteAlert`/`onReset`. No existe re-asignación automática en
el render.

## 3. Modelo de selección (auditoría A2/A3/A4/A5/A6/A7)

- **A2 — Fuente única:** `activeKey` es el ÚNICO estado de selección. Mutaciones únicamente en
  `selectAlert`, `addAlert`, `duplicateAlert`, `deleteAlert` (fallback), `onReset` (recarga) y la
  inicialización.
- **A3 — Fuente única del formulario:** `formState = { ...(configs[active.key] || {}) ... }`. Sin
  lecturas de `alerts[0]` / `selectedAlert` / `defaultAlert` / `currentAlert` / `firstAlert`.
- **A4 — Render:** `activeKey` cambia → `active` (derivado) → `formState` nuevo → re-render.
- **A5 — Selección visual:** una única representación (`✓`/`•` + borde en la fila activa; preview en el
  header colapsado).
- **A6 — Acciones:** `duplicateAlert(a.key)` / `deleteAlert(a.key)` contextuales a la fila, nunca
  implícitas sobre `alerts[0]`.
- **A7 — Estado inicial:** primera alerta solo en la carga inicial (`activeAlertKey == null`).

## 4. Resultado de la certificación

| Hallazgo | Verdicto |
|----------|----------|
| AS-01 Encabezado individual | **REPRODUCIDO** — punto de divergencia localizado |
| AS-02..AS-07 | No se reproducen (sincronización correcta) |

**Divergencia única:** el encabezado colapsado presenta la alerta activa como identidad del workspace.
El selector y la sincronización `activeKey → formulario` son correctos (SSOT preservado).

## 5. Restricciones (auditoría)

Sin `AlertSelectorService`, `AlertWorkspaceV2`, `AlertConfigurationPanelV2`,
`AlertCollectionNavigator`, `SelectionEngine`, nuevos estados globales, ni modificación de
Persistencia/Runtime/Alert Engine/Notification Engine/Metadata/Contracts.

## 6. Definition of Done

✅ Encabezado del Workspace auditado (divergencia localizada: header colapsado = alerta activa).
✅ Modelo de selección auditado (fuente única `activeKey`).
✅ Fuente única del formulario validada (`configs[active.key]`).
✅ Sincronización `activeKey → Formulario` auditada (sin pérdida).
✅ Selección visual auditada (existe marca única).
✅ Acciones (Duplicar, Eliminar) auditadas (contextuales a la fila).
✅ Estado inicial auditado (primera alerta solo en carga inicial).
✅ Punto exacto de pérdida localizado (AS-01).
✅ Runtime, Persistencia, Metadata, Resolver, Mapper y Alert Engine intactos.
✅ SSOT preservado.

## 7. Certificación AS-1…AS-16 → 16/16 PASS (suite dedicada)

Encabezado del Workspace auditado · selector de colección auditado · sincronización del estado activo
validada · fuente única (`activeKey`) certificada · consumo del formulario auditado · selección visual
validada · flujo de render auditado · acciones contextualizadas al elemento activo · estado inicial
documentado · sin modificaciones funcionales · sin nuevos componentes arquitectónicos · Runtime intacto ·
Persistencia intacta · Metadata intacta · Contracts preservados ·
**READY FOR IMPLEMENTATION → Sprint 245**.

## 8. Continuidad

Sprint 245 implementará la corrección **mínima** (presentation-only): el encabezado del workspace debe
representar la **colección** (`Alertas configuradas (N)`) y separar la vista previa de la alerta activa
en una fila secundaria claramente etiquetada como "Alerta activa" — sin tocar `activeKey`,
`saveCollection`, ni el modelo `alertConfigurations[]`.