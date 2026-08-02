# Sprint 197 — Alert Configuration Metadata Foundation (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — ALERT CONFIGURATION METADATA FOUNDATION CERTIFIED
- **Type:** Configuration Model Foundation · SSOT Contract · Metadata Only (no runtime change)
- **Impact:** Alert Capability Configuration · Operational Configuration Layer · Repository Service
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Resultado esperado:** Contrato de configuración SSOT · Resolver dueño oficial de lectura · defaults únicos · metadata `alertConfiguration` **solo existe** — el Runtime NO cambia.

---

## 1. Principio aplicado

> **La configuración de la alerta pertenece a la metadata del recurso, no al código. Esta fundación solo existe: no cambia ningún funcionamiento.**

```
Metadatos del recurso (form / repositorio)
        │  alertConfiguration / alert_config
        ▼
AlertConfigurationResolver  ← dueño oficial de lectura
        │  MetadataNormalizer (parcial → COMPLETA)
        ▼
Configuración COMPLETA + defaults únicos
        │  (el Runtime NO consume todavía — Sprint 198)
        ▼
(Sprint 198 consumirá esta configuración; hoy solo existe)
```

## 2. Modelo de configuración (SSOT)

El contrato `AlertConfigurationMetadata` define los **9 parámetros** oficiales, sin lógica (model de solo descripción):

| Parámetro | Tipo | Default |
|---|---|---|
| `enabled` | `boolean` | `true` |
| `periodicity` | `{amount, unit} \| 'once' \| null` | `null` |
| `expiration` | `none \| recurring \| fixed` | `none` |
| `risk` | `{model, thresholds}` | `relative · {yellow:0.5, red:0.25}` |
| `priority` | `low \| medium \| high \| critical` | `medium` |
| `notification` | `{channel, recipients} \| null` | `null` |
| `gracePeriod` | `{amount, unit} \| null` | `null` |
| `automaticClose` | `boolean` | `true` |
| `repeatPolicy` | `repeat \| once` | `repeat` |

- **Dueño único:** metadata del recurso (`sgc_forms` / `sgc_document_repositories`). Nunca Module, nunca Capability, nunca el Dashboard.
- **Modelo de riesgo relativo** (escala-independiente), según Sprint 196: umbrales amarillo 0.5 / rojo 0.25 sobre la fracción restante del periodo.
- `never`: `['computes due dates','evaluates dates','generates alerts','decides policies','notifies']`.

## 3. Componentes creados/modificados

| Archivo | Cambio |
|---|---|
| `operational-configuration/AlertConfigurationMetadata.js` | **NUEVO** — Contrato SSOT tipado, sin lógica ejecutable. Enums (`PERIODICITY_UNITS`, `EXPIRATION_POLICIES`, `RISK_MODELS`, `REPEAT_POLICIES`, `NOTIFICATION_CHANNELS`) + `ALERT_CONFIGURATION_VERSION`. |
| `operational-configuration/DefaultAlertConfigurationProvider.js` | **NUEVO** — Default único y congelado (`DEFAULT_ALERT_CONFIGURATION` + `provideDefaultAlertConfiguration()`). Provider ONLY. |
| `operational-configuration/MetadataNormalizer.js` | **NUEVO** — Convierte metadata parcial en configuración COMPLETA (frozen, 9 campos). Neutraliza valores inválidos (fallback al default). Normalization ONLY, sin evaluación de fechas. |
| `operational-configuration/AlertConfigurationResolver.js` | Añade `resolveResourceAlertConfiguration(resource)` y `extractResourceAlertMetadata(resource)` → **dueño oficial de lectura**: extrae `alertConfiguration ?? alert_config`, normaliza, devuelve **`{ source, resourceId, configuration }`** (`source: 'metadata'|'default'`). `resolveOperationalConfiguration` intacto. |
| `operational-configuration/index.js` | Exporta el contrato, el default provider y el normalizer. |
| `services/documentRepositoriesService.js` | `mapRepositoryRow` propaga `alertConfiguration` **solo cuando la columna existe** (`row.alert_config !== undefined`). Passthrough seguro: no rompe queries (columna aún ausente en BD). |

## 4. Lo que NO cambió (requisito: "No cambia funcionamiento")

**No modificado:** Runtime Engine, Runtime Binding, Runtime Visibility, `deriveRulesFromBinding`, `useAlertRuntime` (NO consume config), Dashboard, Alert Workspace, Dynamic Forms, Repository navegación, Adapters, Assignment Engine, DynamicModule, React Router, Capability Resolver, `resolveOperationalConfiguration`, `requestOperationalConfiguration`, `AlertConfigurationContract`, `AlertRuleDescriptor`, `AlertPriorityPolicy`.
**No creado:** motores paralelos, servicios paralelos, cache manager, store, providers nuevos consumidos por el Runtime.

**Prohibidos y ausentes (verificado):** `const ALERT_CONFIGURATION={}`, `if(form.id===...)`, `switch(module.slug)`.

## 5. Nota de persistencia

La columna `alert_config` **no existe aún** en el esquema (`sgc_forms` / `sgc_document_repositories`; verificado: sin migraciones SQL en el repo). El `mapRepositoryRow` propaga `alertConfiguration` de forma defensiva. La habilitación de columna + select en formularios queda fuera de esta fundación (no romper queries); se hará cuando se consume (Sprint 198+).

## 6. Certificación

- Suite: `sprint-197-alert-configuration-metadata-certification.mjs` → **P1–P13 PASS** (contrato SSOT, defaults únicos, normalizer completo/inválidos, resolver metadata/default, extracción raw, Runtime no consume, sin motores paralelos, regresiones `resolveOperationalConfiguration`/`requestOperationalConfiguration`, passthrough repos).
- Regresiones: Sprint 185–190 (B/F/N/R/C/D) + Sprint 195 (Q1–Q11) **PASS**.
- Build: `npm run build` **PASS** (2.46s).
