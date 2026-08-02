# Sprint 199.R — Alert Evaluation Policy Layer Refinement (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — ALERT EVALUATION POLICY CERTIFIED
- **Type:** Engine Refinement · Policy Layer · SSOT Hardening
- **Impact:** Alert Evaluation Engine únicamente (no modifica Runtime, Dashboard, Workspace, Resolver, Descriptor, Configuration, Consumption)
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Resultado esperado:** Separar completamente Strategy (calcula tiempo) de Policy (interpreta negocio).

---

## 1. Objetivo

```
Evaluation Strategy → Evaluation Policy → AlertEvaluation
```

La **Strategy calcula** (tiempo). La **Policy interpreta** (negocio).

## 2. Problema detectado

En Sprint 199 toda la inteligencia (risk, severity, status, transition, escalation) quedó dentro de `PeriodicEvaluationStrategy`, lo que violaba parcialmente el principio Open/Closed certificado.

## 3. Arquitectura refinada

```
PeriodicEvaluationStrategy
        ↓
Temporal Evaluation
        ↓
AlertTemporalState
        ↓
AlertEvaluationPolicy
        ↓
AlertEvaluation
```

## 4. Componentes nuevos

| Archivo | Responsabilidad |
|---|---|
| `evaluation/AlertTemporalState.js` | Value Object inmutable: `baseDate, period, nextDue, remaining, elapsed, overdue` (nada más). |
| `evaluation/AlertEvaluationPolicy.js` | Interfaz oficial: `evaluate(temporalState, descriptor, configuration, runtimeContext) → AlertEvaluation`. |
| `evaluation/RelativeRiskPolicy.js` | Primera implementación: `riskLevel, severity, status, transition, escalation` — nunca calcula fechas. |
| `evaluation/AlertEvaluationPolicyResolver.js` | Resolver por metadata; hoy devuelve solo `RelativeRiskPolicy`; futuras (`RegulatoryPolicy, SLAPolicy, EnterprisePolicy, CustomerPolicy`) reservadas. |

## 5. Nuevo flujo

```
Runtime → Descriptor → Strategy → AlertTemporalState → Policy Resolver → Policy → AlertEvaluation
```

## 6. Beneficios

El Engine queda desacoplado en dos dimensiones:

- **Dimensión temporal** (Strategy): solo periodos, fechas, vencimientos → `AlertTemporalState`.
- **Dimensión de negocio** (Policy): solo riesgo, prioridad, estado, transición → `AlertEvaluation`.

Se puede cambiar por completo la política de riesgo sin tocar una sola línea del cálculo temporal.

## 7. Componentes congelados (intactos)

Runtime, Resolver, Configuration, Descriptor, Dashboard, Workspace.

## 8. Certification

Suites: `sprint-199R-alert-evaluation-policy-layer-certification.mjs` → **K1–K10 PASS**; `sprint-199-alert-evaluation-engine-certification.mjs` → **J1–J12 PASS** (Sprint 199 sin romper). Build 2.44s PASS.

| Item | Estado |
|---|---|
| Temporal State aislado | ✅ |
| Strategy únicamente calcula tiempo | ✅ |
| Policy únicamente interpreta negocio | ✅ |
| Engine desacoplado en dos capas | ✅ |
| Open/Closed fortalecido | ✅ |
| Sin romper Sprint 199 | ✅ |
| Build PASS | ✅ |
| Regresiones PASS | ✅ |

Regresiones PASS: Sprint 197 (P1–P13), 198 (I1–I13), 198.R2 (B1–B8), 199 (J1–J12).

## 9. Próximo paso

Sprint 200 podrá integrar la evaluación al Consumo usando `{ descriptor, evaluation }`, o registrar nuevas políticas de negocio sin modificar el Engine.
