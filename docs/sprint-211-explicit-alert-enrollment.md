# SPRINT 211 — Explicit Alert Enrollment (MASTER SSOT LEVEL 5)

- **Architecture Status:** LEVEL 5 — ALERT CAPABILITY · EXPLICIT ENROLLMENT MODEL
- **Type:** Behavioral Refinement · Runtime Enrollment Policy · Production Architecture Stabilization
- **Impact:** Enrollment Policy únicamente. NO modifica Runtime, Evaluation Engine, Consumption Layer, Dashboard, Workspace, Notification, Lifecycle, Operational Actions, Runtime Wiring ni Runtime Activation.
- **Branch:** `release/stable-sprint79`
- **Date:** 2026-08-03

---

## 1. Objetivo

Eliminar las alertas implícitas. Ningún recurso del sistema (Formulario, Repositorio, Documento u otra experiencia operacional) ingresa al Runtime de forma automática. Únicamente los recursos **configurados explícitamente por un usuario** participan del pipeline completo de alertas.

## 2. Motivación

Durante Sprint 210 se validó la persistencia end-to-end, pero persistía el comportamiento no deseado:

```
Crear Formulario   →   Alerta creada automáticamente
Crear Repositorio  →   Alerta creada automáticamente
```

Esto producía: contaminación del Dashboard, falsas alertas, ruido operacional, pérdida de significado del módulo y crecimiento artificial del Runtime.

Principio arquitectónico:

> Una alerta debe representar una decisión operacional, no una consecuencia automática de crear un recurso.

## 3. Causa raíz (Sprint 209/210 audit)

El entry point del Runtime (`deriveRulesFromBinding`, en `useAlertRuntime.js`) inscribía **todo** recurso visible:

- Para un recurso sin configuración, `AlertConfigurationResolver` devolvía defaults (`enabled: true`, `priority: 'medium'`).
- La regla era `shouldProduceAlert(configuration)` → `enabled !== false` → **true incluso para recursos nunca configurados**.
- Resultado: `Resource Exists → Alert Exists` (modelo implícito).

## 4. Nuevo modelo oficial

Antes:

```
Resource Exists → Alert Exists
```

Ahora:

```
Resource Exists
      ↓
Alert Configured ?
      ├── NO  →  Resource IGNORED
      └── YES →  Runtime Enrollment → Evaluation → Consumption
```

## 5. Política oficial de enrollment (E1–E4)

Un recurso ingresa al Runtime **únicamente** cuando se cumplen simultáneamente:

| # | Condición | Evidencia |
|---|---|---|
| E1 | Existe configuración de alerta | `extractResourceAlertMetadata` ≠ `null` |
| E2 | Configuración creada explícitamente por el usuario | metadata no vacía (`Object.keys(raw) > 0`) |
| E3 | Configuración habilitada | `shouldProduceAlert(configuration)` → `enabled === true` |
| E4 | Configuración válida | objeto según contrato certificado |

**NO enrollment** (ignorados por completo): recurso nuevo sin configuración, `enabled = false`, configuración `null`/`undefined`/`{}`, configuración inválida.

## 6. Cambio arquitectónico

Se elimina oficialmente el concepto de **alertas implícitas**. Desde este Sprint solo existen **Explicit Operational Alerts**.

Nueva frontera certificada:

```
Operational Experience → Enrollment Validator → Runtime
```

Prohibido:
- `Runtime → Create Default Alert`
- `Create Resource → Create Alert`

## 7. Componentes modificados (permitidos por el sprint)

| Archivo | Cambio |
|---|---|
| `src/core/capabilities/alert/operational-configuration/ExplicitEnrollmentValidator.js` | **NUEVO** — Evaluador oficial de política E1–E4 (`evaluateAlertEnrollment`, `isExplicitlyEnrolled`, `shouldEnrollResource`, `ENROLLMENT_REASONS`). Reutiliza el Resolver certificado (único lector de metadata y única decisión `shouldProduceAlert`) |
| `src/core/capabilities/alert/operational-configuration/index.js` | Exporta el Enrollment Validator (Enrollment Validation pública) |
| `src/hooks/useAlertRuntime.js` | **Runtime Entry Validation** — `deriveRulesFromBinding` reemplaza la regla implícita por el gate `if (!enrollment.enrolled) return null;`. Se elimina la dependencia directa a `shouldProduceAlert`/`resolveResourceAlertConfiguration` en la derivación |

**NO modificados:** Runtime Engine, Evaluation Engine, Consumption Layer, `AlertConfigurationResolver` (resolución), `DefaultAlertConfigurationProvider`, Dashboard, Workspace, Notification, Lifecycle, Operational Actions, providers, adapters ni contracts certificados.

## 8. Reglas por consumidor

| Capa | Regla Sprint 211 |
|---|---|
| Runtime | Evalúa SOLO `Explicitly Enrolled Resources`, nunca `All Resources` |
| Dashboard | Muestra solo `Configured → Enabled → Evaluated`; nunca formularios/repositorios nuevos |
| Workspace | Recibe `evaluationEntries` SOLO de recursos inscritos; sin tarjetas fantasma |
| Notification | Ejecuta SOLO sobre recursos inscritos |
| Lifecycle | Almacena historial SOLO de recursos inscritos |
| Operational Actions | Existen SOLO para alertas reales, nunca implícitas |
| Defaults | Prohibido generar prioridad/riesgo/frecuencia/severidad/notificación/vencimiento si el usuario nunca creó una alerta |

## 9. Definition of Done — verificado

- [x] Crear un formulario ya no genera automáticamente una alerta.
- [x] Crear un repositorio ya no genera automáticamente una alerta.
- [x] Solo aparecen alertas configuradas explícitamente.
- [x] Dashboard refleja únicamente alertas inscritas.
- [x] Workspace muestra únicamente alertas inscritas.
- [x] Notification no recibe recursos sin inscripción.
- [x] Lifecycle no registra recursos no inscritos.
- [x] Operational Actions solo operan sobre alertas reales.
- [x] No existen prioridades/riesgos/configuraciones por defecto creadas automáticamente.
- [x] Build PASS.
- [x] Regresiones PASS.

## 10. Certificación — `sprint-211-explicit-alert-enrollment-certification.mjs`

Resultado: **EE1–EE12 = 12/12 PASS**

| Ítem | Estado |
|---|---|
| EE1 Explicit Enrollment Policy | PASS |
| EE2 Automatic Enrollment Removed | PASS |
| EE3 Runtime Entry Validation | PASS |
| EE4 Dashboard Enrollment | PASS |
| EE5 Workspace Enrollment | PASS |
| EE6 Notification Enrollment | PASS |
| EE7 Lifecycle Enrollment | PASS |
| EE8 Operational Actions Enrollment | PASS |
| EE9 No Implicit Alerts | PASS |
| EE10 No Default Runtime Alerts | PASS |
| EE11 Build PASS | PASS |
| EE12 Regression PASS (14 suites) | PASS |

## 11. Evidencia de comportamiento

- Recurso sin `alert_config` → `evaluateAlertEnrollment.enrolled === false` (reason `no-alert-config`), aunque el Resolver devuelva defaults (`enabled:true`). Los defaults NUNCA inscriben.
- Recurso con `alert_config: {}` → `enrolled === false` (reason `empty-config`). El Resolver lo etiqueta `source:'metadata'`, pero la inscripción lo rechaza.
- Recurso con `enabled:false` → `enrolled === false` (reason `disabled`).
- Recurso con `alert_config` inválido (no objeto) → `enrolled === false` (reason `invalid-config`).
- Recurso inscrito: `enrolled === true`, `resolution.source === 'metadata'`, valores persistidos exactos (`priority:'high'`, sin defaults).

## 12. FINAL CERTIFICATION

**LEVEL 5 — ALERT CAPABILITY · EXPLICIT ALERT ENROLLMENT CERTIFIED · NO IMPLICIT ALERTS · OPERATIONAL ENROLLMENT MODEL CERTIFIED · RUNTIME ENTRY POLICY CERTIFIED · DASHBOARD CLEAN BY DESIGN · PRODUCTION ARCHITECTURE STABILIZED**
