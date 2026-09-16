# Sprint 293 — Category Alert Configuration Authority Audit

**Branch:** `release/stable-sprint79`
**Modo:** AUDIT ONLY · FORENSIC ARCHITECTURAL DISCOVERY · NO IMPLEMENTATION
**SSOT:** `docs/Sprint-293.md`
**Dependencias:** Sprint 284 · 285 · 288 · 289 · 290 · 291 · 292
**VERDICT: AUDIT COMPLETE · READY FOR CONTROLLED CORRECTION**

---

## 1. Respuesta a la pregunta arquitectónica central

> ¿El dominio Alert ya está preparado para `resourceKind = documentCategory` como
> recurso válido, o está estructuralmente limitado a `dynamicForms` y `documentRepository`?

**El dominio de config/identidad/enrollment/occurrence ES genérico** (`resourceKind` y
`resourceId` son cuerdas opacas derivables por la autoridad existente), **pero el runtime
de proyección y la capa de configuración/persistencia tienen restricciones estructurales
concretas** que hoy impiden `documentCategory`.

**NO** basta con cambiar la cuerda `'documentRepository'` → `'documentCategory'`. Hay **5
puertas concretas** que hoy bloquean la categoría (sección 4). Ninguna es una restricción de
identidad; todas son ampliables de forma controlada sin tocar el contrato de occurrence.

**Escenario final:** híbrido **A (Configuration)** + **B (Runtime/Projection)**. NO es C
(persistencia) ni D (identidad).

---

## 2. Estado actual (CURRENT) — autoridad de repositorio

```
Configuración (DocumentRepositoriesAdmin / AlertConfigurationPanel)
      │  resourceKind='documentRepository', resourceId=repository.id
      ▼
Persistence → sgc_document_repositories.alert_config (write via updateRepository)
      ▼
Resolver (resolveResourceAlertCollection/envelope — lectura SOLE del metadata)
      ▼
Enrollment (evaluateAlertEnrollments — E1..E4, genérico)
      ▼
OccurrenceProjection (RESOURCE_KIND.repositories='documentRepository')
      ▼
Estado visual anclado a repository.id
      └── ModuleDocumentViewer: cada categoría "hereda" el estado de su repository_id
          (repositoryAlertStates.get(c.repository_id)) — SIN identidad category en alert
```

El estado de alerta vive **en el repositorio**; las categorías **heredan** el mismo estado a nivel
de presentación (Sprint 291). Ninguna categoría posee configuración ni identidad de alerta propia.

---

## 3. F1 — Modelo `Repository → Category`

| Aspecto | Hallazgo | Evidencia |
|---|---|---|
| Tabla categoría | `sgc_document_repository_categories` | `documentRepositoriesService.js:156` |
| Relación | `repository_id` (FK) → repositorio; 1 repositorio → N categorías | `documentRepositoriesService.js:158` |
| Identidad canónica | `id` (PK UUID) **estable** + `category_key` (clave de negocio estable) | `mapCategoryRow`, `documentRepositoriesService.js:35-49` |
| Categoría ← repositorio | `getCategories(repositoryId)`, orden `sort_order` | `documentRepositoriesService.js:152-164` |
| Categoría → propietario | `category.repository_id` + `getRepositoryById(repository_id)` | `documentRepositoriesService.js:166-177` |
| `alert_config` en categoría | **NO existe**: `mapCategoryRow` no la mapea; `updateCategory` no la escribe | `documentRepositoriesService.js:35-49,202-223` |
| ¿resourceId usable? | **SÍ** — `category.id` es PK estable; encaja con `id ?? slug` del Resolver | ver F5 |

**Conclusión F1:** `category.id` es suficientemente estable para ser recurso de alerta. No se
requiere identidad alternativa. La navegación categoría→repositorio y repositorio→categorías ya
existe (no se necesita lógica paralela para resolver el propietario).

---

## 4. F2 / F3 — Configuration + clasificación de referencias

**Punto de configuración actual (2):**
- Formularios: `src/pages/Configuration.jsx:557` → `AlertConfigurationPanel resourceKind="dynamicForms"`.
- Repositorio: `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx:769` →
  `AlertConfigurationPanel resourceKind="documentRepository" resource={alertConfigTarget}`.
  **No existe acción "Configurar alerta" por categoría** (las categorías solo tienen alta/edición).

**El contenedor de UI es genérico:** `AlertConfigurationPanel.jsx:65` documenta `resourceKind`
como *"optional, display label only"*. El Panel utiliza `loadCollection(resource)` /
`saveCollection({ resource, formStates })` con el **resource row** y el **port**; no decide
backend. → El refactor de UI NO es necesario para soportar categoría; solo se necesita invocarlo
con el row de categoría.

**Clasificación (F3) de TODAS las referencias `resourceKind / dynamicForms / documentRepository`:**

**A — Dominio (define qué puede consumir Alert; algunas ENFORCED):**
| Archivo | Línea | Rol |
|---|---|---|
| `AlertConfigurationMetadata.js` | 61-64 | SSOT descriptivo `resourceKinds=[dynamicForms,dynamicRecords,documentRepository]` |
| `AlertConfigurationContract.js` | 17-21 | `supportedSources` (3) — **ENFORCED** por binding y rule descriptor |
| `ExistingOperationalSourceResolver.js` | 55 | `AlertConfigurationContract.supportedSources.includes(source)` — **GATE** |
| `AlertRuleDescriptor.js` | 20 | `supportedSources.includes(rule.source)` — **GATE** (descriptor válido) |

**B — Runtime (proyecta/cose outputs):**
| Archivo | Línea | Rol |
|---|---|---|
| `OccurrenceProjection.js` | 49-52, 81 | `RESOURCE_KIND={forms,repositories}` + itera `['forms','repositories']` — **restricción estructural** |
| `RuntimeBindingResolver.js` | 60-98 | `buildBoundAlertContexts` solo loops forms/records/documents |
| `RuntimeSourceIntegrityPolicy.js` | 198-209 | `classifyResource` solo 3; default `UNKNOWN` |
| `AlertConsumptionContract.js` | 52-93 | `CONSUMER_FIELDS` keys (3 + dashboard + workspace) |
| `runtime-visibility/index.js` | 40-44 | `RENDERER_BY_TARGET` (3 renderers) |
| `useAlertRuntime.js` | 180-208, 429-444 | `resolveResourceForAlert` (3) + visibility context keys (3) + default branch `documentRepository` en `deriveRulesFromBinding` (314-321) |

**C — Configuration (permite seleccionar el recurso):**
| Archivo | Línea | Rol |
|---|---|---|
| `AlertConfigurationPersistenceAdapter.js` | 73, 79-85 | `HANDLERS=[FORM,REPOSITORY]`; discriminadores estructurales `hasModuleId`/`hasRepositorySignature` — **GATE open/closed** |
| `documentRepositoriesService.js` | 106-135 | `updateRepository` escribe `alert_config`; `updateCategory` NO |
| `configurationPersistence.js` (legacy) | 34,48 | `formAlertConfigurationPersistence`/`repositoryAlertConfigurationPersistence` exigen resourceKind exacto |

**D — Presentación (solo muestra estado; genérico / leniente):**
| Archivo | Línea | Rol |
|---|---|---|
| `alertResourceState.js` | 157-231 | `projectResourceAlertState` — `resourceKind` es cuerda libre, sin gate; enriquecimiento vía envelope genérico |
| `AlertWorkspaceBuilder.js` | 21-25 | `SOURCE_TYPES` + fallback `{tipo: alert.source}` (leniente) |
| `ModuleDocumentViewer.jsx` | 104-110, 357 | ancla `documentRepository` + herencia por categoría (Sprint 291) |

**E — Legacy / dead code:**
| Archivo | Rol |
|---|---|
| `src/modules/experiences/alertConfigurationPersistence.js` | superficie LEGACY single-write (Sprint 242, "nunca UI") |
| `AlertConfigurationApplicationService.save` | deprecated single-write (Sprint 242) |

---

## 5. F4 — OccurrenceProjection y contrato

**Contrato (`OccurrenceContract.js`):** `resourceKind` es un campo de cuerda libre en los 12 keys
(line 22). `isAlertOccurrence` NO valida el valor de `resourceKind` → **no hay restricción
estructural en el VO**. `occurrenceIdOf(alertId, sequence)` (41) tampoco depende del kind.

**`OccurrenceProjection.js`:**
- `RESOURCE_KIND` (49-52) solo `{forms, repositories}` — categoría ausente.
- Iteración `for (const s of ['forms','repositories'])` (81) — las categorías **nunca** se proyectan.
- Si se añadiera `categories: 'documentCategory'` + iterar `['forms','repositories','categories']`,
  el mismo bucle (resolver → collection → parseAnchor → window → ledger → occurrence → contract)
  generaría occurrences de categoría **idénticas** a cualquier otro recurso, **sin que la proyección
  sepa qué es una categoría** (usa solo `resourceKind`/`resourceId` del row).

**Pregunta crítica del brief — SÍ:** la proyección **no necesita** saber nada de la categoría;
`resourceKind`+`resourceId` son suficientes. Extensión limpia.

**Ledger / Completion / Scheduler (genéricos, sin gate de kind):**
- `OccurrenceLedger.resourceKeyFor` → `resourceKind::resourceId::moduleId` (cuerda opaca).
- `CompletionSignal.js:116` → `occurrence.resourceKind !== signal.resourceKind` (comparación genérica).
- `CompletionBridge` / `DeterministicCompletionResolver` — operan sobre occurrences proyectadas (genérico).
- `OccurrenceSchedule` — pura temporal (sin recurso).

---

## 6. F5 — Identity Audit

**Regla vigente (sin álgebra local):** identidad de configuración = `alertConfigIdOf(resourceId, index)`
= `<resourceId>:alert:<index>` (`AlertConfigurationResolver.js:199-201`); identidad de occurrence =
`occurrenceIdOf(alertId, sequence)` (`OccurrenceContract.js:39-41`). Ambas derivan SOLO de
`resourceKind` + `resourceId` + `index`/`sequence`.

**Para una categoría:** `resourceId = category.id` (PK estable) → `alertId = "<category.id>:alert:<N>"`,
`occurrenceId = "<category.id>:alert:<N>:occ:<seq>"`. **No se inventa** `category:alert:...` ni
`category:occ:...`. La autoridad certificada produce las identidades tal cual. → **AC-05/AC-16**.

---

## 7. F6 — Resolver

`resolveResourceAlertEnvelope` (`AlertConfigurationResolver.js:225-249`) es **genérico**:
- `name/description/startDate/startTime/timezone` → `pickPresentationMetadata` del raw item.
- `enabled/priority/metadata` → VO via `resolveResourceAlertCollection` → `normalizeAlertConfiguration` → `createAlertConfiguration` (9 campos). Solo lee `resource.alertConfiguration ?? resource.alert_config` y `resource.id ?? resource.slug`.
- Recurso inexistente / sin config → `source:'default'` + defaults (nunca fabrica alerta); collection vacía en multi.
- **Requiere que el row de categoría porte `alertConfiguration`/`alert_config`** (hoy no lo lleva → resolvería a default). Una vez persistida la config en la fila de categoría, el envelope funciona **sin cambios**.

→ Arquitectónicamente puede soportar `resolveResourceAlertEnvelope({ resourceKind:'documentCategory', resourceId: category.id })` **sin un sistema nuevo**. El parámetro `resourceKind` no se usa en el Resolver (deriva `resourceId` del row).

---

## 8. F7 — Enrollment

`evaluateAlertEnrollments` / `evaluateAlertEnrollment` (`ExplicitEnrollmentValidator.js`) son
**genéricas**: aplican E1–E4 a cualquier recurso con `id/slug + alertConfiguration/alert_config`.
No hay `if (resourceKind === 'documentRepository')` ni `SUPPORTED_RESOURCE_KINDS` en el validador.

→ **Una categoría con metadata explícita + enabled ya ENROLLARÍA hoy** (si su row llevara
`alert_config`). El mismo pipeline la transportaría al runtime. La puerta NO está en enrollment;
está en que la categoría no puede llegar a portar al config (F8) ni a proyectarse (F4).

---

## 9. F8 — Persistence

- Persistencia actual = escribir el envelope `{ alertConfigurations: [...] }` **en el row del
  recurso** (columna `alert_config`) vía el handler del Adapter:
  - forms → `dynamicService.updateForm(id, { alert_config })`
  - repository → `documentRepositoriesService.updateRepository(id, { alert_config })`
- **`resourceId` es opaco**: cualquier id estable es válido. No hay restricción de esquema sobre
  el *valor* de `resourceId`.
- **`sgc_document_repository_categories` NO tiene columna `alert_config`** (no aparece en schema/RLS;
  `updateCategory` no la escribe). → El mínimo cambio de persistencia es: (a) columna `alert_config jsonb`
  en la tabla de categorías + (b) passthrough en `mapCategoryRow`/`updateCategory`, exactamente como
  `updateRepository`. RLS ya permite UPDATE por rol admin en la tabla de categorías
  (`rls_sgc_document_repositories_fix.sql:137-156`) → el write de configuración no choca con RLS.
- **NO se requiere** un sistema de persistencia nuevo ni una tabla dedicada.

---

## 10. F9 — Configuration UX Target

`AlertConfigurationPanel` (recursivo genérico) reutilizable. Punto conceptual correcto:

```
Configuración
├── Formularios dinámicos      (Configuration.jsx:557)
└── Repositorio documental
    ├── Repositorio            (DocumentRepositoriesAdmin.jsx:769)
    └── Categorías
        ├── Categoría A  →  [Configurar alerta]   (NUEVO — mismo Panel, resource=row categoría)
        ├── Categoría B  →  [Configurar alerta]
        └── Categoría C  →  (sin acción / sin alerta)
```

La categoría solo aporta **id / name / metadata** (su row). Nunca `Category → AlertService`; el
flujo sigue `Configuration → Alert Domain → Category resource`.

---

## 11. F10 / F12 — Desacoplamiento y regla de negocio

- La arquitectura permanece: `Configuration → Alert Domain → Runtime → OccurrenceProjection →
  Presentation (Formulario | Repositorio | Categoría)`. Categoría=recurso configurable, **sin lógica
  de alerta**. Nunca `Category → AlertLogic`, `Repository → AlertLogic`, `DynamicForm → AlertLogic`.
- Regla de negocio objetivo (F12): la alerta pertenece a la **categoría específica** (Categoría A→alerta A,
  B→alerta B, C→ninguna) sin afectar las demás; reemplaza conceptualmente la herencia del repositorio.
  La herencia (Sprint 291) queda como comportamiento **mientras** la categoría no tenga config propia;
  nunca se "elimina Repository→Category" antes de que exista la alternativa por categoría.

---

## 12. F11 — Decisiones de escenario

| Escenario | Resultado |
|---|---|
| A — Dominio genérico (solo Configuration limita) | **PARCIAL**: dominio genérico ✓, pero runtime de proyección (F4) y binding (F3-B) también limitan |
| B — Restricción en Runtime/Projection | **SÍ** — `OccurrenceProjection.RESOURCE_KIND` + iteración; `RuntimeBindingResolver`/`RuntimeSourceIntegrityPolicy`/`useAlertRuntime`/Contract gates |
| C — Restricción en persistencia | **Blanda** — column `alert_config` ausente en categorías; esquema no lo impide; RLS ya lo permite (UPDATE admin) |
| D — Identidad insuficiente | **NO** — `category.id` estable |

**Conclusión:** `YES` reutilizando el pipeline actual, con corrección controlada en **Configuration +
Runtime/Projection** (escenario A+B). Sin nuevo sistema, sin identidad local, sin modificar contrato
de occurrence.

---

## 13. Mínimo cambio para `Category → Alert` (Sprint 294, SOLO definido — no implementado aquí)

**¿Puede hacerse reutilizando el pipeline actual?** → **YES**.

| # | Archivo | Cambio mínimo | Contrato intacto |
|---|---|---|---|
| 1 | `src/services/documentRepositoriesService.js` | `mapCategoryRow` passthrough `alertConfiguration`; `updateCategory` escribe `alert_config` | Servicio existente |
| 2 | DB `sgc_document_repository_categories` | adicionar columna `alert_config jsonb` (schema) | — |
| 3 | `src/modules/experiences/AlertConfigurationPersistenceAdapter.js` | registrar `CATEGORY_HANDLER` (discriminador `repository_id`/`category_key`, sin `module_id`/`module_slug`) → `updateCategory` | Panel/Form/AppService **intactos** (freeze 201R) |
| 4 | `src/core/capabilities/alert/occurrence/OccurrenceProjection.js` | `RESOURCE_KIND.categories='documentCategory'` + iterar `['forms','repositories','categories']` | VO/contrato/schedule/ledger intactos |
| 5 | `src/core/capabilities/alert/runtime-binding/*` | `SOURCE_KEYS` + `buildBoundAlertContexts` loop categorías (source=`documentCategory`) + `classifyCategory` + `RuntimeSourceIntegrityPolicy` rama | policy genérica intacta |
| 6 | `src/hooks/useAlertRuntime.js` | `resolveResourceForAlert` rama `documentCategory`; rama en `deriveRulesFromBinding`; visibility context key | hook flujo intacto |
| 7 | Contratos listas | `AlertConfigurationContract.supportedSources` / `AlertConfigurationMetadata.resourceKinds` / `AlertExperienceResolver.SUPPORTED_EXPERIENCE_TARGETS` / (opcional) `AlertConsumptionContract.CONSUMER_FIELDS` + `runtime-visibility` renderer | contratos aditivos |
| 8 | `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx` | acción "Configurar alerta" por categoría → mismo `AlertConfigurationPanel` con `resource=row categoría` | Panel intacto |
| 9 | `src/modules/documentViewer/ModuleDocumentViewer.jsx` | (post-294) si categoría tiene estado propio, presentarlo; la herencia queda para categorías sin config | proyector intacto |

**Contratos que permanecen intactos:** `OccurrenceContract` (12 campos), `OccurrenceLifecycle`,
`OccurrenceSchedule`, `CompletionSignal`, `OccurrenceLedger`, `CompletionBridge`,
`DeterministicCompletionResolver`, `AlertConfiguration` VO (9 campos) + MetadataNormalizer +
Mapper + Validation, `ExplicitEnrollmentValidator` (E1–E4), `AlertConfigurationResolver`,
`alertResourceState` (proyector de presentación), ApplicationService y Panel/Form (freeze 201R).

**Configuración (mínimo):** solo el registro abierto de un nuevo handler en el Adapter + passthrough
de escritura por categoría. Sin cambiar Panel/Form/AppService.

**Enrollment (mínimo):** ninguno (ya genérico).

**Resolver (mínimo):** ninguno (ya genérico).

**Projection (mínimo):** 1 mapa + 1 iteración (ver #4).

---

## 14. Verificación de aceptación de la auditoría (F13)

| AC | Criterio | Resultado |
|---|---|---|
| AC-01 | Identidad de Category identificada | **PASS** — `id` (PK UUID) + `category_key` |
| AC-02 | Relación Repository → Category documentada | **PASS** — `repository_id`, getCategories/getCategoryById/getRepositoryById |
| AC-03 | Punto actual de configuración identificado | **PASS** — DocumentRepositoriesAdmin:769 / Configuration:557 |
| AC-04 | Persistencia actual auditada | **PASS** — write en row del recurso (`alert_config`); categoría sin columna |
| AC-05 | resourceKind auditado | **PASS** — 3 sources + 2 gates enforced (binding, rule descriptor) |
| AC-06 | resourceId auditado | **PASS** — opaco; cualquier id estable; category.id encaja |
| AC-07 | Enrollment auditado | **PASS** — genérico (E1–E4), sin gate de kind |
| AC-08 | OccurrenceProjection auditada | **PASS** — única restricción: `RESOURCE_KIND` + iteración `['forms','repositories']` |
| AC-09 | Resolver auditado | **PASS** — `resolveResourceAlertEnvelope` genérico |
| AC-10 | Completion auditado | **PASS** — kind-agnóstico (genérico) |
| AC-11 | Lifecycle auditado | **PASS** — clasifica windows/completion, sin kind |
| AC-12 | Scheduler auditado | **PASS** — puramente temporal |
| AC-13 | Configuration restrictions identificadas | **PASS** — Adapter handlers + `supportedSources` + `updateCategory` sin passthrough |
| AC-14 | Repository inheritance identificado | **PASS** — `ModuleDocumentViewer` ancla `documentRepository`; categorías heredan de `repository_id` |
| AC-15 | Posibilidad de documentCategory determinada | **PASS** — YES (escenario A+B), dominio genérico |
| AC-16 | No se crea identidad nueva | **PASS** — `resourceKind + resourceId + index/sequence` existentes |
| AC-17 | No se crea AlertCategory | **PASS** |
| AC-18 | No se crea CategoryAlert | **PASS** |
| AC-19 | No se crea nuevo Store | **PASS** |
| AC-20 | No se modifica Runtime | **PASS** (293: solo auditoría) |
| AC-21 | No se modifica Persistence | **PASS** (293: solo auditoría) |
| AC-22 | No se modifica Schema | **PASS** (293: solo auditoría; 294 sí requerirá columna) |
| AC-23 | No se modifica Completion | **PASS** |
| AC-24 | No se modifica OccurrenceProjection | **PASS** (293) |
| AC-25 | No se modifica UI | **PASS** (293) |
| AC-26 | Se determina el mínimo cambio necesario | **PASS** — sección 13 |
| AC-27 | ¿Puede eliminarse Repository → Category? | **PASS** — la herencia puede sustituirse por config por categoría cuando exista; no se elimina antes de tener alternativa |
| AC-28 | Sprint 294 definido con evidencia suficiente | **PASS** — se define Sprint 294 (CONTROLLED CHANGE) con la lista de archivos |

---

## 15. STOP CONDITIONS

| STOP | Estado |
|---|---|
| Category sin identidad estable | **NO DISPARADO** — `id` PK estable |
| documentCategory requiere identidad nueva | **NO DISPARADO** — autoridad existente |
| Requiere modificar Completion | **NO DISPARADO** — genérico |
| Requiere modificar OccurrenceLifecycle | **NO DISPARADO** — genérico |
| Requiere nuevo sistema de persistencia | **NO DISPARADO** — column + passthrough en servicio existente |
| Acoplar Category al Alert Runtime | **NO DISPARADO** — categoría = recurso, sin lógica de alerta |
| Modificar Repository para administrar alertas | **NO DISPARADO** — solo passthrough de escritura de configuración |

---

## 16. Conclusión final

```
CURRENT                         TARGET
Configuration                   Configuration
  ↓                               ↓
Repository Alert                 Category Alert
  ↓                               ↓
Repository                       Alert Domain
  ↓                               ↓
Categories inherit alert         OccurrenceProjection
                                   ↓
                                 Category
```

**¿Puede hacerse reutilizando el pipeline actual?** → **YES** (escenario A+B).

**Restricciones arquitectónicas que hoy lo impiden (todas ampliables):**
1. `OccurrenceProjection.RESOURCE_KIND` + iteración `['forms','repositories']` (runtime proyección).
2. `AlertConfigurationPersistenceAdapter` sin handler de categoría + `updateCategory` sin `alert_config`.
3. Contrato `supportedSources`/`resourceKinds`/`SUPPORTED_EXPERIENCE_TARGETS` (3 sources).
4. `RuntimeBindingResolver`/`RuntimeSourceIntegrityPolicy`/`useAlertRuntime` sin rama `documentCategory`.
5. Columna `alert_config` ausente en `sgc_document_repository_categories`.

**Mínimo camino `Repository → Alert` a `Category → Alert`:** sección 13 (9 puntos, todos locales).
Alert permanece como **dominio independiente y desacoplado** de los recursos; Categoría solo aporta
id/name/metadata.

**VERDICT: SPRINT 293 — AUDIT COMPLETE · READY FOR CONTROLLED CORRECTION**
(NO IMPLEMENTATION)
