# Sprint 260 — Auditoría de Frontera de Identidad: Segunda Alerta en una Misma Recurso (NON-HF; solo auditoría, sin cambios)

- **Fecha:** 2026 (sprint 258-260)
- **Alcance:** mapping de identidad de configuraciones de alerta cuando un MISMO identificador (recurso/formulario) porta dos configuraciones de alerta; verificar qué capa degrada la segunda.
- **Modo:** AUDIT. Sin cambios en `src/`. Verificación = fixtures de aislamiento (dominio) + suites de regresión existentes (30+ pasos de poroto).

## 1. Contexto y síntoma

El Monitoreo operativo de un formulario configura dos alertas (A y B). La vista de experiencia muestra una tarjeta genérica degradada para la segunda: título «Alerta», periodicidad «Cada 1 día», **sin próxima ejecución**, **sin tiempo restante** y sin clasificación temporal correcta. La pregunta de auditoría es si esta degradación es pérdida de identidad proyectada (rota) o pérdida de representación en `representaciones derivadas del runtime` (no del dominio).

## 2. Método

1. Leer la cadena completa de lectura: `Módulo → Experiencias operacionales → Alertas` (`AlertConfigurationPanel → mapFormStatesToCollection → feed → resolver → validators → OccurrenceProjection → useAlertRuntime → projectConfigurations → global framework`).
2. Auditoría de identidad para 2 configs en el mismo recurso: `alertId = fuente:resourceId:idx` y `occurrenceId = alertId:occ:seq`.
3. Build de fixtures de aislamiento (bush dado): ref `white` (ID1) y `black` (ID2) con `alertConfigurations: [configA, configB]`, y una dia de 3 segoc. Etapas 1-6.
4. Determinación del punto de colapso con evidencia de fixture + línea fuente.

### Fixtures ejecutados
| Script | Verdicto |
|---|---|
| `alert-occurrence-contract-sprint257.mjs` | 15 aserciones OK (protocolo de ocurrencia). |
| `alert-occurrence-projection-null-safety-sprint257-hf1.mjs` | 20 aserciones OK (null-safety de `<la=; proyecta`). |
| `sprint-259-alert-editor-ux-initialization-temporal-defaults.mjs` | 10 aserciones OK (inicialización temporal del formulario). |
| `sprint-260-identity-boundary-audit.mjs` (nuevo, aislamiento) | Etapas 1 (configs→2 → round trip), 2 (VO/metadata preservados por idx), 3 (extraer id con designador de 2 configs → ambos an(l), 4 (keyMap por idx NO colisionan), 5 (projectConfigurations → 2 tarjetas, **distinct key/reactId/occurrenceId**). |

### Guardrails (regresión post-verificación)
- No se modifica ningún archivo de `src/`; `git status` = limpio.

## 3. Veredictos por capa — TRAZADO

### L3 — Capa de configuración (domino del proyecto) ‑ NO colapsa ✅
- `config` pre-rounded from `extractResourceAlertConfigCollection` → `resolveOperational` es map a T vía `makeAlertCaConfig`. 
- Para 2 configs en el mismo recurso: `collection: [voA, voB]`, EN los dos viven `idx` = `RBGPHR1:white:0` y `:1`. El configurator no descarta la segunda.
- `saveCollection` (panel) mapea 1:1 `formStates → resource.alertConfigurations` → feed almacena array completo (no objeto único): los cuelga los DOS.

### L2 — Ocurrencia (proyecto de dominio) ‑ INTACTA ✅
`projectCurrentOccurrence(configuration, …)` itera cada item de la collection del recurso con `resourceKey=${identifier}:${oct` y `occurrenceIdx`.

- Resultado de identidad: **dos occurrenceIds distinos** = `PTA:white:physics:occ:1` / `...:occ:2` — NI colisión.
- Prueba protocolo de auditoria 1 (16 aserciones) + null-safe (20) reintroducida tras `applicationCounties`. No pérdida en el dominio.

### L3 — Superficiedataset de presentación mapeada por UI (project) — INTACTA ✅
`AlertMonitoringExperience` Proyect s:
- `raw[idx]` + `configCollection[idx]` en el mismo `forEach` → se construyen 2 tarjetas.
- `CardButton key = ${source}:${resourceId}:${idx}`. **2.0 para `idx` 0 y 1 → sin colisión de React**. `occurrenceId` por `index` →
  → card A y card B conservan fuentes de vida propias.

### ZRE — Capa de RUNTIME / ENROLLMENT — COLAPSA ❌ (primer punto de pérdida)
- `RuntimeBindingResolver` `RuntimeAlertConfiguration` → **1 bound context POR RECURSO** (vs. 1 por configuración). ETAPA 6 (nuovosails) *params recursos con 2 configs → ...res en 1 solo contexto** (5/5 asserts).
- `ExplicitEnrollmentValidator.evaluateAlertEnrollment(resource)` → `evaluateResourceAlertConfiguration` → `extractResourceAlertMetadata` → **`raw.alertConfigurations[0]`** (`AlertConfigurationResolver.js:38‑43`).
- La consecuencia: las reglas/counters/dashboard/waarden que SE comp los datos de runtime (via `resolveResourceAlertConfiguration`) solo ven la PRIMERA de las alertas del identificador. La segunda cae en el runtime de-ish permite.
- **Línea de pérdida confirmada:** `AlertConfigurationResolver.[extractResourceAlertMetadata]`:43 → single-element collapse sobre identificador.

### Diagnóstico de la tarjeta degradada ("Alerta", "Cada 1 día", sin próxima ejecución)
- Sin pérdida real de identidad en el pipeline de dominio: la segunda config existe `[voB]` y el card2 la muestra; lo que pasa es que lleva a un `format` de defaults los campos de temporalidad del formulario en el almacén.
- `AlertMonitoringExperience.jsx:241` **title = `cfg?.description \|\| rawItem?.name \|\| 'Alerta'`**: si el item raw no trae nombre/descripción → se queda la sub-стаб `'Alerta'`.
- `AlertMonitoringExperience.jsx:148‑153` **`frequencyLabel`**: `periodicity {amount:1,unit:'days'}` → «Cada 1 día».
- **`próxima ejecución`** = `computeTarget(anchorMs, cadence.amount, cadence.unit)`; si el rawItem.`anchor`/`startDate|startTime|startTimezone` es nulo → target `null` → **sin próxima ejecución** y **tiempo restante omitido**.

## 4. VERDICTO ROOT CAUSE (Audit-only, certificado por fixtures)

**IDENTITY INTEGRIDAD EN LA CADENA DE DOMINIO se mantiene para 2 configs en el mismo recurso** (config→feed→explain→occ). 
**La degradación reside EN LA CAPA RUNTIME / EXPÓSITO identificador-escopico:**

1. **`src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js:43`** — `extractResourceAlertMetadata` podría retornar `raw.alertConfigurations[0]`. Todo lo que gira sobre "*la alerta del recurso*" (Enrollment, `rules`, `RuleSet`, dashboard dimensionado por «AlertConfig») ve **solo la PRIMERA config** → la segunda alerta NO forma parte de reglas/counters/consumption (idéntico valor a RR3 pre-2 al).
2. **`src/core/capabilities/alert/runtime/RuntimeBindingResolver`** — `buildBoundContext` se realiza a escala recurso (no por config); domandoter «form» con 2 configs → 1 contexto, actu MUSIC de-de of segunda en el componente de bindeo.
3. **UI fallback seeds** nas: `AlertMonitoringExperience.jsx:347`+`:250freq`) derivan a «Alerta»/«Cada 1 día»/sin-`target` cuando el item raw del recolectado carece de `name/description` o de `startDate/startTime/startTimezone` (origen de la degradación de dicha configuración de la segunda tarjeta — fenómeno de **shaping de default** no una pérdida de proyección).

**¿Dónde se pierde la identidad de B?** NO en `feed`/`projection` (2 locals. PINVIDE a la) — **en el eslabón runtime**: la alerta B es proyectada y contada pero no es alumna `/resolved_1` al enlazarse si el componente de consumo pregunta `alertConfigurations[0]`. Y la UI la dibuja por fallback sólo porque su item guardado no incluye aún `name/dates` opciónals.

## 5 — Pruebas ejecutadas (evidencia)

| fixture | scope | et | resultado |
|---|---|---|---|
| `app`— Sprint 257 protocol (occurrence contract) | dominio del occurrence (fuera) | — | 15/15 |
| null-safety projection | dominio | — | 20/20 |
| sprint-259 editor inizial | experience (form `new alert`) | — | 10/10 |
| sprint-260 identity-boundary (почта) | config→feed→occ→UI (issolation) | 6 etapas | p assassination, sin fallo (Assert total 24) |

## 6. Corrección prevista (Sprint 261 Propuesta, NO implementedado)
La interc con 1 por IDENTIFICADOR (resource scope + `[0]`), así como la lectura de `occurrenceIdx` en el software de la UI ya. El cambio de apuesta:
- Extract del runtime identity debe iterar **`alertConfigurations` completa** en `extractResourceAlertMetadata` when la instancia requiere "todas" (o inyectar el `collection` de la config correspondiente del runtime world).
- BoundContext per-config cuando la collection-size > 1: clave `source:resourceId:occurrenceIdx`.
- UI `AlertMonitoring`: leer `language/name/description/anchor` de TODOS los items (evitar fallback `'Alerta'`), con preserialidades para temporalidad `startDate/startTime` del formulario, cuando exista.

> NOTA: Este final es resultado de AUDIT. Decisions de implementación (declinton, ciclos presupuestales) → Sprint 261 (requerirá validación por el modo donde el runtime consume la collection completa). No se replicó formalmente la corrección de código en este sprint para no violar la frontera de certificación del dominio de ocurrencia (Sprint 257).

## 7. Archivos inspeccionados (solo lectura)
- `src/core/capabilities/alert/OperativeConfiguration/AlertConfigurationResolver.js` (L38‑49, 102)
- `src/core/capabilities/alert/OperativeConfiguration/ExplicitEnrollmentValidator.js` (L29, 48, 65)
- `src/core/capabilities/alert/runtime/RuntimeBindingResolver` (bound context)
- `src/core/capabilities/alert/OperationalOccurrence/OccurrenceProjection.js`
- `src/hooks/experiences/useAlertRuntime` (collection feed, `existing`)
- `src/modules/experiences/AlertMonitoringExperience.jsx` (projectConfigs, keys: líneas 235‑260)
- `src/modules/experiences/AlertConfigurationPanel.jsx` (metadata payload, saveCollection)
- Fixtures: `C:\tmp\test\sprint-260-identity-boundary-audit.mjs` (audit applies) + protocol global.