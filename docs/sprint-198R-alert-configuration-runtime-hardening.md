# Sprint 198.R — Alert Configuration Runtime Hardening & Contract Stabilization (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — ALERT CONFIGURATION RUNTIME HARDENING
- **Type:** Runtime Hardening · Contract Stabilization · Metadata Integrity
- **Impact:** Alert Runtime (`useAlertRuntime`) · AlertConfigurationResolver · Metadata Normalizer · New AlertConfiguration Value Object
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Resultado esperado:** El Runtime queda desacoplado de la estructura física de la metadata y preparado para riesgo/periodicidad/vencimientos sin volver a modificar el pipeline.

---

## 1. Principio aplicado

> **La regla Runtime jamás interpreta metadata: únicamente la transporta.**

```
Metadata → Resolver → Runtime Configuration (Value Object inmutable) → Descriptor
                                                                    sin lógica intermedia
```

El Runtime conoce **únicamente `configuration`**. Nunca `alertConfiguration`, nunca `alert_config`, nunca `resource.priority/enabled`. Toda lectura pasa por el Resolver.

## 2. Cambios (hardening, sin funcionalidad nueva)

| Archivo | Cambio |
|---|---|
| `operational-configuration/AlertConfiguration.js` | **NUEVO** — **Value Object** formal: `createAlertConfiguration` (deep-freeze, exactamente los 9 campos canónicos, descarta extras), `isAlertConfiguration` (guard estructural), `assertAlertConfiguration` (assert de contrato), `CONFIGURATION_KEYS`. |
| `operational-configuration/AlertConfigurationResolver.js` | `resolveResourceAlertConfiguration` entrega la configuración como **Value Object** (`createAlertConfiguration(normalize...)`). **Nuevo** `shouldProduceAlert(configuration)` — la decisión `enabled` pasa a ser del Resolver (único dueño de decisiones de configuración). |
| `operational-configuration/index.js` | Exporta `createAlertConfiguration`, `isAlertConfiguration`, `assertAlertConfiguration`, `CONFIGURATION_KEYS`, `shouldProduceAlert`. |
| `src/hooks/useAlertRuntime.js` | `transportConfiguration(configuration)` = **transporte puro** (copia cada campo AS-IS, sin interpretar, sin re-defaults). `deriveRulesFromBinding` usa `shouldProduceAlert(configuration)` para la existencia (no evalúa `enabled`). Las reglas ahora son **Object.freeze** (inmutabilidad extremo a extremo). La regla transporta los 9 campos + `periodicity`/`expiration`/`risk`. |

**Separación conceptual del descriptor (sin cambiar la API):**
```
Runtime Information:   source, resourceId (formId/recordType/documentId), condition, message
Configuration Info:    enabled, priority, repeatPolicy, notification, automaticClose,
                       gracePeriod, periodicity, expiration, risk
```

## 3. Verificación de no-cambios

- **Storage:** `resource.alertConfiguration` / `resource.alert_config` se leen SOLO en `extractResourceAlertMetadata` (Resolver) y el passthrough de `mapRepositoryRow` (Sprint 197). El Runtime (`useAlertRuntime.js`) no contiene ningún token de storage (grep verificado).
- **No modificado:** Runtime Engine, Runtime Visibility, Runtime Binding, Assignment Engine, Dashboard, Dynamic Forms, Dynamic Records, Repository Runtime, AlertDashboardDataProvider, Alert Workspace, React Router, Capability Resolver, AlertRuleDescriptor, AlertPriorityPolicy, AlertConfigurationContract.
- **Sin interpretación:** no existe `if(configuration.priority)`, `if(configuration.repeatPolicy)`, checks defensivos; la única condición de configuración es `shouldProduceAlert` (Resolver).

## 4. Certificación

- Suite: `sprint-198R-alert-configuration-runtime-hardening-certification.mjs` → **H1–H10 PASS**:
  - H1 Resolver único de metadata · H2 Runtime desacoplado del storage · H3 metadata opaca · H4 Configuration Value Object inmutable (deep freeze, 9 campos, sin extras) · H5 normalización única · H6 transporte puro al descriptor · H7 sin interpretación (decisión enabled del Resolver) · H8 inmutabilidad Resolver→reglas · H9 pipeline transporta risk/periodicity/expiration (listo para Sprint 199) · H10 mismas reglas que Sprint 198 (sin cambios funcionales).
- Regresiones: Sprint 185–190 (B/F/N/R/C/D) + 195 (Q) + 197 (P) + 198 (I) **PASS**.
- Build: `npm run build` **PASS** (2.50s).

## 5. Preparado para Sprint 199

El modelo queda listo para incorporar `configuration.periodicity`, `configuration.expiration` y `configuration.risk` en un motor de evaluación sin modificar: Runtime Binding, Dashboard, Workspace, Alert Runtime. Solo el motor de evaluación nuevo (fuera del pipeline actual) implementará vencimiento/periodicidad/riesgo.
