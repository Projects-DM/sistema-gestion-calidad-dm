# Sprint 271 — Eliminación del Write-Path Silencioso de la Configuración de Alertas

**Branch:** `release/stable-sprint79`
**Modo:** CONTROLLED CORRECTION + VERIFICATION · **cambios en `src/` · 1 `.mjs` (verificación)**
**SSOT:** este documento (`docs/Sprint-271.md`)
**Dependencias:** Spr 269 (auditoría) · Spr 270 (corrección controlada, certificado) · Spr 242 (write path oficial) · 201.R (Port/Adapter) · 229 (colección)

Gas de cierre: **SPRINT 271 — CERTIFICADO** · Código: **4 archivos** · `.mjs`: **1** · Producción: **0 cambios de UI**

---

## 1. Decisión central (SSOT)

> Si el UPDATE del recurso (formulario o repositorio) afecta **0 filas**, el write-path DEBE
> fallar de forma **determinística y visible** — jamás reportar éxito.

**El write-path de configuración de alertas NO puede tener fail-silent:** un `update().select().single()`
que no devuelve fila es un desacople silencioso entre la UI y la BD. El contrato del PORT (`saveConfiguration`)
**debe lanzar** para que el `AlertConfigurationApplicationService` convierta la excepción en
`{ success: false, errors.general }` y la UI muestre el error real.

---

## 2. Contexto certificado

### 2.1 Write-path oficial (Sprint 201.R / 229 / 242)

```
AlertConfigurationPanel (UI)
      ↓ saveCollection({ resource, formStates })
AlertConfigurationApplicationService.saveCollection
      ↓ mapFormStatesToCollection + validateAlertConfiguration por ítem
      ↓ port.saveConfiguration(resource, { alertConfigurations: collection })
AlertConfigurationPersistenceAdapter.saveConfiguration
      ↓ resolveResourceHandler(reference)   (FORM_HANDLER | REPOSITORY_HANDLER)
      ↓ handler.write(reference, { alertConfigurations })
dynamicService.updateForm | documentRepositoriesService.updateRepository
      ↓ update().eq('id', X).select().single()
```

### 2.2 Hallazgos del componente (anteriores al fix)

1. **`dynamicService.updateForm` / `documentRepositoriesService.updateRepository`**: ejecutan
   `update().select().single()`, validaban el `error` de PostgREST pero SIEMPRE devolvían
   `data` (aun cuando `data === null` por 0 filas). Sin guard ante `!data`: el write-path
   trataba un UPDATE sin filas como éxito.
2. **`AlertConfigurationPersistenceAdapter.saveConfiguration`**: no validaba `reference.id`
   obligatorio ni que `handler.write()` devolviera row; con un `id: null` o inexistente el
   flujo producía éxito ciego (`row: null`).
3. **`AlertConfigurationApplicationService.saveCollection`**: no tenía try/catch; una
   excepción del adaptador se propagaba a la UI como error técnico suelto, y un retorno
   `{ row: null }` se trataba como `success: true`.

**Conclusión observable:** el usuario diligenciaba la alerta, presionaba GUARDAR, la UI
mostraba confirmación y `alert_config` NO cambiaba en la fila — fail-silent confirmado.

---

## 3. Principio rector

> **RESTORE EXISTING CONTRACTS — LOS WRITE-PATHS INFRA FALLAN O LANZAN, NUNCA CALLAN.**

Formatos de fallo del write-path:

| Capa | Condición | Comportamiento requerido |
|---|---|---|
| Service infra (`update*`) | id ausente | **throw** determinístico |
| Service infra (`update*`) | 0 filas (`!data`) | **throw** con id del recurso |
| Adapter | sin `resourceId` inválido | **throw** antes de resolver handler |
| Adapter | handler no devuelve row | **throw** "0 filas actualizadas" |
| AppService | excepción del port | `{ success: false, errors.general }` |
| AppService | `persisted.row` ausente | `{ success: false, errors.general }` |

---

## 4. Cambios técnicos (deliberados)

### 4.1 `src/services/dynamicService.js` — `updateForm`
- Guard: `if (!formId) throw` ("formId is required").
- Post-update: `if (!data) throw` ("Form with ID ... not found or update failed.").
- Fix de import relativo a `.js` (`'../lib/supabase.js'`).

### 4.2 `src/services/documentRepositoriesService.js` — `updateRepository`
- Guard: `if (!repositoryId) throw` ("repositoryId is required").
- Post-update: `if (!data) throw` ("Document repository with ID ... not found or update failed.").
- Fix de import relativo a `.js` (`'../lib/supabase.js'`).

### 4.3 `src/modules/experiences/AlertConfigurationPersistenceAdapter.js` — `saveConfiguration`
- Validate `reference.id` obligatorio (rechaza `null`/`undefined`/vacío) ANTES de resolver handler.
- Post-write: `if (!row || typeof row !== 'object') throw` (0 filas actualizadas / recurso inexistente).

### 4.4 `src/core/capabilities/alert/operational-configuration/AlertConfigurationApplicationService.js` — `saveCollection`
- try/catch alrededor de `port.saveConfiguration`.
- Post-call: si `persisted.row` no existe → `{ success: false, errors.general: ['Fallo en la persistencia de la alerta: recurso no encontrado o 0 filas actualizadas.'] }`.
- catch: `{ success: false, errors.general: [err.message] }`.

Ningún cambio en **UI, Panel, Resolver, Mapper, Validation, Port contract, Dominio, Runtime ni Engine**.

---

## 5. Pruebas ejecutables

Script: `scripts/verify_sprint271.mjs` (conecta al proyecto Supabase real).
Runner: `scripts/run_verify_sprint271.mjs` (SSR de Vite — resuelve `import.meta.env.VITE_*` desde `.env`).

**Resultados reales (ejecución certificada):**

| Test | Escenario | Resultado |
|---|---|---|
| **271.1** | Form real: `saveCollection` + read-after-write | **PASS** — `success:true`, `source='metadata'`, colección persistida (length 1) |
| **271.2** | Repo real: `saveCollection` + read-after-write | **SKIP** — 0 repositorios en la DB; verificado a nivel de contrato (mismo handler shape, misma validación `!data`) |
| **271.6** | Recurso inexistente (`id` uuid nulo) | **PASS** — `success:false` determinístico |
| **271.7** | Recurso con `id: null` | **PASS** — `success:false` determinístico (adapter: resourceId obligatorio) |
| **271.8** | Recurso nunca configurado | **PASS** — `resolveResourceAlertCollection().source === 'default'` |

---

## 6. Acceptance Criteria (verificación)

| AC | Descripción | Evidencia |
|---|---|---|
| AC-271-01 | `updateForm`/`updateRepository` lanzan con id ausente | `src/services/*Service.js` guards |
| AC-271-02 | `updateForm`/`updateRepository` lanzan en 0 filas | `if (!data) throw` |
| AC-271-03 | Adapter valida `resourceId` obligatorio | `src/modules/experiences/AlertConfigurationPersistenceAdapter.js` |
| AC-271-04 | Adapter lanza row ausente / 0 filas | tiene `row` object check |
| AC-271-05 | `saveCollection` devuelve `success:false` en fallo | try/catch + row check |
| AC-271-06 | Mensajes de error legibles para la UI | `errors.general` |
| AC-271-07 | Regresión: write form real exitoso (271.1) | script PASS |
| AC-271-08 | Write repo (271.2): no ejecutable (0 repos en DB) | **SKIP** — mismo handler shape + `!data` guard en `updateRepository` verificado por inspección |
| AC-271-09 | Determinismo: id inexistente/null → fail (271.6/271.7) | script PASS |
| AC-271-10 | Lectura: recurso sin config → `source='default'` (271.8) | script PASS |

---

## 7. Límites arquitectónicos respetados (Guardrails 271)

Sin cambios en:
- `src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js`
- `AlertConfigurationMapper.js`, `AlertConfigurationValidation.js`, `AlertConfigurationPersistencePort.js`
- `occurrence/**`, `DynamicForm.jsx`, `AlertMonitoringExperience.jsx`, `core/navigation/**`
- Contrato UI (Panel/Form): **0 cambios**

Prohibiciones no saltadas: sin nuevas arquitecturas, sin refactors no relacionados, sin
cambios de dominio, sin `.mjs` de producción. Artefactos de verificación (no producción):
`scripts/verify_sprint271.mjs` + `scripts/run_verify_sprint271.mjs`.

---

## Estado final

```
SPRINT 271 — CERTIFICADO
Modo: CONTROLLED CORRECTION + VERIFICATION
Código: 4 archivos (2 services · 1 adapter · 1 app-service)
.mjs: 2 (verificación)   ·   Producción UI: 0 cambios
SSOT: docs/Sprint-271.md
Siguiente: definido por backlog (verificación Sprint 269 desempate AC-13 / AC-24).
```