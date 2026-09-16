# Sprint 198.R4 — Alert Runtime ↔ Evaluation Contract Certification (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — ALERT RUNTIME / EVALUATION CONTRACT CERTIFIED
- **Type:** Architecture Refinement · Runtime Contract Certification · SSOT Stabilization
- **Impact:** Ninguno (certificación arquitectónica — sin modificaciones funcionales)
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Resultado esperado:** Certificar el contrato definitivo entre Runtime y Alert Evaluation Engine para que ningún Sprint futuro vuelva a modificar el pipeline.

---

## 1. Principio certificado

> El Runtime produce contexto. El Evaluation Engine produce estado. Ninguna capa invade la responsabilidad de la otra.

```
Metadata
      │
      ▼
AlertConfigurationResolver
      │
      ▼
AlertConfiguration
      │
      ▼
Runtime Binding
      │
      ▼
AlertRuleDescriptor
      │
      ▼
Alert Evaluation Engine
      │
      ▼
AlertEvaluation
      │
      ▼
Consumption
```

A partir de esta certificación:
- **Runtime jamás calculará estados.**
- **Evaluation jamás reconstruirá metadata.**
- **Dashboard jamás interpretará reglas.**

## 2. Contrato definitivo Runtime → Evaluation

El Runtime entrega exactamente tres objetos:

```
{
  descriptor,
  configuration,
  runtimeContext
}
```

No entrega: `remaining`, `overdue`, `severity`, `risk`, `status`, `transitions`. Toda esa información todavía no existe.

## 3. Contrato definitivo Evaluation → Consumption

El Engine devuelve:

```
{
  descriptor,
  evaluation
}
```

donde `evaluation` es completamente independiente del descriptor. Nunca modifica `descriptor`, `configuration`, `runtimeContext`.

## 4. Información propiedad del Runtime

`source`, `formId`, `recordType`, `documentId`, `resourceId`, `message`, `condition`, `configuration`, `runtimeContext`.
Nunca: `dueDate`, `overdue`, `remaining`, `escalation`, `risk`, `severity`, `status`.

## 5. Información propiedad del Evaluation Engine

`nextDue`, `remaining`, `elapsed`, `overdue`, `status`, `severity`, `riskLevel`, `transition`, `escalation`.
Toda esta información nace únicamente dentro del Engine.

## 6. Invariantes certificados

- **I1** Descriptor nunca cambia.
- **I2** Configuration nunca cambia.
- **I3** RuntimeContext nunca cambia.
- **I4** Evaluation nunca modifica ninguno de ellos.
- **I5** Evaluation siempre genera un objeto nuevo.
- **I6** Consumption nunca modifica Evaluation.
- **I7** Dashboard solamente representa.
- **I8** Workspace solamente representa.
- **I9** Adapters solamente transportan.
- **I10** Metadata permanece completamente aislada.

## 7. Dependencias permitidas

```
Configuration → Evaluation → Consumption
```

Prohibido: `Consumption → Configuration`, `Evaluation → Metadata`, `Evaluation → Resolver`, `Dashboard → Runtime`, `Workspace → Resolver`, `Runtime → Dashboard`.

## 8. Pipeline congelado

Congelados: `AlertConfigurationResolver`, `AlertConfiguration`, `MetadataNormalizer`, `DefaultAlertConfigurationProvider`, `Runtime Binding`, `useAlertRuntime`, `AlertRuleDescriptor`, `Dashboard Integration`, `Workspace Integration`, `Repository Runtime`, `Dynamic Forms`, `Dynamic Records`.

**Sprint 199 únicamente podrá crear:** `AlertEvaluation`, `AlertEvaluationEngine`, `AlertEvaluationContract`, `AlertEvaluationPolicy` — sin modificar ninguno de los anteriores.

## 9. Restricciones certificadas

Prohibidos: Alert Engine paralelo, Scheduler propio, Cron interno, Runtime alterno, Resolver alterno, Dashboard paralelo, Providers adicionales, Contexts nuevos, Stores nuevos, Caches nuevas. Existe un único pipeline oficial.

## 10. Definition of Done

✅ Runtime completamente desacoplado del cálculo.
✅ Evaluation aislado de Metadata.
✅ Descriptor certificado como contrato inmutable.
✅ Configuration certificado como Value Object.
✅ RuntimeContext certificado como contexto de transporte.
✅ Consumption certificado como capa de representación.
✅ Pipeline completamente congelado.
✅ Sprint 199 podrá implementarse sin volver a modificar la arquitectura.

## 11. Certificación

Suite: `sprint-198R4-alert-runtime-evaluation-contract-certification.mjs` → **R1–R10 PASS** (con build PASS aparte).

| Item | Estado |
|---|---|
| Runtime Contract | ✅ |
| Evaluation Contract | ✅ |
| Boundary Responsibilities | ✅ |
| Immutable Descriptor | ✅ |
| Immutable Configuration | ✅ |
| Runtime Context | ✅ |
| Evaluation Isolation | ✅ |
| Consumption Isolation | ✅ |
| Dependency Graph | ✅ |
| Pipeline Frozen | ✅ |

Commit de solo documentación (sin modificaciones de código). Regresiones Sprints 185–198.R3 intactas.

## 12. READY FOR SPRINT 199

Sprint 199 implementará el **Alert Evaluation Engine** creando únicamente `AlertEvaluation`, `AlertEvaluationEngine`, `AlertEvaluationContract`, `AlertEvaluationPolicy`, respetando el contrato `{ descriptor, configuration, runtimeContext } → { descriptor, evaluation }` sin tocar ninguna capa congelada.
