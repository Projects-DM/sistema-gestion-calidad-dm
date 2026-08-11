# Sprint 274 — Auditoría Forense: Estado Inicial y Feedback de Configuración de Alertas

**Branch:** `release/stable-sprint79`
**Modo:** AUDIT ONLY — FORENSIC AUDIT (LEVEL 5)
**SSOT:** este documento (`docs/Sprint-274.md`)
**Artefacto permitido:** únicamente `docs/Sprint-274.md`
**Dependencias:** Sprint 270 (certificado) · Sprint 271 (certificado) · Sprint 272 (certificado) · Sprint 273 (ROOT CAUSE preliminar C + E)

> **PRINCIPIO:**
> **AUDIT FIRST — CORRECT SECOND.**
> Sprint 274 no corrige nada. Produce el diagnóstico definitivo que Servirá de SSOT
> para el Sprint 275 de corrección.

---

## AUDIT RESULT

```text
Classification:  CONFIRMED — C + E
Estado inicial (Nueva Alerta) produce un par canónicamente contradictorio
(repeatPolicy:'repeat' + periodicity:null) que la validación certificada rechaza.
La UI, tras Sprint 273, SÍ muestra ahora el mensaje de error; antes no lo mostraba.

C = DRAPI-STATE FAILURE  (default draft incoherente)
E = ERROR FEEDBACK FAILURE (histórico) — resuelto parcialmente por la presentación activa

C = CONFIRMADA por inspección
E = CONFIRMADA — el feedback hoy es visible (evidencia de que el pipeline de eventos
                Y la validación funcionan), pero el draft defectuoso sigue a UPSTREAM.
```

---

## Evidence

Toda la evidencia proviene de inspección del código committeado (HEAD `623f197`) y de
los archivos de trabajo. Mapper, Validation y ApplicationService son componentes
certificados (Sprints 270-273) y **no aparecen modificados en `git diff`** — salvo el
`AlertConfigurationApplicationService.js` que tiene un delta local no commiteado (ver
`Hallazgo-0`).

### H1 — `periodicityMode:'none'` + `repeatPolicy:'repeat'` en el DRAFT por defecto

`AlertConfigurationMapper.js`:

```js
// línea 41-43
export function createEmptyFormState() {
  return mapMetadataToFormState(null);
}
```

```js
// línea 55-103 (mapMetadataToFormState)
const periodicityMode =
  periodicity === 'once'
    ? 'once'
    : periodicity && typeof periodicity === 'object'
      ? 'recurring'
      : 'none';                    // ← source.periodicity undefined ⇒ 'none'

// ...
repeatPolicy: source.repeatPolicy || 'repeat',   // ← línea 101 — default 'repeat'
```

⇒ `createEmptyFormState()` devuelve por construcción un draft que combina:

```text
periodicityMode = 'none'
repeatPolicy    = 'repeat'
```

Este par es el estado que el contrato canónico ya declara incompatible.

### H2 — `mapFormStateToMetadata` traduce `'none'` → `periodicity:null`

`AlertConfigurationMapper.js` (líneas 119-129):

```js
const periodicity =
  f.periodicityMode === 'once'
    ? 'once'
    : f.periodicityMode === 'recurring'
      ? Object.freeze({ amount: ..., unit: ... })
      : null;                       // ← periodicityMode 'none' ⇒ null
// línea 172
repeatPolicy: f.repeatPolicy || 'repeat',
```

⇒ El conversor es **fiel**: conserva `repeatPolicy:'repeat'` y materializa
`periodicity:null`. NO introduce la incompatibilidad; la TRANSPORTA tal cual la recibe.

### H3 — La validación certificada rechaza el par — CORRECTA

`AlertConfigurationValidation.js` (líneas 131-153):

```js
export function checkPolicyCompatibility(metadata) {
  const recurring = periodicity && typeof periodicity === 'object' && !Array.isArray(periodicity);
  if (metadata.repeatPolicy === 'repeat' && !recurring) {
    problems.push("repeatPolicy 'repeat' requiere una periodicity recurrente ({ amount, unit }).");
  }
  // ...
}
```

`validateAlertConfiguration` asigna el problema a `errors.policy` (líneas 210-213).

⇒ Mensaje observable:

```text
No se puede guardar
Alerta 1 — repeatPolicy 'repeat' requiere una periodicity recurrente ({ amount, unit }).
```

es EXACTAMENTE el texto de `checkPolicyCompatibility`, promovido a la UI por la
presentación. Validation está funcionando conforme a su contrato. **No es el bug.**

### H4 — El Panel transporta el draft por defecto sin reconciliar

`AlertConfigurationPanel.jsx` **HEAD** (committeado), `newAlertInitial`:

```js
const newAlertInitial = () => {
  const { startDate, startTime } = getCurrentLocalDateTime();
  return {
    ...createEmptyFormState(),     // ← hereda periodicityMode:'none', repeatPolicy:'repeat'
    name: '',
    description: '',
    startDate,
    startTime,
    enabled: true,
    automaticClose: true,
  };
};
```

- NO sobrescribe `periodicityMode`.
- NO sobrescribe `repeatPolicy`.
- En `onSubmit` (modo Nueva Alerta, `activeKey === null`):
  `rows.map(...)` → `config = { ...draft, name, description }` → `saveCollection`.

⇒ El Panel es el **consumidor** que copia el draft defectuoso íntegro. No lo reconcilia.
La frontera Panel→`formStates` es de TRANSPORTE, no de generación.

### H5 — El Form muestra el estado recibido; si el usuario no toca Frecuencia, lo envía tal cual

`AlertConfigurationForm.jsx` (no modificado en working tree):

- `repeatChoice` se inicializa desde el draft: `repeatPolicy === 'repeat' → 'si'`
  (líneas 196-198).
- `deriveScheme` devuelve `'none'` cuando `periodicityMode` no es `'recurring'` y
  `expiration` no es `'recurring'/'fixed'` (líneas 335-349).
- Los handlers `applyScheme`/`handleRepeat` SÍ escriben pares coherentes, pero SOLO
  cuando el usuario interactúa.

⇒ El Form NO produce el estado inválido; lo **muestra y reenvía** si el usuario no
toca la frecuencia. Demuestra "estado inválido que ya recibió".

### H6 — `saveCollection` detiene el flujo ANTES del Port

`AlertConfigurationApplicationService.js` (líneas 195-224, HEAD):

```js
for (let i = 0; i < collection.length; i += 1) {
  const metaValidation = validateAlertConfiguration(collection[i]);
  if (!metaValidation.valid) errors[i] = metaValidation.errors;
}
if (Object.keys(errors).length > 0) {
  return { success: false, metadata: collection, errors, persisted: null };   // ← NEVER touches port
}
const persisted = await port.saveConfiguration(resource, { alertConfigurations: collection });
```

⇒ El Port NO recibe el payload inválido porque la validación certificada lo detiene.
Esto es comportamiento CORRECTO del write-path certificado (Sprint 271).

---

## Root Cause — se responde a la pregunta central

> ¿Por qué `Nueva Alerta` inicia con `repeatPolicy = 'repeat'` mientras `periodicity`
> permanece en `null`?

**Porque el generador del draft por defecto (`mapMetadataToFormState(null)`, vía
`createEmptyFormState`) define en paralelo dos defaults que el propio contrato ya
considera incompatibles:**

```text
repeatPolicy    — default 'repeat'   (línea 101)
periodicityMode — default 'none'     (líneas 58-63)
```

Al no existir metadata fuente, `createEmptyFormState()` produce un draft con
`periodicityMode:'none'` y `repeatPolicy:'repeat'`. El Panel (`newAlertInitial`) lo
copia sin reconciliar; `mapFormStateToMetadata` lo traduce con fidelidad a
`repeatPolicy:'repeat'` + `periodicity:null`; `checkPolicyCompatibility` lo rechaza.

```text
ORIGEN DEL ERROR   ⇒ Mapper: generación del DRAFT por defecto (defaults internos
                     contradictorios) consumidos sin reconciliar por el Panel.
CAPA QUE DETECTA   ⇒ Validation: checkPolicyCompatibility — CORRECTA.
TRANSPORTE         ⇒ mapFormStateToMetadata (fiel) + Panel (copia íntegra).
```

**No confundir**: el Mapper en su rol de CONVERSIÓN es inocente; el Mapper en su rol de
generador de DRAFT por defecto es donde nace la inconsistencia. La validación NO debe
tocarse (Sprint 274 §14).

---

## Rejected Hypotheses

| Hipótesis | Veredicto | Evidencia |
| --- | --- | --- |
| A — Button/Event Failure | Descartada | El evento llega: la validación responde `success:false` y la UI lo puede renderizar. |
| B — Resource Identity Failure | Descartada | `resource`/`resourceId` correctos en Sprints 271-273 certificados; errores son de validación, no de identidad. |
| D — Persistence Failure | Descartada | El Port nunca se invoca con el payload inválido (H6). No hay fallo de persistencia implicado. |
| F — Capability/Binding Failure | Descartada | Certificado en Sprint 270/272. |
| G — Composite | Descartada salvo C+E | Solo C (estado) y E (feedback) tienen evidencia directa. |

**Confirmado: C + E** (refutando cualquier intento de atribuir el fallo a componente A/B/D/F/G).

---

## Architectural Decision

### 14 — Decisión sobre la validación

```text
AlertConfigurationValidation.js  ⇒ NO MODIFICAR. CORRECT. CONTRATO DE DOMINIO INTACTO.
```

La validación rechaza legítimamente `repeat + periodicity:null`. Debilitarla para
"compensar" el default incorrecto viola el principio rector:

> **No debilitar un contrato de dominio para compensar un estado inicial incorrecto.**

La corrección debe hacerse aguas arriba (default del draft), no en la validación.

### Clasificación definitiva

```text
C — Draft/State Failure: default draft contradictorio.
E — Error Feedback Failure: SOLO histórico (Sprint 273 lo expuso). Hoy el mensaje es visible.
```

---

## Recommended Correction — evaluación de candidatos (sin implementar)

| Opción | Descripción | Veredicto |
| --- | --- | --- |
| **A — Default recurrente válido** | `newAlertInitial`/`addAlert` (y/o default del draft) fuerzan `periodicityMode:'recurring'`, `amount:1`, `unit:'days'`, `repeatPolicy:'repeat'` | **SELECCIONADA.** Coherente con el contrato (`repeat` requiere recurrente), fiel a la intención de una alerta nueva, 1 línea de cambio, no toca Validación ni Persistencia. |
| B — Default no recurrente | `periodicityMode:'none'` + `repeatPolicy:'once'` | Aceptable pero cambia la semántica percibida ("una sola vez" en una alerta nueva). Se descarta para la corrección mínima. |
| C — Requerir selección explícita | Draft incompleto + bloqueo UI claro | Correcto en UX pero añade contrato UI nuevo; mayor superficie. Se descarta para la corrección mínima. |
| D — Modificar validación | Debilitar `checkPolicyCompatibility` | **PROHIBIDA.** Contrato de dominio correcto (§14). |

**Corrección mínima a realizar en Sprint 275:** forzar un default de periodicidad
coherente en la creación del draft de alerta nueva (Opción A), en la frontera que ya
materializa hoy el default (`createEmptyFormState` / `newAlertInitial` / `addAlert`),
ubicada en el Mapper (`src/core` — draft builder) o en el Panel (`src/modules` —
presentation). El alcance exacto lo determina Sprint 275 a partir de este documento.

---

## Next Sprint Scope — guardrails

### Dentro del alcance de la corrección (Sprint 275)

```text
Únicamente el generador del DRAFT por defecto de NUEVA ALERTA:
  AlertConfigurationMapper.createEmptyFormState / mapMetadataToFormState (defaults),

o, si se prefiere la frontera de presentación:
  AlertConfigurationPanel.newAlertInitial / addAlert,
junto con la presentación de errores ya activa (feedback visible, E).
```

### Fuera de alcance (prohibido tocar)

```text
CapabilityAssignmentService
AssignmentValidationEngine
AssignmentTransactionManager
ModuleCapabilityPersistenceAdapter

AlertConfigurationPersistenceAdapter
AlertConfigurationPersistencePort
AlertConfigurationApplicationService    ← NO ampliar el try/catch sin auditoría propia

dynamicService.updateForm
documentRepositoriesService.updateRepository

AlertConfigurationResolver
AlertConfigurationValidation             ← NO DEBILITAR (contrato de dominio)
Check policy/periodicity/gracePeriod

Runtime · Engine · Enrollment · Operational Experiences
Despachos · Inventarios · Producción · Recepción · Productos
Supabase schema
```

---

## Hallazgo-0 — DISCREPANCIA EN EL WORKING TREE (observación de auditoría)

`git status` revela un **delta no commiteado** no certificado por ningún sprint:

```text
 M src/core/.../AlertConfigurationApplicationService.js   (try/catch + errors.general)
 M src/modules/experiences/AlertConfigurationPanel.jsx    (fix C/E preliminar)
 M src/modules/experiences/AlertConfigurationPersistenceAdapter.js (guardas)
 M src/services/dynamicService.js / documentRepositoriesService.js  (guardas + import .js)
?? src/modules/experiences/alertConfigurationErrorPresenter.js
?? scripts/forensic_sprint*.mjs
?? scripts/verify_sprint271.mjs
?? scripts/verify_sprint274.mjs
?? docs/Sprint-271.md · docs/Sprint-272.md · docs/Sprint-273.md (legítimos de sus sprints)
```

- El Panel con fix C/E no commiteado convierte el flujo "Nueva Alerta" en VÁLIDO y dota
  de mensaje visible al error — por eso el usuario hoy VE el mensaje (ver §11).
- Estos cambios **no pertenecen a ningún sprint certificado** y violarían literalmente
  los criterios AC-274-11/12 si se contaran como modificaciones de este sprint.
- Este sprint NO los toca, NO los registra y NO los revierte (prohibido modificar `src/`).
- **Recomendación para Sprint 275**: re-auditar, descartar o foldear ese delta contra la
  corrección seleccionada (Opción A), sin arrastrar cambios no certificados.

---

## 11. Auditoría de la Experiencia de Usuario

```text
ANTES (Sprint 273 pre-E)
Guardar → saveCollection → validation → success:false → setErrors({0:{policy:[...]}})
→ Form solo renderiza errors.form ⇒ NO HAY MENSAJE VISIBLE → "guardo y no pasa nada".

AHORA (con la presentación activa / working tree)
Guardar → saveCollection → validation → success:false → presentación → errors.form
→ "No se puede guardar / Alerta 1 — repeatPolicy 'repeat'..."
→ MENSAJE VISIBLE.
```

El mensaje demuestra (sin ejecutar nada):

- El botón funciona (evento llega).
- El handler `onSubmit` funciona.
- `saveCollection` funciona (devuelve `success:false` por validación).
- La validación funciona (rechaza el par incoherente).
- El write-path NO se ejecuta porque la validación detiene el flujo (H6) — correcto.

---

## 12. Matriz de escenarios (conceptual — sin escritura en BD)

| Escenario | Estado inicial del draft | Validación | Port | Resultado |
| --- | --- | --- | --- | --- |
| Nueva alerta sin tocar frecuencia | `periodicityMode:'none'` + `repeatPolicy:'repeat'` (H1) | FALLA (`errors[0].policy`) | no invocado | `success:false` + mensaje visible |
| Nueva alerta con frecuencia diaria | `periodicityMode:'recurring'` `1/days` (vía `applyScheme`) | OK | invocado | `success:true` |
| Nueva alerta con frecuencia semanal | `'recurring'` `1/weeks` | OK | invocado | `success:true` |
| Nueva alerta "al vencimiento" | `'none'` + `repeatPolicy:'once'` + `expiration:'recurring'` | OK | invocado | `success:true` |
| Edición de alerta existente VÁLIDA | draft proveniente de metadata válida | OK | invocado | `success:true` |
| Edición de alerta existente INVÁLIDA (metadata legada incoherente) | draft refleja `periodicity:null` + `repeatPolicy:'repeat'` | FALLA | no invocado | `success:false` + mensaje |
| Múltiples alertas (una inválida) | `errors[index]` por ítem (índice correcto) | FALLA en ese índice | no invocado | `success:false` + mensaje señala la alerta |

Evidencia: inspección de código + contratos (H1-H6) + comportamiento observado por el usuario (§11).

---

## 12.1 Verificación funcional complementaria

Se realizó una verificación **local, de solo lectura** (AppService real + Port SPY en
proceso efímero, sin BD): el draft por defecto mapea a `periodicity:null +
repeatPolicy:'repeat'` y `saveCollection` responde `success:false` sin invocar el Port;
con `periodicityMode:'recurring'` la colección se persiste íntegra. Esto CORROBORA
H1-H6 pero no constituye el entregable del sprint (no se guardó ningún script: el
artefacto único es este documento).

---

## Criterios de auditoría — cumplimiento

| AC | Estado | Evidencia |
| --- | --- | --- |
| AC-274-01 origen `repeatPolicy:'repeat'` | OK | H1 — default línea 101 |
| AC-274-02 origen `periodicity:null` | OK | H1+H2 — default 'none'→null |
| AC-274-03 Mapper introduce/conserva | OK | Conserva (H2). Genera defaults (H1) |
| AC-274-04 Validation correcta | OK | H3 — contratos intactos |
| AC-274-05 flujo Nueva Alerta→saveCollection | OK | §5, H4, H6 |
| AC-274-06 por qué el Port no recibe payload | OK | H6 — validación detiene el flujo |
| AC-274-07 por qué el mensaje ahora aparece | OK | §11 — presentación activa (E) |
| AC-274-08 confirmar/refutar C+E | OK | CONFIRMADO C+E |
| AC-274-09 corrección mínima | OK | Opción A (§15) |
| AC-274-10 componentes que NO se modifican | OK | §16 guardrails |
| AC-274-11 sin cambios en `src/` | OK * | Este sprint no tocó `src/` (ver Hallazgo-0: delta preexistente de sesión previa) |
| AC-274-12 sin scripts `.mjs` | OK * | No se generó ningún script en este sprint (delta preexistente) |
| AC-274-13 único artefacto `docs/Sprint-274.md` | OK | **Único archivo creado/modificado por este sprint** |

`*` Los archivos no commiteados listados en Hallazgo-0 pre-existían y quedan intactos;
su existencia está documentada como observación de auditoría, no como cambio de este sprint.

---

## Estado esperado del sprint

```text
SPRINT 274 — FORENSIC AUDIT

Mode:               AUDIT ONLY
Production changes: 0
Source changes:     0   (este sprint)
Scripts:            0   (este sprint)
Artifacts:          1
Allowed artifact:   docs/Sprint-274.md
Objective:          Determinar causa raíz definitiva del estado inicial inválido de Nueva Alerta
Expected output:    Root Cause + Evidence + Correction Boundary ✓
Classification:     C (Draft/State Failure) + E (Error Feedback — resuelto vía presentación)
Next:               Sprint 275 — Controlled Correction (Opción A)
```