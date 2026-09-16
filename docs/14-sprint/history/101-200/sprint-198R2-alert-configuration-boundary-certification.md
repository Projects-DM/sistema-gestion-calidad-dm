# Sprint 198.R2 — Alert Configuration Boundary Certification (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — ALERT CONFIGURATION BOUNDARY CERTIFIED
- **Type:** Runtime Boundary Hardening · Contract Certification · SSOT Refinement
- **Impact:** Ninguno (certificación pura — sin modificaciones de código)
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Resultado esperado:** El Runtime queda aislado de la lógica de configuración y preparado para Sprint 199 sin requerir modificaciones adicionales del pipeline.

---

## 1. Principio certificado

> **Toda decisión funcional de Alert Capability debe originarse únicamente en el Evaluation Engine (Sprint 199). Ni Runtime, ni Dashboard, ni Workspace, ni Resolver.**

```
Metadata → Resolver → Configuration (Value Object) → Runtime → Descriptor → Evaluation Engine (199) → Consumption → Dashboard/Workspace
```

El Runtime **únicamente transporta**. Nunca interpreta, nunca calcula, nunca decide.

## 2. Fronteras certificadas

| Capa | Responsabilidad certificada | Prohibido |
|---|---|---|
| **1. Metadata** | almacenar configuración | calcular riesgo, vencimientos, generar alertas |
| **2. Resolver** | leer metadata, normalizar, completar defaults, validar contrato, devolver Value Object | evaluar fechas, generar prioridades, consultar Runtime |
| **3. Runtime** | transportar configuración, construir descriptor, entregar contexto al motor | modificar/interpretar configuración, recalcular defaults, tomar decisiones |
| **4. Evaluation Engine (199)** | exclusiva: periodicidad, vencimientos, riesgo, severidad, estado, escalamiento, transición | — (aún no existe) |

## 3. Contrato del Value Object (certificado)

`AlertConfiguration` es: **completamente inmutable** (deep freeze), **serializable** (JSON round-trip), **sin referencias al Runtime**, **sin métodos**, **sin estado mutable**, **sin funciones**. Value Object puro (9 campos canónicos, sin extras).

## 4. Contrato del Descriptor (certificado)

`AlertRuleDescriptor` es: **inmutable**, **serializable**, **sin referencias al Resolver**, **sin referencias a Metadata**, **sin referencias a Base de Datos**. Contrato de transporte puro:

```
Runtime Context:   source, resourceId (formId/recordType/documentId), condition, message
Configuration:     configuración completa (9 campos, transportados AS-IS)
Runtime State:     vacío hasta Sprint 199
No contiene:       riesgo/vencimiento/severidad COMPUTADOS (solo transporta config.risk)
```

## 5. Restricciones verificadas (sección 6)

- **Sin cálculos temporales** en todo el capability: `Date.now()`, `new Date()`, `moment()`, `dayjs()` → **0 ocurrencias** (grep en `src/core/capabilities/alert/**`).
- **Sin interpretación de configuración en Runtime**: `if(configuration.periodicity/expiration/risk/priority)`, `switch(configuration)` → ausentes.
- **Única decisión pre-Engine:** `shouldProduceAlert` (existencia de alerta desde `enabled`), en el Resolver (Sprint 198). Es una decisión de configuración, no funcional.
- **Storage aislado:** los tokens `.alert_config`/`.alertConfiguration` existen SOLO en `AlertConfigurationResolver.extractResourceAlertMetadata` (dentro del capability) y en el passthrough de `mapRepositoryRow` (fuera).

## 6. Componentes congelados (sección 10)

A partir de esta certificación quedan **congelados** (Sprint 199 no podrá modificarlos):
`AlertConfigurationResolver`, `MetadataNormalizer`, `AlertConfiguration`, `Runtime Binding`, `useAlertRuntime`, `Dashboard Integration`, `Workspace Integration`, `AlertRuleDescriptor`.

Este sprint NO los modificó (working tree limpio al certificar).

## 7. Certificación

- Suite: `sprint-198R2-alert-configuration-boundary-certification.mjs` → **B1–B8 PASS**:
  - B1 metadata aislada · B2 Resolver único de configuración · B3 Value Object certificado · B4 Descriptor como contrato de transporte · B5 Runtime sin lógica de negocio · B6 Evaluation Engine como único decisor (pipeline solo resuelve/transporta) · B7 pipeline congelado · B8 sin modificaciones funcionales.
- Regresiones: Sprint 185–190 + 195 + 197 + 198 + 198.R (**PASS**, sin cambios de código en este sprint).
- Build: `npm run build` **PASS** (2.55s).
- **Sin cambios de código:** commit de solo documentación.

## 8. READY FOR SPRINT 199

Pipeline congelado. Sprint 199 agregará únicamente el **Evaluation Engine** (periodicidad, vencimientos, riesgo, severidad, estado, escalamiento, transición) como nueva capa entre Descriptor y Consumption — sin modificar ninguna de las capas congeladas.
