# Sprint 283 — Auditoría de Verificación Post-280: Identidad, Arranque, Consumo y Residencia Documental

**Branch:** `release/stable-sprint79`
**Modo:** AUDIT ONLY (verificación del estado tras Sprint 280/281)
**Producción:** 0 cambios · **src/:** 0 cambios · **Supabase:** 0 cambios · **Schema:** 0 cambios · **Nuevos servicios:** 0
**SSOT:** `docs/Sprint-283.md`
**Dependencias:** Sprint 257 · 279 · 280 · 281
**Estado final:** **SPRINT 283 — AUDIT COMPLETE · FINDINGS CONFIRMED**

---

## 1. Objetivo

Verificar con evidencia de código el estado real de los puntos críticos señalados por
Sprint 281 y Sprint 280, cerrando con precisión `file:line` las siguientes preguntas:

```text
P0  ¿Existe aún la divergencia del álgebra de alertId (H1 de Sprint 281)?
O1  ¿Cómo se define el arranque de una ocurrencia? ¿El ledger registra starts?
O2  ¿Cómo se enlaza una ocurrencia con un registro real (sgc_form_responses)?
P2  ¿El stack "AlertWorkspace" está vivo o huérfano?
P3  ¿Existe navegación rota o duplicada hacia la experiencia de alertas?
P4  ¿Qué es la frontera documental real: Repository, Category o Document?
    ¿Existe residencia/certificación ISO en documentos?
```

Resultado: **5 hallazgos confirmados (3 de ellos nuevos), 2 riesgos latentes, 0 cambios de código.**

---

## 2. P0 — Divergencia del álgebra de `alertId` (H1 de Sprint 281) — CONFIRMADA

La divergencia documentada en Sprint 281 §17.2 **sigue vigente en el código actual**. Existen DOS
fórmulas de identidad para el mismo componente de alerta:

| Fuente | Fórmula | Ejemplo | Ubicación (verificada) |
|--------|---------|---------|------------------------|
| Resolver / Enrollment (SSOT, documento canónico) | `` `${resourceId}:alert:${index}` `` | `12:alert:0` | `AlertConfigurationResolver.js:200` (`alertConfigIdOf`); docs `:148-149,190`; `:171,235`; `ExplicitEnrollmentValidator.js:89` |
| Proyección (occurrence runtime) | `` `${source}:${resource?.id ?? resource?.slug ?? idx}:${idx}` `` | `dynamicForms:12:0` | `OccurrenceProjection.js:160-162` (`alertIdOf`, usada en `:105` y `:119`) |
| Cards (AlertMonitoringExperience) | `` `${s}:${resource?.id ?? resource?.slug ?? idx}:${idx}` `` | `dynamicForms:12:0` | `AlertMonitoringExperience.jsx:249` |

### 2.1 Consecuencia operativa — consistencia interna del camino de completado

La clave específica del ledger es `occurrence::<alertId>::<occurrenceId>`
(`OccurrenceLedger.js:44-46`). Para que un completion matchee, el emisor debe usar EXACTAMENTE el
`alertId` de la proyección.

El camino explícito **es internamente consistente** (verificado end-to-end):

```text
OccurrenceProjection.alertIdOf (forms:12:0)        ← proyección
AlertMonitoringExperience.jsx:249 (misma fórmula)  ← card → alertContext
ExistingModuleRouteResolver.js:95-99               ← state { alertContext }
DynamicForm.jsx:205-216                            ← COMPLETION_INTENT con alertId
CompletionBridge → OccurrenceLedger.specificKeyFor  ← occurrence::forms:12:0::...
```

Todas las piezas del camino de completado usan la fórmula de la PROYECCIÓN, por lo que el
funcionamiento actual NO se rompe en la sesión de guardado (lo cual es el motivo de que el bug de
Sprint 279/280 (A=B=C) no haya reaparecido).

### 2.2 El problema real: DOS fuentes de identidad declaradas

- `rules.alertId` (expuesto por `useAlertRuntime`) proviene del ENROLLMENT:
  `ExplicitEnrollmentValidator.js:89` → `alertConfigIdOf` → `12:alert:0`
  (transportado en `deriveRulesFromBinding`, `useAlertRuntime.js:284`).
- `occurrence.alertId` proviene de la PROYECCIÓN: `forms:12:0`.

Un consumidor que compare `rule.alertId` con `occurrence.alertId` del mismo componente obtiene
**dos strings distintos**. El contrato documenta `alertConfigIdOf` como canónico
(`AlertConfigurationResolver.js:190-200`, DEC-261-06/DEC-263-11), pero la proyección y las cards
reimplementan su propia fórmula en lugar de importarla.

**Diagnóstico:** no es un corto en el camino de completado, pero sí es una **violación de SSOT**:
existen 2 implementaciones de la misma identidad. Sprint 282 debía "unificar el álgebra"; hoy NO se
ha ejecutado.

**Recomendación (para Sprint 282+):**
1. `OccurrenceProjection.alertIdOf` debe delegar en `alertConfigIdOf(resourceId, idx)` importado
   del Resolver (única autoridad), eliminando `OccurrenceProjection.js:160-162`.
2. `AlertMonitoringExperience.jsx:249` debe importar la misma función en lugar de reimplementarla.
3. Añadir un test de contrato: para `{id:12, slug:'x'}` y `idx=0`, resolver, enrollment, proyección
   y cards producen `12:alert:0`.

---

## 3. O1 — Arranque de una ocurrencia: NO existe concepto de "start" persistido

El ledger (`OccurrenceLedger.js`) **no registra starts**: registra SOLO completion signals
(`recordCompletion`, `:59-66`). La semántica de arranque es **100% temporal derivada**:

```text
parseAnchor(startDate/startTime) + cadenceMs(periodicity) → occurrenceWindowAt(now)
        └── OccurrenceSchedule.js:29-45, 51-57, 79-90
```

- La ventana actual se calcula como `startsAt = anchor + (sequence-1)*cadence`
  (`OccurrenceSchedule.js:87-89`); `sequence = floor((now-anchor)/cadence) + 1`.
- `OccurrenceProjection.js:94-103` rechaza candidatos sin anchor (`isProjectableOccurrenceCandidate`,
  HF1); la proyección **nunca fabrica** una ventana sin `startDate`.
- El ledger SOLO matchea completions dentro de la ventana `[startsAt, dueAt)`
  (`OccurrenceLedger.js:89-97`; `CompletionSignal.js:114-126`).

### 3.1 Riesgo: la ventana depende del momento de lectura

Como el "start" es derivado de `now` en cada llamada a `occurrenceWindowAt`, el desplazamiento de
la ventana activa depende del instante de consulta. Si el usuario guarda un formulario fuera de la
ventana esperada (reloj del dispositivo, diferencia de huso, edición de `startDate` en frío), la
resolución determinística puede seleccionar una ocurrencia distinta de la intencional. Esto NO es
un bug nuevo (diseño certificado OCC-CERT-12), pero explica la necesidad de la recomendación
heredada de la auditoría previa:

**Recomendación (Sprint 282+):** cuando una ocurrencia es creada por primera vez (proyección con
`completion === null` y sin señales previas), proponer al usuario el "start" de la ventana previa
(`startsAt - cadence`, la `startO2` de la ocurrencia anterior) para que la valide/corrija ANTES de
que el ledger registre el completion. El ledger no puede emitir esta validación por sí solo porque
no persiste starts — es una decisión de la capa de aplicación sobre la proyección, no del store.

---

## 4. O2 — Enlace ocurrencia ↔ registro real: CONSISTENTE (vía `form_id`)

La ocurrencia de un formulario usa `resourceId = resource.id` (id del FORM)
(`OccurrenceProjection.js:105-106, 164-166`).

Los registros reales (`sgc_form_responses`) embeben el form en su proyección:

```text
sgc_form_responses (id, status, created_at, ...) + sgc_forms!inner (id, name, module_id)
        └── dynamicService.getModuleResponses → dynamicService.js:370-395
```

El enlace entre una ocurrencia y sus registros es:

```text
occurrence.resourceId (form.id)  ≡  record.sgc_forms.id  ≡  form_id  (fila de sgc_form_responses)
```

- El crítico de cumplimiento de `DynamicRecordsView` cuenta por `record.sgc_form_fields`/valores y
  no por `form_id`, pero la AGREGACIÓN por formulario sí coincide con la identidad de ocurrencia.
- **Veredicto:** el mapa `occurrence → registros` es correcto y verificable; no hay desalineación
  de identidad entre proyección y registros reales (a diferencia del documento, ver P4).

---

## 5. P2 — AlertWorkspace: HUÉRFANO EN DOS NIVELES (hallazgo nuevo confirmado)

### 5.1 Paquete `workspace-alert/` (Sprint 204) — 100% dead code

Sus 5 archivos se importan únicamente entre sí (proveedor→adaptador, boundary→contrato,
index→re-export). **Cero importadores externos** en todo `src/` (el string `workspace-alert`
aparece solo dentro del propio paquete, 8 coincidencias). El propio doc Sprint 209 lo declara
"orfanado, no conectado al camino runtime".

### 5.2 Superficie `workspace` de `useAlertRuntime` — computada, no renderizada

```text
useAlertRuntime.js:447-455  →  AlertCapability.workspace({...})  →  ViewModel certificado
   └── NINGÚN componente la destructura
   └── AlertMonitoringExperience.jsx:443-451 consume { existing } + projectConfigCards,
       NO el ViewModel
```

- El ViewModel `workspace` se computa en cada render (`:447-455`) y se expone en `:527`, pero los
  5 call-sites del hook usan `visibility`/`dashboard`/`existing`. Confirmado por Sprint-281.md:623,826.
- El stack `AlertWorkspaceBuilder → Resolver → ViewModel` es una pila paralela sin render.

**Decisión pendiente (heredada):** consumirlo como proyección de las vistas reales o eliminarlo.

---

## 6. P3 — Navegación: sin rutas rotas ni duplicadas; KPI DUPLICADO en `/dashboard` (hallazgo nuevo)

### 6.1 Ruteo

- Única fuente de rutas: `src/App.jsx:20-66` (`BrowserRouter`, `basename`). NO usa
  `createBrowserRouter`/`RouterProvider` (0 hits).
- **NO existe ninguna ruta fija de alertas** (`/alertas`, `/monitoring`, `/workspace`, etc.).
  La experiencia `AlertMonitoringExperience` se monta como sub-tab `operational-experiences`
  dentro de `/:moduleSlug` (`App.jsx:58` + `DynamicModule.jsx:367-374` + registro en
  `enterprise-activation/index.js:42-126`).
- Todos los `navigate()`/`Link`/`NavLink` apuntan a rutas declaradas o a los catch-all
  (`:moduleSlug`, `:moduleId`, `modulo/:moduleSlug/:formSlug`) — **sin enlaces rotos**.
- **Riesgo latente:** rutas inexistentes de alertas caen silenciosamente en el catch-all
  `:moduleSlug` → `DynamicModule` "Módulo no encontrado" (sin crash, sin protección).

### 6.2 Hallazgo nuevo — KPI "Alertas Activas" duplicado en `/dashboard` con DOS fuentes

| Fuente | Valor | Ubicación | Cálculo |
|--------|-------|-----------|---------|
| Dashboard legacy | `metrics.critical` | `Dashboard.jsx:225` | `useDashboardMetrics` → `dashboardCalculations.js:30-52` (`isResponseCritical` propio) |
| Facade certificado | `alertMetrics.activeAlerts` | `Dashboard.jsx:297-336` (panel "Alertas Operacionales") | `useAlertRuntime().dashboard` → `AlertDashboardDataProvider` |

La misma etiqueta "Alertas Activas" se renderiza DOS veces en la misma URL con DOS orígenes de
cálculo. Los valores pueden divergir (métricas legacy vs runtime de alertas).

**Recomendación:** el KPI legacy (`Dashboard.jsx:225`) debe consumir `alertMetrics` (o eliminarse);
una única fuente para el panel.

### 6.3 Página huérfana

`src/pages/Traceability.jsx` no está importada en `App.jsx` activo; solo existe en
`App.jsx.bak:38-41` (backup sin usar). `dynamicService.js:366` (`alertasActivas: 0` hardcodeado)
sigue desconectado del runtime (heredado de Sprint 281 §17.7).

---

## 7. P4 — Frontera documental y residencia ISO

### 7.1 La frontera de cumplimiento es el REPOSITORIO (confirmado)

- `OccurrenceProjection.RESOURCE_KIND = { forms: 'dynamicForms', repositories: 'documentRepository' }`
  (`OccurrenceProjection.js:48-51`); itera SOLO `['forms','repositories']` (`:80`).
- La configuración vive en `sgc_document_repositories.alert_config`; el `resourceId` de la
  ocurrencia = id del repo (`:105-106,164-166`).
- **Documento individual (sgc_records): NO es frontera.** No tiene `alert_config`, no tiene FK a
  repo/categoría (vinculación por strings `module`/`type`, `ModuleDocumentViewer.jsx:120-127`).
  Un documento solo NO genera regla ni ocurrencia (rechazado por `ExplicitEnrollmentValidator`
  E1–E4). Los documentos **no participan en `COMPLETION_SIGNAL`** (no emiten eventos de completion;
  Sprint-255.md:48 lo documenta).
- Categoría (`sgc_document_repository_categories`, DDL SQL_SPRINT_43_2) está persistida con
  `id`+`category_key` UNIQUE y es la frontera recomendada para el CONSUMIDOR (herencia Sprint 281
  §17.6/H5), pero la reancla de configuración a Categoría requiere auditar `sgc_records`/FK antes.

### 7.2 Residencia / certificación ISO en documentos — PENDIENTE (no señalada)

- **Sprint-272 es AUDIT ONLY** y no contiene campos de residencia/certificación.
- `sgc_records` solo tiene `module, type, name, file_url, storage_path, created_by`
  (AUDIT_43_signature-field.md:9); repositorios solo `slug, name, description, module_slug,
  icon_key, is_active`. **Sin campos `owner`/certificación.**
- Referencias ISO: RN-70/71/72 (`business_rules.md:177`) en estado **Planificada**; ISO 9001 es
  objetivo futuro del roadmap (`technical_roadmap.md:456`, Fase E).
- **Conclusión:** residencia documental por macroproceso para certificación ISO = **área pendiente
  sin implementar**, no un hallazgo de regresión.

---

## 8. Resumen de hallazgos

| ID | Hallazgo | Estado | Severidad | Recomendación |
|----|----------|--------|-----------|---------------|
| F1 | Divergencia `alertId` (resolver `12:alert:0` vs proyección/cards `forms:12:0`) | **CONFIRMADO** (vigente) | **ALTA** | Unificar en `alertConfigIdOf` + test de contrato (Sprint 282 H1) |
| F2 | Workspace: paquete `workspace-alert/` dead code + ViewModel `workspace` sin consumidor UI | **CONFIRMADO** | MEDIA | Consumir o eliminar (Sprint 281 H3) |
| F3 | KPI "Alertas Activas" duplicado en `/dashboard` con 2 fuentes | **NUEVO** | MEDIA | Consolidar en `alertMetrics` |
| F4 | `Traceability.jsx` huérfana + `alertasActivas:0` hardcodeado | **CONFIRMADO** | BAJA | Reintroducir o eliminar; conectar KPI al runtime |
| F5 | Residencia ISO documental no implementada | **PENDIENTE (no regresión)** | — | Roadmap + RN-70/71/72 |

---

## 9. Veredicto

```text
SPRINT 283 — AUDIT ONLY · 0 cambios

VERIFICADO (consistencia interna del camino de completado):
  • O1  Arranque = derivación temporal pura (OccurrenceSchedule.js:79-90); ledger NO persiste starts
  • O2  Ocurrencia ↔ registro real = vía form_id (consistente, dynamicService.js:370-395)
  • P3  Sin rutas rotas ni duplicadas de alertas (App.jsx:20-66; tab en :moduleSlug)

CONFIRMADO como vigente:
  • P0/F1  Divergencia del álgebra de alertId (resolver vs proyección/cards)
  • P2/F2  AlertWorkspace huérfano (2 niveles)
  • P4/F5  Frontera = REPOSITORIO; residencia ISO documental pendiente

NUEVOS hallazgos:
  • F3  KPI "Alertas Activas" duplicado en /dashboard (Dashboard.jsx:225 vs :302)
  • F4  Traceability.jsx huérfana (solo App.jsx.bak)

Riesgo latente:
  • Rutas inexistentes de alertas caen en el catch-all :moduleSlug (sin protección)

ACCIÓN RECOMENDADA (Sprint 282/284, fuera de este sprint):
  H1  Unificar alertIdOf → alertConfigIdOf (+ test de contrato)
  H2  go-to-document: documentId del documento real/categoría (heredado)
  H3  Consumir occurrences en DynamicRecordsView/ModuleDocumentViewer; decidir workspace
  H3b  Consolidar KPI "Alertas Activas" en alertMetrics
  Civilizar el arranque: proponer startO2 de la ocurrencia previa antes del completion

VERDICT: SPRINT 283 — AUDIT COMPLETE · FINDINGS CONFIRMED
Siguiente: Sprint 282/284 — Implementación (unificación identidad, consumo de proyección,
           consolidación de KPIs, decisión de workspace).
```
