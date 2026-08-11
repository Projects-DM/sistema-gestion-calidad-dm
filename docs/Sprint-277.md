# Sprint 277 — Controlled Correction: Canonical Alert Configuration Default

**Branch:** `release/stable-sprint79`
**Modo:** CONTROLLED CORRECTION · LEVEL 5
**SSOT:** `docs/Sprint-277.md`
**Dependencias:** Sprint 270 · 271 · 272 · 273 · 274 · 275 · 276
**Estado esperado:** IMPLEMENTED → VERIFIED → **CERTIFIED**

---

## 1. Mandato cumplido

Corrección de la **SEGUNDA FUENTE** de estado inicial incompatible, identificada por Sprint 276:

```text
FUENTE #1 — CORREGIDA EN SPRINT 275        FUENTE #2 — CORREGIDA EN SPRINT 277
createEmptyFormState()                      DEFAULT_ALERT_CONFIGURATION
    ↓                                           ↓
periodicityMode:'recurring'                 periodicity:null   ← ELIMINADO
periodicityAmount:1                         periodicity:{amount:1, unit:'days'} ← ESTABLECIDO
periodicityUnit:'days'                      repeatPolicy:'repeat'   ← CONSERVADO
repeatPolicy:'repeat'
```

Ambos caminos producen ahora **el mismo contrato canónico válido**.

---

## 2. Cambio productivo aplicado

### 2.1 Archivo autorizado (único cambio de este sprint)

```text
src/core/capabilities/alert/operational-configuration/DefaultAlertConfigurationProvider.js
```

### 2.2 Diff exacto

```diff
 export const DEFAULT_ALERT_CONFIGURATION = Object.freeze({
   enabled: true,
-  periodicity: null,
+  periodicity: Object.freeze({
+    amount: 1,
+    unit: 'days',
+  }),
   expiration: 'none',
```

- Reutilizada la estructura de inmutabilidad ya existente del archivo (`Object.freeze`).
- `repeatPolicy: 'repeat'` **NO se tocó**.
- No se agregaron claves form-state al Provider: sigue operando con el modelo canónico `{ amount, unit }` (regla ONE SOURCE OF TRUTH, AC-277-05).

---

## 3. Verificación funcional — 13/13 PASS

Verificación ejecutada por **stdin `node --input-type=module`** (sin crear `.mjs`, sin archivos de diagnóstico agregados al repositorio, conforme a §14).

| ID | Prueba | Resultado | Detalle |
| -- | ------ | --------- | ------- |
| 277.1 | DEFAULT `periodicity` | **PASS** | `{"amount":1,"unit":"days"}` |
| 277.2 | DEFAULT `repeatPolicy` | **PASS** | `'repeat'` |
| 277.3 | `normalizeAlertConfiguration(default)` | **PASS** | `periodicity={1,days}` · `repeatPolicy='repeat'` (objeto congelado) |
| 277.4 | `loadCollection()` recurso nunca configurado | **PASS** | `recurring` / 1 / `days` / `repeat` |
| 277.5 | `validateAlertConfiguration(default)` | **PASS** | `valid === true` · `errors = {}` |
| 277.6 | `saveCollection(default)` | **PASS** | `success:true` · `errors:null` |
| 277.7 | Port invocado + envelope de colección | **PASS** | `calls=1` · `metadata.length=1` |
| 277.8 | Usuario cambia `daily → weekly` | **PASS** | se persiste `{amount:1, unit:'weeks'}` (default NO obliga) |
| 277.9 | Edición existente sin regresión | **PASS** | alerta `{amount:2, unit:'months'}` + `repeat` conservada |
| 277.8-bis | Esquema al vencimiento | **PASS** | `once` + `expiration:'recurring'` + `repeatPolicy:'once'` válido |
| 277.10 | Estado inválido forzado | **PASS** | `valid:false` · mismo error exacto |
| 277.11 | Colección multi-alerta (2 alertas) | **PASS** | `metadata.length=2` · `success:true` |
| 277.12 | Identidad `resource.id` | **PASS** | `resolveResourceAlertCollection({id})` → `resourceId='form-uuid-009'` |

### 3.1 Mensaje de error conservado (AC-277-22)

El estado forzado `periodicity:null` + `repeatPolicy:'repeat'` CONTINÚA rechazándose con:

```text
repeatPolicy 'repeat' requiere una periodicity recurrente ({ amount, unit }).
```

**Certifica que la validación no fue debilitada ni se aceptó `repeat + null`.**

### 3.2 Write-path completo re-alcanzado (criterio de certificación §19)

```text
Nueva alerta default (sin tocar frecuencia)
    → loadCollection → formState válido
    → saveConfiguration(single)  → success:true · calls=1
    → mapFormStateToMetadata     → periodicity={1,days} · repeat='repeat'
    → validateAlertConfiguration → valid:true
    → Port.saveConfiguration     → 1 llamada (write-path S271 certificado)
```

No basta con que el mensaje desaparezca: el flujo vuelve a llegar al Port. Verificado.

---

## 4. Confinamiento — reglas respetadas

| Regla | Estado |
| ----- | ------ |
| Modificar `AlertConfigurationValidation.js` | **NO** — intacto |
| Aceptar `repeat + null` | **NO** — sigue rechazado |
| Modificar `AlertConfigurationApplicationService.js` | **NO** (delta previo ajeno al sprint) |
| Modificar `AlertConfigurationPersistenceAdapter.js` | **NO** (delta previo ajeno) |
| Modificar `AlertConfigurationPersistencePort.js` | **NO** |
| Modificar `dynamicService` / `documentRepositoriesService` | **NO** (deltas previos ajenos) |
| Modificar `AlertConfigurationResolver.js` | **NO** — Alternativa A sin reapertura (¥7) |
| Modificar `AlertConfigurationPanel.jsx` / `AlertConfigurationForm.jsx` | **NO** (delta previo en Panel, ajeno) |
| Modificar `createEmptyFormState` | **NO** (Sprint 275 ya lo corrigió) |
| Modificar Runtime / Enrollment / Capabilities / esquema Supabase | **NO** |
| Crear servicios / nuevos defaults distribuidos | **NO** |
| Crear archivos `.mjs` | **NO** |

---

## 5. Git Boundary

```text
Antes del sprint:  git status  → HEAD = 623f197 fix: recover capability persistence and assignment path
                   deltas previos sin commitear (Hallazgo-0 documentado en Sprint 274):
                     AlertConfigurationApplicationService.js
                     AlertConfigurationMapper.js          (fix Sprint 275)
                     AlertConfigurationPanel.jsx          (fix C/E Sprint 274)
                     AlertConfigurationPersistenceAdapter.js
                     dynamicService.js
                     documentRepositoriesService.js
                     alertConfigurationErrorPresenter.js  (untracked)

Después del sprint: el ÚNICO cambio productivo atribuible a Sprint 277 es:
                     src/core/capabilities/alert/operational-configuration/DefaultAlertConfigurationProvider.js
```

Los deltas previos se mantienen separados y NO se incorporaron silenciosamente a este sprint (§16). No aparecen nuevos `.mjs`. El único artefacto documental del sprint es `docs/Sprint-277.md`.

---

## 6. Invariante de dominio demostrada

```text
repeatPolicy === 'repeat'  ⇒  periodicity !== null ∧ periodicity recurrente válida
```

- `{ amount:1, unit:'days' }` → **ACEPTADO** (277.5).
- `{ periodicity:null, repeatPolicy:'repeat' }` → **RECHAZADO** (277.10).

La validación de dominio permanece exactamente igual; lo que cambió es el **estado de entrada canónico**.

---

## 7. Acceptance Criteria — 24/24 PASS

| ID | Criterio | Estado |
| -- | -------- | ------ |
| AC-277-01 | Default Provider identificado | **PASS** |
| AC-277-02 | `periodicity:null` eliminado del default canónico | **PASS** |
| AC-277-03 | `periodicity:{1,days}` establecido | **PASS** |
| AC-277-04 | `repeatPolicy:'repeat'` conservado | **PASS** |
| AC-277-05 | ONE SOURCE OF TRUTH respetado | **PASS** |
| AC-277-06 | `normalizeAlertConfiguration()` produce estado válido | **PASS** |
| AC-277-07 | `loadCollection()` produce form state válido | **PASS** |
| AC-277-08 | Nueva alerta sin tocar frecuencia valida | **PASS** |
| AC-277-09 | `saveCollection()` alcanza Port | **PASS** |
| AC-277-10 | Persistencia recibe envelope correcto | **PASS** |
| AC-277-11 | Cambio manual de frecuencia se conserva | **PASS** |
| AC-277-12 | Edición existente funciona | **PASS** |
| AC-277-13 | Estado inválido sigue siendo rechazado | **PASS** |
| AC-277-14 | Validation no modificada | **PASS** |
| AC-277-15 | Persistence no modificada | **PASS** |
| AC-277-16 | Resolver no reabierto | **PASS** |
| AC-277-17 | Runtime no modificado | **PASS** |
| AC-277-18 | Capabilities no modificadas | **PASS** |
| AC-277-19 | No se crean `.mjs` | **PASS** |
| AC-277-20 | Único cambio productivo = Provider | **PASS** |
| AC-277-21 | Error anterior desaparece en flujo normal | **PASS** (mismo estado ya válido) |
| AC-277-22 | Error continúa presente para estado inválido forzado | **PASS** |
| AC-277-23 | Build estable | **PASS** (2.54s, solo warning preexistente de chunk) |
| AC-277-24 | Git boundary verificado | **PASS** |

---

## 8. Estado final

```text
SPRINT 277 — CONTROLLED CORRECTION · LEVEL 5
    Scope:            CANONICAL ALERT DEFAULT ONLY
    Primary Change:   DEFAULT_ALERT_CONFIGURATION.periodicity
                      null → { amount: 1, unit: 'days' }
    Production:       1 archivo (DefaultAlertConfigurationProvider.js)
    Scripts:          0
    Documentation:    docs/Sprint-277.md
    Validation:       INTACTA
    Persistence:      INTACTA
    Application Service: INTACTO
    Resolver:         INTACTO
    Panel:            INTACTO
    Form:             INTACTO
    Runtime:          INTACTO
    Capabilities:     INTACTAS
    Build:            ESTABLE
    Certificación:    **CERTIFIED**
```