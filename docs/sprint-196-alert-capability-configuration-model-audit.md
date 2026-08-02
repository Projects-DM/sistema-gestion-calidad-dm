# Sprint 196 — Alert Capability Configuration Model Audit (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — ALERT CONFIGURATION MODEL AUDIT
- **Type:** Functional Audit · Metadata Audit · Existing Capability Analysis
- **Impact:** Alert Capability · Operational Experiences · Dynamic Forms · Document Repository · Metadata Configuration
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Tipo de sprint:** **100% AUDITORÍA** — ninguna modificación funcional.

---

## 1. Hallazgos de la auditoría (estado actual)

### 1.1 Modelo de reglas existente (`AlertRuleDescriptor.js` L12–59)

La única estructura de regla hoy es:

```js
{ source, formId|recordType|documentId,
  condition: { field, operator, value },
  priority, priorityLabel, message, active }
```

- **Prioridades** (`AlertPriorityPolicy.js` L10–15): `low | medium | high | critical` → Baja/Media/Alta/Crítica.
- **`active`** existe en el descriptor de regla, pero `deriveRulesFromBinding` (useAlertRuntime L129–175) lo fuerza siempre a `true`: **no existe ningún `enabled=false` por recurso**.
- **No existen** `periodicity`, `expiration`, `risk`, `thresholds`, `gracePeriod`, `automaticClose`, `repeatPolicy`, `notification`.

### 1.2 El vencimiento existe como código muerto

`AlertDocumentRuntimeAdapter.js` L62 y `AlertRecordRuntimeAdapter.js` L63 leen `request.expiryInDays`, pero **ningún llamador lo alimenta** (grep: solo aparece en esos 2 archivos). La rama `expiring` de los adapters **nunca se activa**. El estado real de cada alerta proviene únicamente de la prioridad del descriptor.

### 1.3 Fuentes de metadata disponibles (no existe "Metadata Factory" como componente nombrado)

| Fuente | Columnas/estructura | ¿Carrier de config? |
|---|---|---|
| `sgc_forms` | id, name, slug, module_id, engine_type, description, roles_allowed, is_active, created_at | ❌ Sin columna JSON de configuración |
| `sgc_form_fields` | field_type, label, options (**JSON**: min/max, etc.) | ✅ `options` es el carrier de metadata por campo existente |
| `sgc_document_repositories` | slug, name, description, module_slug, icon_key, is_active | ❌ Sin columna JSON de configuración |
| `sgc_document_repository_categories` | repository_id, sort_order, ... | ❌ |
| `sgc_modules` | id, slug, state, visible, is_active, ... | ❌ (metadatos de módulo, no de alerta) |
| Capability contracts (manifest/package/experiencia) | `metadata` (name, description, icon) | ⚠️ Metadata de presentación, no de regla |

**Conclusión:** la plataforma posee una capa de metadata distribuida (columnas + `options` JSON + metadata de capability/experiencia), pero **no existe un "Metadata Factory" centralizado ni un carrier de configuración de alertas**. El modelo actual del Runtime es de **detección de recursos, no de reglas**.

---

## 2. Certificación A1–A12

### A1 — Recursos candidatos a generar alertas
**AMBOS: Formularios y Repositorios** (ya reconocidos por el Runtime: `dynamicForms`, `dynamicRecords`, `documentRepository`). No existe ningún recurso que el Runtime ignore hoy; la selección es implícita (todo recurso visible genera regla).

### A2 — ¿La generación de alertas debe ser opcional?
**SÍ — DEBE certificarse como obligatorio.** Hoy NO es opcional (`active:true` forzado). El modelo requerido es por-recurso: `enabled: false` en el Formulario B ⇒ el descriptor no incluye la alerta ⇒ nunca aparece (Caso 1). Es la extensión natural del campo `active` ya existente en `AlertRuleDescriptor`.

### A3 — ¿Dónde debe vivir la configuración? (único dueño)
Auditadas las 4 opciones:

| Candidato | Veredicto |
|---|---|
| **Metadata Form** (`sgc_forms.alert_config` JSON) | ✅ **DUEÑO para formularios/registros** — configuración por recurso, junto al recurso |
| **Metadata Repository** (`sgc_document_repositories.alert_config` JSON) | ✅ **DUEÑO para repositorios documentales** — vencimiento por repositorio |
| Metadata Capability | ❌ **RECHAZADA** — la capability declara *disponibilidad*, no reglas por recurso |
| Metadata Module | ❌ **RECHAZADA** — haría la alerta global al módulo (viola A9) |

**Único dueño (categoría): la metadata del RECURSO.** Formularios → `sgc_forms`, Repositorios → `sgc_document_repositories`, ambos interpretados por **un único resolver** (`AlertConfigurationResolver`, existente). Nunca Module ni Capability.

### A4 — Parámetros oficiales de una alerta (certificados)
| Parámetro | Tipo | Rol |
|---|---|---|
| `enabled` | boolean | Activa/desactiva la alerta del recurso (Caso 1, 6) |
| `periodicity` | `{ amount, unit }` | Frecuencia del recurso (A5) |
| `expiration` | `'none' \| 'recurring' \| 'fixed'` | Política de vencimiento (A6) |
| `risk` | `{ model, thresholds }` | Modelo de severidad (A7) |
| `priority` | low/medium/high/critical | Escala la alerta (existente) |
| `notification` | `{ channel, recipients }` | Canal de notificación |
| `gracePeriod` | `{ amount, unit }` | Tolerancia tras el vencimiento antes de escalar |
| `automaticClose` | boolean | Cierre automático al diligenciar el recurso (Caso 8) |
| `repeatPolicy` | `'once' \| 'repeat'` | Re-emisión o evento único |

### A5 — Modelo de periodicidad (certificado)
Unidad: `hours | days | weeks | months | years` + `'once'` (evento único).
Mapeo operacional (coherente con los casos): día=24 h, semana=7 d, mes=mes calendario (Caso 4 ≈30 d), año=año calendario (Caso 5 ≈365 d), `once`=sin recurrencia.
Representación canónica: `{ amount: number, unit: 'hours'|'days'|'weeks'|'months'|'years' }` o `'once'`.

### A6 — Modelo de vencimiento (certificado)
```
nextDue  = baseDate + periodicity
baseDate = última fecha de evento del recurso   (para formularios: created_at del último registro)
         | fecha de creación/renovación          (para repositorios/documentos)
```
Con override explícito: si el registro/documento tiene campo `fecha_vencimiento` (ya existe en experiencias operacionales), ese valor **prevalece** (`expiration: 'fixed'`).
`overdue = now > nextDue`; `remaining = nextDue - now`; `elapsed = now - baseDate`.
El vencimiento actual (`expiryInDays` en los adapters) debe alimentarse desde `remaining`, hoy es código muerto.

### A7 — Modelo de severidad/riesgo (certificado)
Modelos auditados:

| Modelo | Compatible con diario/semanal/mensual/anual |
|---|---|
| **Absoluto** (Rojo/Amarillo/Verde por días) | ❌ **INCOMPATIBLE** — 12 h en un diario ≠ 12 h en un anual |
| **Porcentual** (consumido % del periodo) | ✅ **COMPATIBLE** |
| **Relativo** (restante % del periodo) | ✅ **COMPATIBLE** |

**Modelo oficial: RELATIVO (escala-independiente).** Riesgo derivado de la fracción del periodo:
- `restante > 50%` del periodo → **Verde** (normal)
- `restante ≤ 50%` y `> 25%` → **Amarillo** (monitoreo)
- `restante ≤ 25%` → **Rojo** (vencimiento inminente)
- `now > nextDue` → **Vencido/Crítico** (escala con `priority` del recurso, A4)

Este modelo es idéntico para horas, días, semanas, meses y años porque solo usa razones, no valores absolutos.

### A8 — Prevención de falsos positivos (certificada)
**Regla independiente del tiempo absoluto:** el riesgo se calcula con `overdueRatio = elapsed / period`, nunca con horas absolutas.
Ejemplo (formulario diario, period=24 h): si faltan 12 h → `elapsed=12h` → `remaining/period = 50%` → **Amarillo** (no Rojo). Solo escalaría a Rojo cuando `remaining ≤ 6 h` (25%) o al vencer. **No hay falso positivo por "12 horas sin registrar".** El `gracePeriod` (A4) añade tolerancia tras `nextDue` antes de escalar a crítico.

### A9 — ¿La alerta pertenece al recurso o al módulo?
**AL RECURSO** — `Módulo → Formulario/Repositorio → Configuración`. El Runtime ya liga por recurso (`formId`, `recordType`, `documentId`, `documentType`) y el Caso 1 exige `enabled=false` por formulario. **No** se certifica configuración general de módulo (haría imposible A2).

### A10 — Integración con la capa de metadata (Metadata → Runtime Resolver → Alert Runtime)
```
Metadata del recurso (sgc_forms.alert_config / sgc_document_repositories.alert_config)
        ↓
AlertConfigurationResolver (existente)  ← Runtime Resolver de reglas
        ↓
Alert Runtime (runtimeBinding → runtimeConsumption → descriptor)
        ↓
Dashboard (AlertDashboardDataProvider) · Alert Workspace (AlertMonitoringExperience)
```
Se reutiliza **íntegramente** la cadena existente. La configuración solo **alimenta** `request.rules` que hoy `deriveRulesFromBinding` sintetiza; en el próximo sprint, `deriveRulesFromBinding` leerá la metadata en vez de forzar valores. **Sin motores paralelos** (restricción: nunca `Dashboard → Alert Engine → Configuración`).

### A11 — Componentes consumidores (auditados)
`Alert Runtime` (primario, vía `AlertConfigurationResolver`) · `Dashboard` (métricas vía `AlertDashboardDataProvider`) · `Alert Workspace` (`AlertMonitoringExperience`) · `Repository` (vencimiento vía `AlertDocumentRuntimeAdapter`) · `Dynamic Forms/Records` (badges vía `AlertFormRuntimeAdapter`/`AlertRecordRuntimeAdapter`).

### A12 — Componentes que NO deben modificarse
`Runtime Engine` · `Runtime Binding` · `Runtime Visibility` · `Assignment Engine` · `DynamicModule` · `React Router` · `Capability Resolver` · `Workspace` · servicios de datos de formularios/registros. **No crear:** Alert Engine paralelo, Metadata paralela, Configuration Engine, Scheduler nuevo, Providers nuevos.

---

## 3. Casos funcionales certificados (modelo esperado)

| Caso | Comportamiento certificado |
|---|---|
| **1. Formulario sin alertas** | `enabled=false` → la regla se excluye del descriptor → **nunca aparece** en Dashboard/Workspace |
| **2. Formulario diario** | `periodicity={1,'days'}`; riesgo relativo al periodo de 24 h; correcto en horas/días |
| **3. Formulario semanal** | `periodicity={1,'weeks'}` (7 d); mismo modelo relativo |
| **4. Formulario mensual** | `periodicity={1,'months'}` (≈30 d); mismo modelo relativo |
| **5. Repositorio documental** | `periodicity={1,'years'}`; documento vence a `fechaCreación + 1 año` |
| **6. Repositorio sin vencimiento** | `expiration='none'` → `enabled=false` efectivo → **nunca genera alertas** |
| **7. Formulario prioritario** | `priority='high'|'critical'` escala la severidad (Rojo/Vencido crítico) |
| **8. Formulario vencido** | `now > nextDue` → estado **Vencido/Crítico** automático (y `automaticClose` al diligenciar) |

---

## 4. Definition of Done (cumplido)

- ✅ Certificado el modelo oficial de configuración (A1–A12).
- ✅ Identificado el dueño único: **metadata del recurso** (Form/Repository), nunca Module/Capability.
- ✅ Definidos los parámetros oficiales de una alerta (A4, 9 parámetros).
- ✅ Certificado el modelo de periodicidad (A5), vencimiento (A6), severidad (A7) y recursos (A1/A2).
- ✅ Certificada la regla anti falsos positivos (A8) — relativa, escala-independiente.
- ✅ Identificados los componentes consumidores (A11) y los no modificables (A12).
- ✅ Confirmada la integración por la cadena Metadata → Resolver → Alert Runtime (A10).
- ✅ **Sin modificaciones funcionales** (0 líneas de lógica).

## 5. Certification

```
LEVEL 4
ALERT CONFIGURATION MODEL AUDIT

Modelo de configuración ......... ✅ (A1–A12)
Dueño único .................... ✅ (Metadata del recurso)
Parámetros oficiales ........... ✅ (9 parámetros, A4)
Periodicidad ................... ✅ (hours|days|weeks|months|years|once)
Vencimiento .................... ✅ (baseDate + periodicity; override fixed)
Severidad ...................... ✅ (relativa, escala-independiente)
Anti falsos positivos .......... ✅ (overdueRatio, no tiempo absoluto)
Recursos que generan alertas ... ✅ (Formularios + Repositorios, opcional por recurso)
Consumidores ................... ✅ (Alert Runtime, Dashboard, Workspace, Repository, Dynamic Forms)
Integración Metadata Factory ... ✅ (Metadata → Resolver → Alert Runtime; sin motores paralelos)
0 modificaciones funcionales ... ✅
```
