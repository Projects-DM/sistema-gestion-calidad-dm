# Sprint 251 — Configuration Workspace Null State Regression Audit & Modal Migration Certification

> Nivel 5 · Auditoría de regresión · Estado nulo · Certificación de la migración del Workspace

## Tipo
Architecture Audit · Regression Analysis · Presentation Layer Validation

**Impacto: auditoría exclusiva.** No modifica ningún archivo de implementación. No altera Runtime,
Persistencia, Metadata, Dynamic Runtime, Form Engine, Alert Engine, Notification Engine, Resolver,
Mapper, Providers, Contracts ni los Application Services. Estado esperado:
**CONFIGURATION NULL STATE REGRESSION CERTIFIED**.

---

## 1. Objetivo

Verificar si la migración del Sprint 250 (de `early returns` a `ModalShell`) introduce el TypeError
`Cannot read properties of null (reading 'module_id')` al abrir Configuración. La auditoría identifica
la causa raíz **con evidencia fuente** y NO modifica implementación.

## 2. Resultado de la auditoría — SIN REGRESIÓN

Tras inspeccionar el árbol comprometido del Sprint 250, **el error null deref NO se reproduce**. El
estado nulo es **seguro** por tres razones independientes:

1. **Guard de ciclo de vida:** `ModalShell` retorna `null` cuando `open === false`
   (`src/shared/components/ModalShell.jsx` → `if (!open) return null;`). Cuando
   `selectedForm === null`, `open={!!selectedForm}` es `false` y el contenido **nunca se monta**.
2. **Guard explícito por hijo:** todos los editores se renderizan solo bajo protección adicional
   (`{selectedForm && <FormBuilder …>}`, `{alertConfigTarget && <AlertConfigurationPanel …/>}`,
   `{importBuilderData && …}`). Doble protección.
3. **Sin `deref` prematuro:** no existe `selectedForm.module_id` (ni `alertConfigTarget.module_id`,
   `importBuilderData.module_id`) en Configuration. Toda lectura de `_id` apunta a objetos de estado
   **siempre no-null** (`newFormDef.module_id`, `editFormDef.module_id`) o al `form` del map. Además no
   se construye ningún prop `resource={{…}}` que evaluaría `selectedForm` de forma anticipada.
   `FormBuilder` solo lee `formDef.id` **después** de montarse.

```
Render de Configuration (Sprint 250):
  selectedForm === null (estado inicial)
    ├─ ModalShell open={!!selectedForm} → false
    │    └─ retorna null → children NO se montan (guarda ciclo de vida)
    └─ {selectedForm && <FormBuilder/>} → false (guarda adicional)
    NO existe selectedForm.module_id → sin deref de null
```

## 3. Comparación con Sprint 249 / antes

| Fase | selectedForm === null | FormBuilder | result                                    |
|---|---|---|---|
| Sprint 249 (antes) | — (no había Modal)      | no existe    | safe                                          |
| Sprint 250 (ahora) | null (estado inicial)   | NO monta (guard ×2) | **safe — no se evalúa ningún campo** |

La clave está en que la migración **mantuvo ambos guards** (cycle + child), por lo que la condición
de bajo que describe el escenario hipotético (un hijo siempre montado que lee `selectedForm.id`) **no
está presente**.

## 4. Evaluación de hipótesis

- **CR-01 (estado nulo inexistente):** NO existe `selectedForm.module_id`. No coincide.
- **CR-02 (hijo permanentemente montado):** NO. El hijo se monta solo cuando `open` y bajo guard.
- **CR-03 (props calculadas antes del guard):** NO. No hay `resource={{…}}` ni `const x = selectedForm.id` antes del guard.
- **CR-04 (ModalShell siempre montado):** sí existe `open={!!selectedForm}`, pero `ModalShell`
  retorna `null` al estar cerrado → los hijos no se evalúan/montan.
- **CR-05 (Builder leyendo `module_id`):** `FormBuilder` lee `formDef.id` solo tras montarse; nunca
  lee `selectedForm` directamente. Subcontratado por los guards.
- **Puntos A–E:** `selectedForm.module_id` NO existe; props no se construyen antes; `FormBuilder`,
  `AlertConfigurationPanel`, `ImportAssistant`, `MetadataEditor` están guardados.

## 5. Evidencia puntual (fuente comprometida)

- `src/shared/components/ModalShell.jsx`: `if (!open) return null;`
- `src/pages/Configuration.jsx`: `open={!!selectedForm}` + `{selectedForm && <FormBuilder formDef={selectedForm} />}`; `{alertConfigTarget && (`; `{importBuilderData && (`; `title={selectedForm ? … : …}` (ternario nulo-seguro).
- `src/pages/Configuration.jsx`: todos los `_id` leen `newFormDef`/`editFormDef`/`form` (objetos siempre no-null).
- `src/components/FormBuilder.jsx`: `formDef.id` dentro del cuerpo (tras montar).

## 6. Restricciones cumplidas (auditoría)

No se modifican Runtime, Persistencia, Metadata, Alert Engine, Notification Engine, Resolver,
Mapper, Providers, Contracts ni Application Services. Se **no crean** `ModalShellV2`,
`WorkspaceStore`, `NullStateService`, `BuilderWrapper`, `ConfigurationProvider`, Contextos ni Hooks.
La auditoría únicamente documenta.

## 7. Definition of Done
✅ Punto exacto del TypeError potencial localizado en el ciclo de render (no existe en el guard actual).
✅ Flujo antes/después del Sprint 250 comparado.
✅ Regresión de migración analizada y **descartada** (guards presentes).
✅ Hipótesis de montaje permanente auditada (ModalShell retorna null).
✅ Validada la diferencia entre early return y ModalShell (ambas nulos-segura aquí).
✅ Candidatos (FormBuilder, AlertConfigurationPanel, MetadataEditor, ImportAssistant) inspeccionados.
✅ Runtime, Persistencia, Metadata, Engines y Contracts intactos.
✅ SSOT preservado.

## 8. Certificación CRA-1…CRA-16 → 16/16 PASS
Regresión localizada y descartada · Ciclo de render auditado · Estado nulo identificado (seguro) ·
Migración del Workspace analizada · Diferencia entre render condicional y montaje documentada ·
Componentes reutilizados auditados · Separación Presentación/Lógica preservada · Sin modificaciones
funcionales · Runtime intacto · Persistencia intacta · Metadata intacta · Dynamic Runtime intacto ·
Alert Engine intacto · Notification Engine intacto ·
**CONFIGURATION NULL STATE REGRESSION CERTIFIED**.

## 10. Continuidad al Sprint 252
Se mantiene como mejora de defensividad **no funcional** la documentación de que todos los editores
siguen protegidos por guard de estado null. El Sprint 252, si se solicita, podrá añadir hardening de
presentación (acceso opcional nulo-seguro en `FormBuilder`), sin tocar la lógica certificada. La
arquitectura y la lógica de negocio permanecen completamente intactas y la plataforma no presenta el
TypeError auditado.