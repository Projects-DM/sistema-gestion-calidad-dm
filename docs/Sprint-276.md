# Sprint 276 — Auditoría Forense de Regresión: Estado Real de Nueva Alerta vs. Corrección Sprint 275

**Branch:** `release/stable-sprint79`
**Modo:** AUDIT ONLY — FORENSIC DISCREPANCY AUDIT · LEVEL 5
**SSOT:** este documento (`docs/Sprint-276.md`)
**Dependencias:** Sprint 270 · 271 · 272 · 273 · 274 · 275
**Artefacto:** ÚNICAMENTE `docs/Sprint-276.md`
**Producción:** 0 cambios · **Scripts:** 0 (evidencia por `node --eval` de un solo uso, sin archivo, y trazabilidad estática)

---

## AUDIT RESULT

```text
¿Por qué continúa el error después de Sprint 275?
===================================================

Sprint 275 corrigió CORRECTAMENTE createEmptyFormState() (el DRAFT de edición de la
nueva alerta es VÁLIDO — demostrado).

PERO existe UNA SEGUNDA FUENTE de estado inicial que Sprint 275 NO tocó:

  DEFAULT_ALERT_CONFIGURATION.periodicity = null   (DefaultAlertConfigurationProvider)
  DEFAULT_ALERT_CONFIGURATION.repeatPolicy = 'repeat'

  resolveResourceAlertCollection() fabrica UN item "fantasma" cuando el recurso está
  sin configurar → normalizeAlertConfiguration(null) mergea ese DEFAULT inválido
  ↓
  loadCollection() entrega formStates[0] = { periodicityMode:'none', repeatPolicy:'repeat' }
  ↓
  El Panel lo carga como "Alerta 1" (buildInitial) y, al guardar, lo RE-ENVÍA dentro de
  la colección completa formStates → mapFormStateToMetadata → periodicity:null →
  validateAlertConfiguration → REJECT en el índice 0 → "Alerta 1 — repeatPolicy ...".

Sprint 275 = PARTIALLY EFFECTIVE: corrige el draft de edición, pero NO la fuente del
item de colección que llega a Validation.
```

## 1. Pregunta central (respuesta inequívoca)

> ¿Por qué el estado que llega a `validateAlertConfiguration()` continúa siendo
> incompatible después del Sprint 275?

Porque **el estado que llega a Validation NO es el draft de Sprint 275** (que es válido),
sino la **colección completa reconstruida por el Panel en `onSubmit`**, que incluye un
ítem fantasma **inválido** que el Resolver fabricó en **carga** para el recurso sin
configurar, usando el default SSOT `DEFAULT_ALERT_CONFIGURATION`:

```js
// DefaultAlertConfigurationProvider.js (SSOT, Sprint 197)
export const DEFAULT_ALERT_CONFIGURATION = Object.freeze({
  enabled: true,
  periodicity: null,      // ← NULL
  // ...
  repeatPolicy: 'repeat', // ← 'repeat'
});
```

El par `periodicity:null + repeatPolicy:'repeat'` que Sprint 274 diagnosticó sigue
existiendo **en el default del Resolver/Normalizer**, aunque ya no existe en el draft
de edición (`createEmptyFormState`).

## 2. Cadena obligatoria — resultado por frontera (matriz de diagnóstico)

| Frontera | Esperado (diseño) | Real (evidencia) | Estado |
| --- | --- | --- | --- |
| `createEmptyFormState()` | `recurring/1/days/repeat` | `recurring/1/days/repeat` ✓ | **PASS** (Sprint 275 efectivo aquí) |
| `newAlertInitial()` | conserva default | `{...createEmptyFormState(), name, desc, fechas, enabled, autoClose}` — sin override | **PASS** |
| `addAlert()` | conserva default | ídem — consumidor puro | **PASS** |
| **`DEFAULT_ALERT_CONFIGURATION`** | — | **`periodicity:null` + `repeatPolicy:'repeat'`** | **FAIL (segunda fuente no corregida)** |
| `resolveResourceAlertCollection()` | nunca-configurado → colección armónica | fabrica `[null]` → normaliza sobre el default inválido | **FAIL / NOT REACHABLE a un estado válido** |
| `loadCollection()` → `formStates` | draft(s) válidos | `formStates[0] = {periodicityMode:'none', repeatPolicy:'repeat'}` | **FAIL** |
| Panel `buildInitial()` | — | construye "Alerta 1" desde `load.formStates` (fantasma) | **PASS (transporte fiel)** |
| Panel `onSubmit` (nueva alerta) | incluye solo la alerta nueva | reconstruye `rows = [...alerts, next]` → incluye fantasma | **PASS (transporte fiel — es el DETECTOR de transporte)** |
| Form | no modifica estado si no toca frecuencia | no modifica (handlers solo ante interacción) | **PASS** |
| `mapFormStateToMetadata()` | none→null, recurring→{1,days} | transformación fiel | **PASS (autorrefuerzo)** |
| `AlertConfigurationApplicationService.saveCollection()` | valida | `errors = { 0: { policy: [...] } }` | **PASS (detector correcto)** |
| `checkPolicyCompatibility()` | rechaza repeat sin periodicidad | rechaza (evidencia) | **PASS (contrato intacto)** |
| Port | solo tras PASS | NO invocado (`calls=0`) | **PASS (correcto)** |
| Persistencia / runtime | — | no alcanzada (validación la detiene) | **NOT REACHABLE** |

**Primer punto de divergencia (exacto):**
`DefaultAlertConfigurationProvider.DEFAULT_ALERT_CONFIGURATION.periodicity === null`
combinado con `resolveResourceAlertCollection` (línea 100-102) que fuerza una colección
de un elemento para recursos no configurados. Ese estado inválido SÍ lo transporta
`loadCollection` → Panel → `onSubmit` → `saveCollection` → Validation.

## 3. Reproducción de la evidencia (corroboración de solo lectura)

Ejecución `node --eval` (sin archivos, lectura pura, Port SPY):

```text
load.formStates[0]: {"p":"none","r":"repeat","name":""}
DEFAULT: {"p":null,"r":"repeat","enabled":true}
envelope source: metadata | items: 1 | item0.periodicity: null | item0.repeat: repeat
draft (Sprint 275) válido: true
formStates enviados a saveCollection:
  [ {p:"none", r:"repeat"}, {p:"recurring", r:"repeat", name:"Nueva alerta"} ]
saveCollection.success: false
errors: {"0":{"policy":["repeatPolicy 'repeat' requiere una periodicity recurrente..."]}}
UI (buildVisibleErrors): form = ["Alerta 1 — repeatPolicy 'repeat' requiere ..."]
port.calls: 0  (validación detiene el flujo — correcto)
```

El mensaje de UI generado es **idéntico** al reportado por el usuario.

## 4. Hipótesis — veredicto

| Hipótesis | Veredicto | Evidencia |
| --- | --- | --- |
| "El Mapper está arreglado, entonces funciona" | **DESCARTADA** | El draft sí es válido, pero Validation recibe otra fuente (fantasma de colección). |
| "¡Sprint 275 solo tocó el draft; no la colección!" | **CONFIRMADA** | Cambio de 275 = solo `createEmptyFormState()`. |
| "La Validation está fallando" | **DESCARTADA** | Validation rechaza un objeto que incumple su propio contrato. |
| "Supabase no guarda" | **DESCARTADA** | Port nunca invocado (validación detiene; `calls=0`). Con colección válida, `saveConfiguration` se invoca (verificado 275.3). |
| "El botón está roto" | **DESCARTADA** | El evento llega y produce `errors[0]` → message visible. |
| "Hay que cambiar nuevamente la Validation" | **DESCARTADA** (prohibida) | Contrato de dominio correcto. |
| "Hay que poner un default en varios sitios" | **DESCARTADA** | Violaría ONE SOURCE OF TRUTH; la fuente única a corregir es el default del Resolver. |
| F — Build/Deployment desactualizado | **DESCARTADA como causa primaria** | `dist/` contiene el fix de 275 (`p9()` minificado con `periodicityMode:'recurring'`). Aún con el fix presente, el error se reproduce por la segunda fuente. |

## 5. Clasificación de causa raíz

```text
A — Source State Failure  (CONFIRMADA)

Existe UNA SEGUNDA FUENTE de estado inicial de alerta:
  DefaultAlertConfigurationProvider.DEFAULT_ALERT_CONFIGURATION  →  periodicity:null
  consumida por Normalizer → Resolver (resolveResourceAlertCollection [null]) →
  loadCollection → Panel → saveCollection → Validation.

NO es B (no hay override del draft).
NO es C/D (Form/mapper transportan fielmente).
NO es E (Validation es detector correcto).
NO es F (build contiene el fix; aún así falla).
NO es G (una sola causa independiente demostrada).
```

## 6. ¿Dos generadores de estado inicial? (H2)

SÍ — y esto es el corazón del hallazgo:

```text
FUENTE #1 (draft de edición) — Sprint 275 OK:
  createEmptyFormState() = { ...mapMetadataToFormState(null), recurring/1/days/repeat }

FUENTE #2 (alerta de colección / "Alerta 1") — Sprint 275 NO la tocó:
  DEFAULT_ALERT_CONFIGURATION (periodicity:null + repeat:'repeat')
  → resolveResourceAlertCollection() [null]
  → normalizeAlertConfiguration() merge sobre default
  → mapCollectionToFormStates() en loadCollection
  → formStates[0] inválido → Panel lo carga y lo reenvía al guardar
```

ONE SOURCE OF TRUTH del estado inicial de alerta NO se cumple: hay dos.

## 7. Decisión de frontera para corrección (Sprint 277 — NO implementado aquí)

La corrección mínima aguas arriba debe hacer que **el default canónico de periodicidad
sea un objeto recurrente válido**, en el ÚNICO punto de autoridad del default:

```text
DefaultAlertConfigurationProvider.DEFAULT_ALERT_CONFIGURATION.periodicity
    null  →  Object.freeze({ amount: 1, unit: 'days' })

(manteniendo repeatPolicy:'repeat')
```

Con eso:
- `normalizeAlertConfiguration(null)` → `periodicity:{1,days}` + `repeat:'repeat'` → VÁLIDO.
- `resolveResourceAlertCollection([null])` → item válido.
- `loadCollection` → `formStates[0] = {periodicityMode:'recurring', ...}` → Panel lo
  carga y reenvía VÁLIDO → `mapFormStateToMetadata` → `{1,days}` → Validation PASS.

Alternativa equivalente de menor alcance: que `resolveResourceAlertCollection` NO fabrique
el ítem fantasma para recursos sin configurar (colección vacía, alineado con AC-14 /
DEC-261-01: "Never-configured resources resolve to an EMPTY collection" — hoy el
Resolver viola eso con `[null]`). Ambas son candidatas; Sprint 277 debe elegir y consolidar
**UN único punto de autoridad** (sin distribuir `periodicityMode/Amount/Unit/repeatPolicy`
entre capas).

## 8. Resultado esperado del sprint

```text
SPRINT 276 — FORENSIC DISCREPANCY AUDIT

Mode:
    AUDIT ONLY

Production changes:
    0

Source changes:
    0

Scripts:
    0

Artifacts:
    1

Allowed artifact:
    docs/Sprint-276.md

Primary question:
    ¿Por qué continúa fallando la validación después de Sprint 275?

First divergence:
    DefaultAlertConfigurationProvider.DEFAULT_ALERT_CONFIGURATION.periodicity === null
    (+ resolveResourceAlertCollection que materializa un item fantasma para recursos
       sin configurar)

Root Cause:
    A — Source State Failure (SEGUNDA FUENTE de estado inicial no corregida por 275)

Evidence:
    - DEFAULT_ALERT_CONFIGURATION = { periodicity:null, repeatPolicy:'repeat' }
    - loadCollection → formStates[0] = {periodicityMode:'none', repeatPolicy:'repeat'}
    - onSubmit reenvía la colección completa; errors = {0:{policy:[...]}}
    - UI = "Alerta 1 — repeatPolicy 'repeat' requiere ..." (idéntico al reportado)
    - draft (275) válido; port.calls = 0 (validación detiene antes del Port)

Sprint 275 status:
    PARTIALLY EFFECTIVE (draft de edición válido; fuente de colección intacta)

Correction boundary:
    DefaultAlertConfigurationProvider.DEFAULT_ALERT_CONFIGURATION.periodicity → {1,'days'}
    y/o resolveResourceAlertCollection: colección vacía para recursos no configurados.

Next:
    Sprint 277 — Controlled Correction
```

---

## Criterios de aceptación

| ID | Criterio | Estado |
| --- | --- | --- |
| AC-276-01 | Estado real de Sprint 275 inspeccionado | ☑ |
| AC-276-02 | `createEmptyFormState()` verificado | ☑ válido |
| AC-276-03 | `newAlertInitial()` verificado | ☑ consumidor puro |
| AC-276-04 | `addAlert()` verificado | ☑ consumidor puro |
| AC-276-05 | Estado del Form auditado | ☑ no modifica si no se toca frecuencia |
| AC-276-06 | `onSubmit()` auditado | ☑ reenvía colección completa |
| AC-276-07 | `formStates` verificados | ☑ incluyen fantasma inválido |
| AC-276-08 | `mapFormStateToMetadata()` auditado | ☑ transformación fiel |
| AC-276-09 | Objeto recibido por Validation | ☑ `{0:{policy}}` (índice 0) |
| AC-276-10 | Validation auditada sin modificar | ☑ detector correcto |
| AC-276-11 | Working tree auditado | ☑ |
| AC-276-12 | Git/HEAD auditado | ☑ Sprint 275 NO está en HEAD (commit inexistente) |
| AC-276-13 | Discrepancia build/deploy evaluada | ☑ descartada como causa primaria (dist contiene fix) |
| AC-276-14 | Primer punto de divergencia | ☑ Default del Resolver |
| AC-276-15 | Hipótesis reducidas | ☑ |
| AC-276-16 | Root Cause determinada | ☑ A |
| AC-276-17 | Frontera de corrección definida | ☑ |
| AC-276-18 | No se modificó `src/` | ☑ |
| AC-276-19 | No se creó `.mjs` | ☑ |
| AC-276-20 | Único artefacto = `docs/Sprint-276.md` | ☑ |