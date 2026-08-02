# Sprint 201 — Alert Configuration Operational Experience (LEVEL 5)

- **Architecture Status:** LEVEL 5 — ALERT CAPABILITY · OPERATIONAL EXPERIENCE CERTIFIED
- **Type:** Primera experiencia administrativa (UI) de edición de la metadata `alertConfiguration` de un recurso
- **Impact:** Capa de aplicación + experiencia UI del Alert Capability (5 componentes nuevos + adaptadores de persistencia + inyección en admin)
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Resultado esperado:** El administrador edita la metadata `alertConfiguration` (9 parámetros) de formularios y repositorios documentales reutilizando integralmente la arquitectura certificada 196–200, sin tocar capas congeladas del Runtime/Engine/Consumption.

---

## 1. Objetivo

Cerrar la cadena de configuración: hasta Sprint 200 la metadata `alertConfiguration` se **leía** (Resolver) y **evaluaba** (Engine) pero no existía **experiencia administrativa** para editarla. Sprint 201 entrega la primera **operational experience**:

- Un panel + formulario dinámico para editar los **9 parámetros** de la metadata.
- Un **Application Service** que orquesta lectura (vía Resolver) + validación + persistencia.
- **Persistencia SOLO de metadata** (`alert_config` / `alertConfiguration`); jamás datos calculados.
- **Reutilización integral**: el Runtime, el Engine, las Estrategias/Políticas, el Dashboard, el Workspace y la Consumption Layer **no cambian**.

## 2. Contrato de la experiencia

```
Recurso (form / repository)
        ↓  AlertConfigurationResolver (SSOT, dueño de lectura, congelado)
Application Service: load → draft editable
        ↓  AlertConfigurationMapper (UI ↔ metadata)
AlertConfigurationForm (presentación pura, 9 parámetros)
        ↓  validación (AlertConfigurationValidation) ANTES de persistir
Application Service: save → metadata canónica
        ↓  puerto de persistencia (servicios existentes)
sgc_forms.alert_config / sgc_document_repositories.alert_config
```

Ningún componente de la experiencia interactúa con el Engine, con el Runtime Binding, con `useAlertRuntime` ni con la Consumption Layer.

## 3. Nuevos componentes

### Core (capa de aplicación, `operational-configuration/`)
- `AlertConfigurationApplicationService.js` — orquesta `load` (Resolver) → `validateForm` → `save` (validar → mapear → persistir vía puerto). No conoce tokens de storage, no calcula nada.
- `AlertConfigurationMapper.js` — transporte puro: `mapMetadataToFormState` / `mapFormStateToMetadata` / `createEmptyFormState`. Nunca valida ni ejecuta.
- `AlertConfigurationValidation.js` — validación de los 9 campos: periodos negativos/cero, prioridades inválidas, configuraciones incompletas, unidades inexistentes, riesgos con umbrales invertidos, notificación sin destinatarios, políticas incompatibles (`repeat` sin recurrencia, `once` con recurrencia, `once` + `repeat`). Valida **antes** de persistir.

### Experiencia (UI, `src/modules/experiences/`)
- `AlertConfigurationPanel.jsx` — contenedor: carga vía ApplicationService, renderiza el formulario, orquesta guardado. Nunca importa el Engine.
- `AlertConfigurationForm.jsx` — presentación pura de los 9 parámetros (enabled, priority, periodicity, expiration, risk, notification, gracePeriod, automaticClose, repeatPolicy).
- `alertConfigurationPersistence.js` — puertos de persistencia que reutilizan `dynamicService.updateForm` (forms) y `documentRepositoriesService.updateRepository` (repos).

### Inyección en administración
- `src/pages/Configuration.jsx` — botón 🔔 por fila de formulario → abre el panel.
- `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx` — botón 🔔 por repositorio → abre el panel en modal.
- `src/services/documentRepositoriesService.js` — `updateRepository` propaga `alert_config` cuando se entrega (passthrough, Sprint 201); la lectura de vuelta (`mapRepositoryRow`) sigue intacta desde Sprint 197.

## 4. Los 9 parámetros editables

| # | Parámetro | Storage | Tipo canónico |
|---|---|---|---|
| 1 | Enabled | `enabled` | boolean |
| 2 | Priority | `priority` | low · medium · high · critical |
| 3 | Periodicity | `periodicity` | null · `once` · `{ amount, unit }` |
| 4 | Expiration | `expiration` | none · recurring · fixed |
| 5 | Risk | `risk` | `{ model, thresholds: { yellow, red } }` |
| 6 | Notification | `notification` | null · `{ channel, recipients[] }` |
| 7 | Grace Period | `gracePeriod` | null · `{ amount, unit }` |
| 8 | Automatic Close | `automaticClose` | boolean |
| 9 | Repeat Policy | `repeatPolicy` | repeat · once |

La UI jamás edita ni muestra `severity`, `riskLevel`, `remaining`, `overdue`, `status`, `escalation` o `transition`: esos son estados **calculados** por el Engine, prohibidos en esta experiencia.

## 5. Restricciones respetadas

- **No se modificó** Runtime Binding, `useAlertRuntime`, `AlertEvaluationEngine`, Estrategias/Políticas, Dashboard, Workspace, Consumption Layer ni `AlertConfigurationResolver`.
- La UI jamás interactúa con el Engine; verificable por grep en los 4 archivos de experiencia.
- Reutiliza Metadata Factory / Operational Configuration / `AlertConfigurationMetadata` / `DefaultAlertConfigurationProvider`.
- El façade certificado (`operational-configuration/index.js` y `alert/index.js`) **no** exporta la experiencia: no hay acoplamiento de capas.

## 6. Certificación

Suite: `sprint-201-alert-configuration-operational-experience-certification.mjs` → **O1–O9 PASS** (build 2.40s PASS).

| Item | Estado |
|---|---|
| 5 componentes nuevos presentes | ✅ |
| `load` a través del Resolver (source metadata/default) | ✅ |
| Mapper round-trip completo de los 9 parámetros | ✅ |
| Validación de los 9 campos antes de persistir | ✅ |
| ApplicationService orquesta validar→mapear→persistir; SOLO metadata | ✅ |
| UI sin Engine / sin Runtime / sin temporal | ✅ |
| Capas congeladas intactas | ✅ |
| Persistencia vía servicios existentes; passthrough `alert_config` | ✅ |
| Façade congelado sin nuevas exportaciones | ✅ |

Regresiones PASS: Sprint 197 (P1–P13), 198 (I1–I13), 198.R2 (B1–B8), 199 (J1–J12), 199.R (K1–K10), 199.R2 (M1–M10), 199.R3 (N1–N8), 200 (C1–C14), 187 (N1–N8).

> Nota: las suites históricas 198.R3/R4/R5 asumen que la carpeta `evaluation/` **no existe** (expectativa pre-Sprint 199). Tras la creación del Engine (Sprint 199) son intencionalmente obsoletas y quedan excluidas del set de regresión; fallan igual sobre el árbol limpio.

## 7. Nota de evolución

La experiencia persiste la metadata con la que el Runtime ya trabaja. En un sprint posterior, la UI de administración podrá **leer de vuelta** la fila recién guardada (refresh del catálogo) sin tocar capas certificadas; el passthrough de `mapRepositoryRow` ya devuelve `alertConfiguration` desde `alert_config`.

## 8. FINAL CERTIFICATION

**LEVEL 5 — ALERT CAPABILITY · RUNTIME CERTIFIED · ENGINE CERTIFIED · PIPELINE CERTIFIED · BOUNDARIES CERTIFIED · PUBLIC API CERTIFIED · CONSUMPTION LAYER CERTIFIED · OPERATIONAL EXPERIENCE CERTIFIED**
