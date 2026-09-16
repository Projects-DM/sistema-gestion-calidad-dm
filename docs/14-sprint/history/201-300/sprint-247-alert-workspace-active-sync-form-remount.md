# Sprint 247 — Alert Workspace Active Context Synchronization & Form Remount Certification

> Nivel 5 · Sincronización del contexto activo · Remontaje determinístico del formulario · Certificación del Workspace de Alertas

## Tipo
Presentation Layer · Workspace Synchronization · UI State Consistency

**Impacto:** exclusivamente Presentation Layer (`AlertConfigurationPanel.jsx`,
`AlertConfigurationForm.jsx` — reutilizados íntegramente). No modifica Alert Engine, Notification
Engine, Runtime, Persistencia, Metadata, `AlertConfigurationApplicationService`,
`AlertConfigurationResolver`, `AlertConfigurationMapper`, Providers, Contracts ni
`alertConfigurations[]`. Estado: **ACTIVE WORKSPACE SYNCHRONIZATION CERTIFIED**.

---

## 1. Objetivo

Eliminar la percepción de que el Workspace trabaja sobre una única alerta. La colección ya está
sincronizada por `activeKey`; este Sprint corrige **únicamente la representación** (dos arreglos
presentation-only). No se toca persistencia, negocio ni modelo temporal.

## 2. Problemas corregidos (de las auditorías 244/245/246)

- **WS-01 / WF-05 / AS-01**: el header colapsado representaba la **alerta activa** como identidad.
- **WS-02 / WF-09**: al cambiar de alerta, `AlertConfigurationForm` conservaba estado local
  (`schemeKey`/`repeatChoice`) de la alerta anterior.
- **WS-03**: falsa percepción de "todas las alertas son la misma" — solo representación.

## 3. Modelo certificado

```
Alertas configuradas (N)
      → Selector expandible
      → Alerta activa (bloque independiente)
      → Formulario
```

### Header colapsado (colección únicamente)
```
Alertas configuradas  (N)   ▼  Seleccionar alerta
```
Sin nombre, badge, frecuencia, programación ni estado — todo pertenece a la alerta activa.

### Bloque "Alerta activa" (independiente)
Caja separada bajo el selector, **no** forma parte del encabezado, **no** controla la expansión y
**no** reemplaza la identidad de la colección. Muestra: nombre, descripción, frecuencia
(`scheduleLabel`) y estado (Activa/Deshabilitada).

### Remontaje determinístico del formulario (Opción A)
`<AlertConfigurationForm key={activeKey} .../>`: cada cambio de `activeKey` remonta el formulario y
reconstruye todos sus estados internos (`schemeKey`, `repeatChoice`) desde el `formState` nuevo. Una
sola estrategia (remount por `key`); sin `useEffect` de resync coexistente.

## 4. Definition of Done

✅ Header representa exclusivamente la colección.
✅ La alerta activa aparece en una sección independiente.
✅ `activeKey` continúa siendo la única fuente de verdad.
✅ El formulario se reconstruye completamente al cambiar de alerta (`key` remount).
✅ Frecuencia, repetición y demás estados internos sincronizados con la alerta seleccionada.
✅ El selector permite identificar visualmente qué alerta está activa.
✅ Expand/Collapse consistente.
✅ Persistencia, `saveCollection` y `alertConfigurations[]` intactos.
✅ Runtime, Alert Engine, Metadata, Persistencia y Contracts intactos.
✅ Build PASS · Regression PASS · SSOT preservado.

## 5. Reutilización certificada y restricciones

Reutiliza íntegramente `AlertConfigurationPanel`, `AlertConfigurationForm`, `activeKey`, `configs`,
`saveCollection()`, `alertConfigurations[]`, la toolbar y el workspace existentes. Prohibido crear
`AlertWorkspaceV2` / `AlertSelectorV2` / `AlertFormV2` / `AlertCollectionWorkspace` /
`WorkspaceStore` / `SelectionStore` / Context / Redux / Zustand / Providers / servicios de
sincronización globales.

## 6. Certificación AWS-1…AWS-18 → 18/18 PASS (suite dedicada)

Workspace representa la colección · header desacoplado de la alerta activa · selector expandible ·
`activeKey` fuente única · vista previa sincronizada · remontaje completo del formulario ·
sincronización de estados locales · consistencia visual · acciones contextuales preservadas ·
persistencia intacta · Runtime intacto · Metadata intacta · Resolver intacto · Mapper intacto ·
Alert Engine intacto · Notification Engine intacto · sin nuevos componentes arquitectónicos ·
**ACTIVE WORKSPACE SYNCHRONIZATION CERTIFIED**.

## 7. Continuidad

Con Sprint 247 el Workspace queda funcionalmente completo: la colección se comporta como un selector
expandible real, el usuario cambia visualmente entre alertas sin ambigüedad y el formulario refleja
siempre íntegramente la alerta seleccionada — reutilizando la infraestructura certificada sin nuevas
capas.