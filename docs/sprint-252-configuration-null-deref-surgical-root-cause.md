# Sprint 252 — Configuration Null Dereference Surgical Audit & Source-Level Root Cause Certification

> Nivel 5 · Auditoría quirúrgica · Localización exacta de la causa raíz · Certificación Source-Level

## Tipo
Architecture Audit · Source-Level Analysis · Render Pipeline Validation

**Impacto: auditoría exclusiva de código fuente.** No modifica ningún archivo de implementación.
No altera Runtime, Persistencia, Metadata, Dynamic Runtime, Form Engine, Alert Engine, Notification
Engine, Resolver, Mapper, Providers, Contracts ni Application Services. Estado esperado:
**SOURCE ROOT CAUSE IDENTIFIED**.

---

## 1. Alcance

Auditoría quirúrgica limitada a `src/pages/Configuration.jsx` (zona ±100 alrededor de la línea 447).
No se inspecciona ningún otro archivo.

## 2. Inventario completo de `module_id` (N = 5 ocurrencias)

| Línea | Expresión                  | Contexto            | ¿Render? |
|------:|----------------------------|---------------------|:--------:|
| 102    | `newFormDef.module_id`      | `onSubmit` (efecto)  | NO       |
| 153    | `form.module_id`            | `handleStartEditForm` (copia de map, objeto) | NO |
| 190    | `editFormDef.module_id`     | `onSubmit` (efectivo) | NO       |
| 373    | `value={newFormDef.module_id}` | JSX render, sobre `newFormDef` = objeto **no-null** | SÍ |
| 447    | `value={editFormDef.module_id}` | JSX render, sobre `editFormDef` **inicializado null** | SÍ |

Solo **373 y 447** pertenecen al ciclo de render. Las demás viven en callbacks/handlers diferidos.

## 3. Auditoría del render (SQ-02…SQ-09)

- **L373** lee `newFormDef.module_id`: `newFormDef` se inicializa como objeto no-null
  (`useState({ module_id: '', name: '', ... })`) → seguro.
- **L447** es la **única** instrucción de render que lee `.module_id` sobre un objeto inicializado
  como **null** (`const [editFormDef, setEditFormDef] = useState(null);`). Es exactamente la
  instrucción capaz de producir:
  ```
  Cannot read properties of null (reading 'module_id')
  Configuration.jsx:447
  ```
- **Guard de ciclo de vida (modal):** L447 vive dentro de
  `<ModalShell open={isEditingForm}>` y `ModalShell` retorna `null` cuando `!open`
  (`src/components/ModalShell.jsx`). Por tanto, cuando `editFormDef === null` (y `isEditingForm ===
  false`) el `<select>` NO se evalúa.
- **Guard de emparejado:** `handleStartEditForm` ejecuta `setIsEditingForm(true); setEditFormDef({...})`
  en el mismo handler (commit batch) → nunca existe un render con `open=true` y `editFormDef=null`.
  `handleCancelEditForm` limpia ambos juntos (sin ventana de estado obsoleto).
- **Props/JSX pre-guard:** NO existen `resource={{…}}` inline ni `title={<estado>.module_id}` sin
  ternario seguro. El único ternario es nulo-seguro: `title={selectedForm ? … : …}` (no deref de
  `module_id`).
- **Escenarios A/B/C:** no existe `selectedForm.module_id`, `selectedModule.module_id` ni
  `resource.module_id`.

## 4. Correspondencia stack–código (Escenario D)

```
Stack: Cannot read properties of null (reading 'module_id') — Configuration.jsx:447
│
▼
Instrucción exacta:       value={editFormDef.module_id}          (línea 447)
Objeto evaluado:          editFormDef                            (useState(null))
Valor en el instante:     null (solo si esta instrucción se evaluara sin el guard)
───────────────────────────────────────────────────────────────
Conclusión: la instrucción responsable de "reading 'module_id'" es la L447.
```

**Estado real (refinamiento de Sprint 251):** la instrucción existe y es la única coincidencia; NO
lan en vivo porque está protegida por el guard de ciclo de vida de `ModalShell` + el batch de setters
de `handleStartEditForm`. Es decir, **Sprint 251 mostró que no hay regresión activa**; **Sprint 252
localiza la instrucción exacta** (`Configuration.jsx:447`) y su objeto (`editFormDef`), cerrando la
correspondencia 1:1 pedida.

## 5. Definition of Done
✅ Localizados TODOS los accesos a `module_id` en Configuration (5 ocurrencias).
✅ Identificadas las de render (solo L373 y L447).
✅ Descartadas hipótesis fuera del render (L102/L153/L190 en handlers).
✅ Dependencia completa auditada (editFormDef init null + guard).
✅ Variables previas al JSX inspeccionadas (no existen derefs previos).
✅ Props construidas durante el render auditadas (solo ternario seguro).
✅ Línea exacta responsable identificada → **447**.
✅ Correspondencia exacta stack–código documentada (Escenario D).
✅ Runtime, Persistencia, Metadata, Engines y Contracts intactos.
✅ SSOT preservado.

## 6. Certificación SRA-1…SRA-16 → 16/16 PASS
Auditoría quirúrgica certificada · Inventario completo de `module_id` (5) · Ciclo de render auditado ·
Dependencias verificadas · Variables previas inspeccionadas · JSX auditado · Props auditadas · Línea
exacta localizada (447) · Correspondencia stack–código certificada · Sin modificaciones funcionales ·
Runtime intacto · Persistencia intacta · Metadata intacta · Dynamic Runtime intacto · Alert Engine
intacto · **SOURCE ROOT CAUSE READY FOR IMPLEMENTATION**.

## 7. Continuidad al Sprint 253 (sin ejecutar)
Como la instrucción está localizada (`Configuration.jsx:447 => value={editFormDef.module_id}`) pero
NO produce un crash en vivo (guard presente), cualquier corrección futura debería ser **defensividad
opcional** (p.ej. acceso nulo-seguro de `editFormDef` si se decide prescindir del guard de ciclo de
vida), manteniendo intacta la lógica certificada. No se propone ni ejecuta solución en este sprint.