# Sprint 198.R3 — Alert Evaluation Extension Point Certification (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — ALERT EVALUATION EXTENSION POINT CERTIFIED
- **Type:** Architecture Refinement · Extension Point Certification · SSOT Stabilization
- **Impact:** Ninguno (certificación arquitectónica — sin modificaciones de código)
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Resultado esperado:** Certificar el único punto donde podrá vivir la lógica de evaluación de alertas sin modificar el Runtime existente.

---

## 1. Principio certificado

> **El pipeline Sprint 197–198 queda congelado. El único punto de extensión permitido es el Alert Evaluation Engine (Sprint 199).**

```
Metadata
  │
  ▼
AlertConfigurationResolver
  │
  ▼
AlertConfiguration (Value Object)
  │
  ▼
Runtime Binding
  │
  ▼
AlertRuleDescriptor
  │
  ▼
(Alert Evaluation Engine) ← ÚNICA caja pendiente
  │
  ▼
Consumption Layer
  │
  ▼
Dashboard / Workspace
```

## 2. Responsabilidades certificadas

| Capa | Responsabilidad | Nunca |
|---|---|---|
| **Metadata** | almacenar configuración | calcular riesgo, vencimientos, estados |
| **Resolver** | leer metadata, normalizar, defaults, validar contrato | interpretar fechas, evaluar prioridad, calcular severidad |
| **Runtime** | transportar configuración, construir descriptor | calcular riesgo, overdue, interpretar periodicidad, modificar configuración |
| **Evaluation Engine (199)** | periodicidad, vencimiento, remaining time, overdue, severity, transitions, escalation, runtime status | — (exclusiva) |
| **Consumption** | representar | decidir |

## 3. Contrato del punto de extensión

```
Entrada:  { descriptor, configuration, runtimeContext }
Salida:   { descriptor, evaluation }
```

- `evaluation` es un Value Object **completamente independiente**.
- Nunca modifica `descriptor.configuration`, nunca modifica `AlertConfiguration`, nunca modifica `AlertRuleDescriptor`.

## 4. Contrato reservado: `AlertEvaluation` (NO implementado)

Contiene únicamente: **status, remaining, overdue, severity, risk, nextDue, lastExecution, transition, escalation**.

No contiene metadata, no contiene runtime, no contiene referencias a recursos.

## 5. Frontera de dependencias

```
Configuration → Evaluation → Consumption
```

Nunca `Consumption → Configuration` · Nunca `Runtime → Evaluation` · Nunca `Resolver → Evaluation`.

## 6. Inmutabilidad certificada

Permanecen inmutables durante toda la ejecución: **AlertConfiguration**, **AlertRuleDescriptor**, **RuntimeContext**.
El único objeto mutable será **AlertEvaluation**, y únicamente existirá durante la evaluación.

## 7. Componentes congelados

A partir de este Sprint: `AlertConfigurationResolver`, `MetadataNormalizer`, `AlertConfiguration`, `DefaultAlertConfigurationProvider`, `Runtime Binding`, `useAlertRuntime`, `AlertRuleDescriptor`, `Dashboard Integration`, `Workspace Integration`, `Dynamic Forms`, `Dynamic Records`, `Repository Runtime`. **Sprint 199 no podrá modificarlos.**

## 8. Restricciones certificadas

Continúan prohibidos: motores paralelos, scheduler, cron interno, caches nuevas, providers nuevos, stores nuevos, contextos nuevos, duplicar Runtime/Resolver/Dashboard. Toda evaluación pasará exclusivamente por el Evaluation Engine.

## 9. Certificación

- Suite: `sprint-198R3-alert-evaluation-extension-point-certification.mjs` → **E1–E10 PASS**.
- Sin modificaciones de código (working tree limpio); commit de solo documentación.
- Regresiones: Sprints 185–198.R2 intactos.

## 10. READY FOR SPRINT 199

El único punto de extensión queda certificado. Sprint 199 implementará el **Alert Evaluation Engine** respetando el contrato `{ descriptor, configuration, runtimeContext } → { descriptor, evaluation }`, sin tocar ninguna capa congelada.
