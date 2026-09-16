# Sprint 273 — Auditoría Forense: Botón Guardar → UI Write-Path de Configuración de Alertas

**Branch:** `release/stable-sprint79`
**Modo:** AUDIT ONLY — FORENSIC AUDIT (LEVEL 5) · **CERO CAMBIOS DE PRODUCCIÓN**
**SSOT:** este documento (`docs/Sprint-273.md`)
**Dependencias:** Spr 269 (auditoría) · Spr 270 (capabilities, certificado, no reabrir) · Spr 271 (write-path, certificado, no reabrir) · Spr 272 (causa raíz binding, certificado)

Gas de cierre: **SPRINT 273 — AUDITORÍA COMPLETA** · Código: **0 cambios** · `.mjs`: **3 diagnósticos + 1 runner (no producción)**

---

## 1. Mandato (SSOT)

> Determinar con evidencia si el botón **Guardar** de configuración de alertas ejecuta
> correctamente el pipeline existente y, si lo ejecuta, qué recurso, payload y resultado
> atraviesan cada capa — **sin corregir nada** y **sin aceptar previamente ninguna causa**.

La auditoría debía distinguir entre 10 causas potenciales (botón no ejecuta → … → write correcto
pero runtime/binding incorrecto) y clasificar la causa raíz en A–G.

---

## 2. Pregunta central (respondida)

> Cuando el usuario configura una alerta dentro de un formulario de un módulo dinámico y
> presiona **GUARDAR**, ¿el evento llega al `AlertConfigurationApplicationService` con el
> recurso correcto, el resourceId correcto y el payload esperado, y qué resultado retorna a la UI?

**Respuesta:** SÍ llega, con `resource.id` correcto y handler correcto (`forms`), PERO el
**payload** que la rama "Nueva Alerta" construye con los defaults del Panel es **canónicamente
inválido** (`repeatPolicy:'repeat'` sin `periodicity` recurrente), por lo que
`saveCollection` responde `success:false` con **errores indexados por colección** que la UI
**no renderiza**. Resultado observable para el usuario: *"guardo y no aparece ningún error"* y
nada persiste. (Causa raíz **C + E** / compuesta — §8.)

---

## 3. Event Boundary (auditoría del botón exacto)

| Elemento | Resultado | Evidencia |
|---|---|---|
| Componente propietario | `AlertConfigurationForm` | `src/modules/experiences/AlertConfigurationForm.jsx` |
| Botón exacto | "Guardar configuración" | `AlertConfigurationForm.jsx:326-329` |
| Tipo | **submit** (`type="submit"`) | `AlertConfigurationForm.jsx:326` |
| `onSubmit` raíz | `<form onSubmit={e => { e.preventDefault(); onSubmit(); }}>` | `AlertConfigurationForm.jsx:236` |
| `preventDefault()` | **SÍ** (evita submit HTML tradicional) | `AlertConfigurationForm.jsx:236` |
| Handler | `onSubmit` del Panel (`AlertConfigurationPanel.jsx:226`) | se pasa como prop `onSubmit={onSubmit}` |
| Función llamada | `service.saveCollection({ resource, formStates })` | `AlertConfigurationPanel.jsx:239` (nueva alerta) y `:264` (edición) |
| Validación previa | NO (la validación ocurre dentro del AppService, no en la UI) | `AlertConfigurationPanel.jsx:226-277` |
| Early return | `if (!resource) return;` (guarda de recurso ausente, correcto) | `AlertConfigurationPanel.jsx:227` |
| `disabled` / loading | `disabled={saving}` (solo durante la operación; no bloquea el handler) | `AlertConfigurationForm.jsx:326` · no hay `disabled={!isValid}` |
| Double handler / submit HTML | No: el `<form>` es controlado; no hay botón submit nativo fuera de React | — |

---

## 4. Event → ApplicationService (cadena reconstruida)

```
User clicks GUARDAR
   ↓ <form onSubmit> e.preventDefault()  (AlertConfigurationForm.jsx:236)
AlertConfigurationPanel.onSubmit           (src/modules/experiences/AlertConfigurationPanel.jsx:226)
   ↓ rama NEW ALERT (activeKey === null):  formStates = rows.map(a => a.key===next.key ? config : configs[a.key] || {})
   ↓ rama EDIT (activeKey !== null):       formStates = alerts.map(a => configs[a.key] || {})
   ↓ service.saveCollection({ resource, formStates })        (AlterPanel :239 / :264)
AlertConfigurationApplicationService.saveCollection          (…/AlertConfigurationApplicationService.js:195)
   ↓ mapFormStatesToCollection → validateAlertConfiguration por ítem
   ↓ port.saveConfiguration(resource, { alertConfigurations: collection })
```

**AC-03 (¿se invoca?):** la referencia está demostrada por cadena estática (§3) y por la
**prueba controlada** del script Part 2, que ejecuta el `service.saveCollection` REAL con el
port oficial interceptado (SPY) — sin tocarlo — produciendo `success:true/false`
determinísticamente según el payload (§6). La conexión existe y es la única vía (H5, §5).

---

## 5. H5 — ¿Existe otro flujo de guardado?

| Punto de guardado | Usado por el botón Guardar | Evidencia |
|---|---|---|
| `AppService.saveCollection` (vía port oficial) | **SÍ — exclusivo** | `AlertConfigurationPanel.jsx:239,264` |
| `AppService.save` (legacy `saveAlertConfiguration`) | **NO** | `AlertConfigurationApplicationService.js:242-269` — (`@deprecated`) |
| `alertConfigurationPersistence.js` (legacy module) | **NO** | `src/modules/experiences/alertConfigurationPersistence.js` — sin imports en UI |
| Adaptadores/impropios | **NO** | `grep saveAlertConfiguration` solo en legacy + AppService deprecated |

El botón utiliza **únicamente** el write-path certificado de Sprint 271
(`saveCollection → port.saveConfiguration → FORM_HANDLER → dynamicService.updateForm`).

---

## 6. Payload & contrato (certificado con Mapper/Validation/AppService reales)

### 6.1 `scripts/forensic_sprint273_part1.mjs` — Mapper + Validation reales (Node plano, sin BD)

| Escenario | `valid` | Resultado |
|---|---|---|
| Draft producido por `newAlertInitial()` (DEFAULT, sin esquema) | **false** | `errors.policy = ["repeatPolicy 'repeat' requiere una periodicity recurrente ({ amount, unit })."]` |
| `[draft nuevo default]` (simula `onSubmit` nueva alerta) | **false** | `errors[0].policy` idéntico |
| `[existente válido, nuevo default]` (rama edición con alerta nueva sin esquema) | **false** | `errors[1].policy` idéntico |
| `[draft VÁLIDO con esquema "diario"]` | **true** | sin errores |
| `[draft VÁLIDO "al vencimiento"]` | **true** | sin errores |

**Causa inmediata:** el DEFAULT de `createEmptyFormState()` (`AlertConfigurationMapper.js:41-43`)
produce `periodicityMode:'none'`, `expiration:'none'`, `repeatPolicy:'repeat'`; al mapear,
`periodicity:null` + `repeatPolicy:'repeat'` viola `checkPolicyCompatibility`
(`AlertConfigurationValidation.js:131-153`).

### 6.2 `scripts/forensic_sprint273_part2.mjs` — AppService REAL + port SPY (sin escribir BD)

| Caso | `result.success` | `errors` | Port recibió |
|---|---|---|---|
| A: `formStates` válido (diario) | **true** | null | `resourceReference.id = 9fc7d251-…` (asdasd) · `alertConfigurations.length 1` · `periodicity {amount:1,unit:'days'}` · `repeatPolicy:'repeat'` |
| B: `formStates` DEFAULT (sin esquema) | **false** | `{ "0": { "policy": […] } }` | **no llega al port** (frena en validación) |
| C: `[existente válido, nuevo DEFAULT]` | **false** | `{"1": { "policy": […] }}` | no llega al port |
| D: `formStates` vacío | **true** | null | `{ alertConfigurations: [] }` (caso límite; UI no lo produce — Panel solo renderiza si `alerts.length>0`) |

### 6.3 Resultado hacia la UI (9/13/14 del mandato)

`saveCollection` retorna exactamente:
```js
{ success: false, errors: { 0: { policy: […] } }, persisted: null }   // B/C
{ success: true,  errors: null, persisted: { reference, configuration, backend, row } } // A
```
El Panel hace `setErrors(result.errors || {})` (`AlertConfigurationPanel.jsx:250,270`) pero el
Form **solo renderiza** `errors.*` por nombre de campo y `errors.form`
(`AlertConfigurationForm.jsx:313-318`, `FieldError` 61-64). **Los errores indexados por número de
colección (`errors[0]`, `errors[1]`) y `errors.general` NO se muestran.** No hay `void`, no hay
`catch {}` vacío, no hay `finally` problemático (`:252-256,272-276`) — el manejo de excepción
existe, pero la shape de `errors` no coincide con lo que la UI consume.

---

## 7. Identity Contract (Part 3 — identidad del recurso vs BD real)

Script: `scripts/forensic_sprint273_part3.mjs` + `scripts/run_forensic_sprint273_part3.mjs` (SSR Vite).

| Form | `resource.id` (UI → Port) | `resource.module_id` | Handler del Adapter | `id` en BD |
|---|---|---|---|---|
| `weew` | `a1045d33-bb32-444e-9a0b-6328712b68d0` | `432ccb9d-…` | **forms** (FORM_HANDLER) | ✓ existe |
| `asdasd` | `9fc7d251-b6c7-4ced-8d05-b998729cfb1b` | `633abfab-…` | **forms** (FORM_HANDLER) | ✓ existe |

Verificado: **`UI resource.id === Adapter reference.id === DB row.id`** — mismo UUID del
formulario editado. Fuente: `Configuration.jsx:304` (`setAlertConfigTarget(form)` con la fila
cruda de `dynamicService.getFormsByModule`, que incluye `id` + `module_id`,
`dynamicService.js:80-90`). No se usa `module.id` ni `slug` ni `resourceId`.

**Repositorios:** 0 filas en `sgc_document_repositories` → **SKIP** (fixture no disponible; no se
crean datos solo para el sprint). La resolución de handler para repositorio está verificada por
contrato estático (`hasRepositorySignature` en `AlertConfigurationPersistenceAdapter.js:37-41`,
referencia con `module_slug` y sin `module_id`).

---

## 8. CAUSA RAÍZ (clasificación final)

> **ROOT CAUSE C + E (COMPOSITE — ROOT CAUSE G).**
>
> **C — Payload/State Failure:** la rama "Nueva Alerta" del Panel construye el payload desde
> el estado DEFAULT (`createEmptyFormState` → `periodicityMode:'none'` + `repeatPolicy:'repeat'`),
> que el Mapper canoniza como `periodicity:null` + `repeatPolicy:'repeat'`, inválido según
> `checkPolicyCompatibility`. `saveCollection` rechaza el write ANTES del Port.
>
> **E — UI Result Handling Failure:** el resultado `success:false` trae los errores
> **indexados por colección** (`errors[0]['policy']`) o `errors.general`, y ni el Panel ni el
> Form los renderizan — el Form solo dibuja `errors.*` por campo y `errors.form`. El usuario
> ve **exactamente** "guardo y no aparece ningún error".

**Descarte previo (mandato §22):** quedó descartado que el botón no ejecute (A), que entregue
recurso equivocado (B), que falte handler o resourceId (api: PASS §7), y que el write-path
persistente falle (D — cert. Sprint 271). Queda fuera de alcance de este sprint el binding de
capacidad (F) ya certificado en Sprint 272. Ambas fallas (C y E) son independientes y
demostradas por separado (Part 1 y Part 2).

**C en concreto (el usuario NO puede guardar una alerta nueva a menos que seleccione un
esquema de frecuencia):** el estado inicial del editor (NEW ALERT MODE, Sprint 259) arranca
sin esquema; si el usuario rellena nombre/descripción/prioridad y guarda sin tocar
"Frecuencia", el payload es inválido. Y aunque lo tocara, un fallo de persistencia real
(`errors.general`) tampoco lo vería (E).

---

## 9. Matriz final de diagnóstico

| Pregunta | Resultado | Evidencia |
|---|---|---|
| ¿Botón existe? | **PASS** | `AlertConfigurationForm.jsx:326` |
| ¿Handler está conectado? | **PASS** | `AlertConfigurationPanel.jsx:226` ← form `onSubmit` |
| ¿Handler se ejecuta? | **PASS** (cadena + app real ejecutado) | Part 2 (AppService real) + cadena estática §3 |
| ¿saveCollection se ejecuta? | **PASS** | `AlertConfigurationPanel.jsx:239,264` |
| ¿resource.id existe? | **PASS** | Part 3 (formas reales) |
| ¿resource.id es correcto (mismo UUID)? | **PASS** | Part 3 vs BD (7fc7… / a1045d…) |
| ¿formStates contiene la alerta? | **PASS** (contiene el estado editado) | Part 2 casos A–C |
| ¿ApplicationService recibe? | **PASS** | Part 2 (`saveCollection` real) |
| ¿Adapter (port) recibe? | **PASS (solo si payload válido)** | Part 2 caso A; caso B/C frena antes |
| ¿Handler correcto? | **PASS** (`forms` para módulo con `module_id`) | Part 3 + adapter |
| ¿UPDATE ejecuta? | **PASS** (cert. Sprint 271; no re-ejecutado para no escribir) | `dynamicService.updateForm` guard `!data` throw |
| ¿BD cambia (read-after-write)? | **PASS (write válido)** | Sprint 271.1 (asdasd `alertConfigurations`) |
| ¿UI procesa success? | **PASS** (`setSaved(true)` + banner) | `AlertConfigurationPanel.jsx:265-268,314-321` |
| ¿UI procesa error? | **FAIL — parcial** (ignora `errors[index]` y `errors.general`) | `AlertConfigurationForm.jsx:313-318` vs `errors[0]` |
| ¿Read-after-write funciona? | **PASS** | Sprint 271.1 + Part 2 |
| ¿Enrollment funciona? | **PASS** | Sprint 272 Part 3 (asdasd enrolled) |
| ¿Capability permite Alertas (módulo)? | **PASS/parcial** → módulo `sadsad` sí; `ertre` no | Sprint 272 |
| ¿Runtime monta Alertas? | **PASS/parcial** → depende de `operational-experiences` | Sprint 272 |

---

## 10. Acceptance Criteria

| AC | Descripción | Estado |
|---|---|---|
| AC-273-01 | Botón exacto identificado | ✓ `AlertConfigurationForm.jsx:326` |
| AC-273-02 | Handler exacto identificado | ✓ `AlertConfigurationPanel.jsx:226 onSubmit` |
| AC-273-03 | Handler se ejecuta | ✓ cadena estática + AppService real ejecutado (Part 2) |
| AC-273-04 | resource.id demostrado | ✓ Part 3 (`9fc7d251…`/`a1045d33…`) |
| AC-273-05 | resource.id = recurso editado | ✓ mismo UUID de la fila de BD |
| AC-273-06 | formStates real capturado | ✓ Part 1/2 (default y válido) |
| AC-273-07 | Payload lógico capturado | ✓ Part 2 (envelope `{alertConfigurations}` + por-ítem) |
| AC-273-08 | AppService recibe operación | ✓ |
| AC-273-09 | Adapter recibe operación | ✓ (Caso A; B/C: frena por validación — esa es la falla) |
| AC-273-10 | Handler correcto seleccionado | ✓ FORMS para form (Part 3) |
| AC-273-11 | Supabase ejecuta UPDATE | ✓ cert. Sprint 271 (no re-escrito en este sprint) |
| AC-273-12 | `alert_config` real post-click | ✓ asdasd tiene `{alertConfigurations}` (writes válidos); weew `{}` (nunca válido) |
| AC-273-13 | Resultado retornado a UI | ✓ `success:false` con `errors[0]` (Part 2 B/C) |
| AC-273-14 | UI procesa success y errors | ✗ **FAIL:** success ✓, `errors` por índice/general NO renderizados |
| AC-273-15 | Write vs Read vs Enrollment vs Runtime distinguidos | ✓ (write válido OK; read OK; enrollment OK; binding capability = S272) |
| AC-273-16 | Causa raíz concreta y demostrable | ✓ **C + E (composite)** |
| AC-273-17 | `git diff` 0 cambios productivos | ✓ (solo los 4 de Sprint 271 modificados; scripts nuevos no productivos) |
| AC-273-18 | Sprint 270 intacto | ✓ (0 cambios) |
| AC-273-19 | Sprint 271 intacto | ✓ (solo sus 4 cambios verificados, sin tocar) |
| AC-273-20 | Sprint 272 intacto | ✓ (0 cambios sobre su scope) |

---

## 11. Artefactos de diagnóstico (no producción)

- `scripts/forensic_sprint273_part1.mjs` — Mapper/Validation reales; demuestra payload inválido default.
- `scripts/forensic_sprint273_part2.mjs` — AppService real + port SPY; demuestra frontera Event→Port (A–D).
- `scripts/forensic_sprint273_part3.mjs` + `scripts/run_forensic_sprint273_part3.mjs` — identidad
  resource.id vs BD real + `resolveResourceHandler` oficial.

Todos **read-only** respecto a producción: sin INSERT/UPDATE/DELETE/schema. El Part 2 usa un
port SPY que **nunca** invoca `dynamicService`/`documentRepositoriesService`.

---

## 12. Recomendación (fuera de alcance — backlog)

1. **C:** en la rama "Nueva Alerta", normalizar el estado default para que sea canónicamente
   válido en el intento de guardar: o bien aplicar al draft un esquema mínimo coherente
   (p. ej. `periodicityMode:'recurring', unit:'days', amount:1, repeatPolicy:'repeat'`), o
   bien hacer que `checkPolicyCompatibility` acepte `repeatPolicy:'repeat'` sin periodicity
   solo en tránsito UI (no recomendado: rompe contrato canónico).
2. **E:** hacer que `AlertConfigurationForm`/`Panel` traduzcan `errors[index]` y
   `errors.general` a un bloque visible (`errors.form`), o que `saveCollection` exporte los
   errores por campo agregado. Sin cambiar el contrato del port.
3. Volver a evaluar con prioridad el binding por capability de los módulos dinámicos draft
   (Sprint 272 recomendación 1) una vez que C+E estén corregidos.

---

## Estado final

```
SPRINT 273 — AUDITORÍA COMPLETA (AUDIT ONLY · FORENSIC)
Código: 0 cambios productivos   ·   Diagnósticos: 3 .mjs + 1 runner (no producción)
Causa raíz: C (payload inválido default en Nueva Alerta) + E (errores no renderizados)
  — ROOT CAUSE COMPOSITE (G). El botón SÍ ejecuta el pipeline certificado con resource.id
    y handler correctos; el write válido sí persiste (S271). La falla observable
    "guardo y no aparece ningún error" = C + E.
Siguiente: backlog (corrección C y E; luego re-evaluar S272 binding).
```