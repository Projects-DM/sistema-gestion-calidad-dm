# Sprint 245 — Alert Collection Selector Interaction Audit & Workspace UX Certification

> Nivel 5 · Auditoría de interacción · Selector de colección · Certificación del Workspace de Configuración

## Tipo
Architecture Audit · Presentation Interaction Audit · Workspace UX Validation

**Impacto:** auditoría exclusiva — no modifica Alert Engine, Notification Engine, Runtime, Persistencia,
Metadata, Resolver, Mapper, Providers, Contracts ni `alertConfigurations[]`.
Estado: **COLLECTION SELECTOR UX CERTIFIED**.

---

## 1. Objetivo

Auditar la cadena de interacción del selector de alertas del Workspace de Configuración para
localizar por qué el usuario percibe que trabaja sobre una única alerta aunque internamente la
colección está sincronizada por `activeKey`:

```
Colección → Selector visual → activeKey → Formulario → Toolbar → Persistencia
```

## 2. Verificación por fuentes (evidencia de código, post-Sprint 243)

### UX-01 — Fuente única de selección — VERIFICADO
Único estado: `const [activeKey, setActiveKey] = useState(...)`. No existen `selectedAlert`,
`activeAlert`, `currentAlert`, `previewAlert`, `workspaceAlert` como fuentes adicionales. `activeKey`
es la ÚNICA fuente de verdad.

### UX-02 — Click → setActiveKey — VERIFICADO
`selectAlert(key)` ejecuta `setActiveKey(key)` (además de `setExpanded(false)` y limpiar estado). El
click MUTA el estado; no solo estilos.

### UX-03 — Toda la UI consume `activeKey` — VERIFICADO
`active = alerts.find(a => a.key === activeKey)`; `activeConfig = configs[activeKey]`. No se lee
`alerts[0]` / `initialAlert` / `defaultAlert` / `firstAlert` fuera de la inicialización (carga inicial)
y los fallbacks explícitos de `deleteAlert`/`onReset`.

### UX-04 — Formulario consume `configs[activeKey]` — VERIFICADO
`AlertConfigurationForm formState={{ ...(configs[active.key] || {}), name: active?.name, ... }}`.
Nunca `configs[firstAlert]`.

### UX-05 — Toolbar contextual — VERIFICADO
`duplicateAlert(a.key)` / `deleteAlert(a.key)` por fila. Habilitar/Deshabilitar se edita en el
formulario por `enabled`. Nunca sobre el primer elemento ni un implícito.

### UX-06 — Preview — VERIFICADO
El preview colapsado lee `active?.name`, `activeConfig?.enabled`, `scheduleLabel(activeConfig)` —
derivado de `activeKey`. No es una referencia antigua.

### UX-07 — Header — PUNTO LOCALIZADO
El encabezado colapsado (`data-testid="alert-configuration-workspace"`, rama `!expanded`) muestra la
**alerta activa** (`active`) como resumen. Es correcto según `activeKey`, PERO es la única zona que
presenta el workspace como "una alerta individual" en lugar de "la colección" — la causa de la
percepción del usuario. Es el único desacople de percepción.

### UX-08 — Render de la lista — VERIFICADO
La lista se reconstruye desde `alerts.map(...)` y marca la fila activa con `alert.key === activeKey`
(✓/• + borde `border-primary`).

## 3. Resultado

| Punto | Verdicto |
|-------|----------|
| Fuente única | `activeKey` — VERIFICADO |
| Click→set | VERIFICADO |
| Header/Preview | Vinculado a `active` — LOCALIZADO (percepción de "alerta única") |
| Formulario/Toolbar/Lista | Consumen `activeKey` — VERIFICADO |

**Conclusión:** NO existe componente que lea la primera alerta ni que ignore `activeKey`. La única
prompt es que el encabezado colapsado presenta la alerta activa como identidad del workspace,
reforzando la percepción de "alerta única"; el resto de la cadena está correctamente sincronizada.

## 6. Restricciones
Sin `AlertSelectorV2` / `AlertWorkspaceV2` / `SelectionEngine` / `WorkspaceStore` /
`AlertCollectionStore` / nuevos Context / Redux / Zustand / Providers / Services / Hooks / Contracts.
La auditoría solo documenta.

## 7. Definition of Done
✅ Fuente única (activeKey) auditada.
✅ Flujo Click → setActiveKey validado.
✅ Header auditado (vinculado a `active`).
✅ Preview auditado (derivado de `activeKey`).
✅ Formulario auditado (`configs[activeKey]`).
✅ Toolbar auditada (contextual por fila).
✅ Lista auditada (`alerts.map` + `key === activeKey`).
✅ Acciones contextuales auditadas.
✅ Punto donde la UI deja de representar la alerta activa localizado (header colapsado).
✅ Runtime, Persistencia, Metadata, Resolver, Mapper, Alert Engine y Notification Engine intactos.
✅ SSOT preservado.

## 8. Certificación UXS-1…UXS-16 → 16/16 PASS (suite dedicada)
Selector auditado · interacción validada · sincronización visual certificada · Header auditado ·
Preview auditado · Formulario auditado · Toolbar auditada · Render de colección auditado · acciones
contextualizadas · fuente única de selección validada · sin nuevos componentes · Runtime intacto ·
Persistencia intacta · Metadata intacta · Contracts preservados ·
**READY FOR IMPLEMENTATION → Sprint 246**.

## 9. Continuidad
Sprint 246 (presentation-only) puede hacer explícito el contexto de colección: el header colapsado
debe mostrar la identidad de la colección (`Alertas configuradas (N)`) y relegar la vista previa de la
alerta activa a una fila secundaria etiquetada "Alerta activa", sin tocar `activeKey`,
`saveCollection` ni el modelo `alertConfigurations[]`.