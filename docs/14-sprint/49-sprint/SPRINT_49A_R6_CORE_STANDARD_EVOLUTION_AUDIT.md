# SPRINT 49A-R.6 — Core Standard Evolution Audit (SSOT)

**Tipo:** Auditoría Arquitectónica (Evidence First)

**Objetivo principal de esta auditoría**
- Determinar **cómo funciona realmente** el Core Standard hoy.
- Identificar **qué identifica a un módulo**.
- Demostrar **por qué todos los módulos reutilizan la misma arquitectura mostrando información distinta**.
- Auditoría de **reutilización**, **acoplamiento** y **SRP** (exclusivamente `DynamicModule.jsx`).
- Determinar **el cuello de botella arquitectónico** que impide incorporar oficialmente Business Capabilities.
- Definir **qué elemento debe evolucionar primero** para permitir Business Modules sin duplicación.

**Restricciones (obligatorias)**
- Este sprint es **exclusivamente de auditoría**.
- **NO modificar código**.
- **NO proponer implementación** todavía.
- **No asumir** comportamientos.
- Todas las conclusiones deben estar **sustentadas por evidencia de código auditado**.
- Cuando una afirmación no pueda demostrarse desde el código: marcar como **Hipótesis Arquitectónica** o **Pendiente de Verificación**.
- Diferenciar claramente:
  - **Evidencia observada**
  - **Análisis**
  - **Conclusión**

> **Rango auditado (código)**: `src/App.jsx`, `src/pages/DynamicModule.jsx`, `src/pages/DynamicForm.jsx`, `src/components/DynamicRecordsView.jsx`, `src/services/dynamicService.js`, `src/components/DocumentModule.jsx`, `src/modules/documentViewer/ModuleDocumentViewer.jsx`, `src/pages/Dashboard.jsx`, `src/pages/Traceability.jsx`.

---

## FASE 1 — Inventario completo del Core Standard

### 1.1 Evidencia observada: Router que activa el Core
**Evidencia observada**
- `src/App.jsx`
  - `Route path=":moduleSlug" element={<DynamicModule />}`
  - `Route path="modulo/:moduleSlug/:formSlug" element={<DynamicForm />}`

**Análisis**
- El Core Standard se activa por **dos rutas**:
  1) `moduleSlug` ⇒ `DynamicModule`
  2) `moduleSlug + formSlug` ⇒ `DynamicForm`

**Conclusión**
- El Core hoy no existe como “motor único”; opera como **par orquestación UI + orquestación de datos** dividido entre `DynamicModule` (shell del módulo) y `DynamicForm` (shell del formulario).

---

### 1.2 Evidencia observada: cómo `DynamicModule` renderiza el módulo
**Evidencia observada**
- `src/pages/DynamicModule.jsx`
  - `const { moduleSlug } = useParams()`
  - `dynamicService.getModuleBySlug(moduleSlug)` ⇒ `modInfo`
  - `dynamicService.getFormsByModule(moduleData.id)` ⇒ `forms`
  - Renderiza tabs:
    - `forms` ⇒ lista de formularios y links a `/modulo/${moduleSlug}/${form.slug}`
    - `records` ⇒ `<DynamicRecordsView moduleId={modInfo.id} />`
    - `repositorio` ⇒ `<ModuleDocumentViewer moduleSlug={moduleSlug} />` condicionado por `isDocumentEnabled(moduleSlug)`
  - Regla hardcodeada:
    - `isDocumentEnabled = (slug) => ['mantenimiento','calidad','operaciones','gestion-documental','medicion-control'].includes(slug)`

**Análisis**
- El módulo es una identidad compuesta:
  - UI shell (tabs/encabezado) se decide por `moduleSlug`.
  - Los datos específicos del módulo se deciden por `modInfo` y `modInfo.id`.
  - Documentación repositorio se habilita por **lista fija de slugs** (acoplamiento explícito a `DynamicModule`).

**Conclusión**
- `DynamicModule` es el **contenedor principal** del módulo estándar (en la ruta `:moduleSlug`).

---

### 1.3 Identificación de “módulos estándar existentes” desde el código
> **Nota:** En este repo, la lista de módulos “de negocio” visibles en UI de dashboard está hardcodeada en `Dashboard.jsx`, pero el Core (`DynamicModule`) puede recibir cualquier `moduleSlug` y consultar a Supabase.

**Evidencia observada**
- `src/pages/Dashboard.jsx` define `modules = [...]` con paths:
  - `/operaciones`
  - `/trazabilidad`
  - `/medicion-control`
  - `/mantenimiento`
  - `/calidad`
  - `/gestion-documental`
  - `/configuracion`

**Análisis**
- El Core estándar es reutilizable por `DynamicModule` con cualquier slug; sin embargo, **en la práctica** el módulo también depende de:
  - existencia de registros en `sgc_modules` y `sgc_forms` (fetch por slug/id)
  - disponibilidad de repositorio documental (hardcode por slug en `DynamicModule`)

**Conclusión**
- Para esta fase, los “módulos estándar existentes” se toman como los slugs que:
  1) aparecen en el UI del sistema (Dashboard)
  2) y/o aparecen en la lista hardcodeada del repositorio documental.

---

### 1.4 Matriz comparativa (módulos estándar vs evidencia)

> **Campos requeridos por el sprint**
- ¿Qué archivo renderiza el módulo?
- ¿Qué componente actúa como contenedor?
- ¿Qué componentes reutiliza?
- ¿Qué componentes propios tiene?
- ¿Qué servicios consume?
- ¿Qué Runtime consume?
- ¿Qué metadata utiliza?
- ¿Qué recibe por `moduleSlug`?
- ¿Qué recibe por `moduleId`?

#### Tabla: módulos estándar

| Módulo (slug) | Archivo renderizador | Contenedor | Componentes reutilizados | Componentes propios | Servicios consumidos | Runtime consumido | Metadata utilizada | Recibe por moduleSlug | Recibe por moduleId |
|---|---|---|---|---|---|---|---|---|---|
| operaciones | `src/pages/DynamicModule.jsx` (ruta `:moduleSlug`) | `DynamicModule` | `DocumentModule`, `DynamicRecordsView`, `ModuleDocumentViewer` (si aplica), lista/link de formularios | `DynamicModule` (header/tabs/lista UI) | `dynamicService.getModuleBySlug`, `dynamicService.getFormsByModule` | **Desde `DynamicForm`** vía `runtimeActivationLayer.activate` (cuando se entra a un form) | `modInfo.name/description/slug`, `form.roles_allowed`, `form.slug`, `form.icon`, `formDef.engine_type` (en `DynamicForm`) | `moduleSlug` ⇒ `getModuleBySlug(slug)` y habilitación repo documental por hardcode | `modInfo.id` ⇒ `DynamicRecordsView` ⇒ `getModuleResponses(moduleId)` |
| calidad | `DynamicModule` | `DynamicModule` | igual | `DynamicModule` | `dynamicService.*` + repositorio en `ModuleDocumentViewer` | idem | idem | idem | idem |
| mantenimiento | `DynamicModule` | `DynamicModule` | igual | `DynamicModule` | idem | idem | idem | idem | idem |
| gestion-documental | `DynamicModule` | `DynamicModule` | `ModuleDocumentViewer` habilitado por hardcode | `DynamicModule` | `dynamicService.*` + repositorio documental | idem | idem | idem | idem |
| medicion-control | `DynamicModule` | `DynamicModule` | `ModuleDocumentViewer` habilitado por hardcode | `DynamicModule` | `dynamicService.*` + repositorio documental | idem | idem | idem | idem |
| trazabilidad | `src/pages/Traceability.jsx` (ruta explícita en `App.jsx`) **y** también podría caer en `DynamicModule` si se usa `:moduleSlug` fuera | `Traceability` (para rutas explícitas) | `DocumentModule`, lista de forms dinámicos (same `dynamicService`) | `Traceability` (submódulos hardcodeados + listado) | `dynamicService.getModuleBySlug('trazabilidad')`, `dynamicService.getFormsByModule(moduleData.id)` | **Runtime solo si se entra a `DynamicForm`** por cada form slug | `submodules.roles`, `form.roles_allowed`, `form.slug` | `'trazabilidad'` (hardcode en `Traceability`) | No usa `DynamicRecordsView` en lo mostrado |

**Evidencia observada adicional**
- `src/pages/Traceability.jsx`
  - Tiene `submodules` hardcodeados con `path` y `roles`.
  - Carga `moduleData = dynamicService.getModuleBySlug('trazabilidad')` y `formsData = getFormsByModule(moduleData.id)`.
  - Renderiza links a `/modulo/trazabilidad/${form.slug}`.

---

## FASE 2 — Identidad del módulo

### 2.1 Evidencia observada: dos módulos muestran info distinta con el mismo Core
**Evidencia observada**
- En `DynamicModule`:
  - El único input de identidad es `moduleSlug`.
  - `moduleSlug` se convierte a identidad operacional vía `dynamicService.getModuleBySlug(moduleSlug)`.
  - Luego `moduleId` (de `modInfo.id`) se usa en `DynamicRecordsView`.
- En `DynamicForm`:
  - La identidad operativa del formulario depende de `formSlug` (`dynamicService.getFormBySlug(formSlug)`), y el módulo se propaga por esa definición del form.
- En `ModuleDocumentViewer`:
  - La identidad del repositorio documental depende de `moduleSlug` en `documentRepositoriesService.getRepositories({ moduleSlug })`.

**Análisis**
- “Core igual” pero “datos distintos” se explica por el cambio de:
  - `moduleSlug` ⇒ cambia `modInfo.id`
  - `moduleId` ⇒ cambia el conjunto de respuestas (`sgc_forms.module_id = moduleId`)
  - `formSlug` ⇒ selecciona un form concreto ligado a un módulo (por definición en backend)
  - `moduleSlug` ⇒ repositorios documentales en `ModuleDocumentViewer`

**Conclusión**
- La identidad real del módulo, según el código, es el valor que atraviesa el sistema como **`moduleSlug` (entrada)** y se materializa como **`moduleId` (consulta de datos)**.

---

### 2.2 Responder con evidencia (por qué Operaciones solo ve formularios de Operaciones, etc.)

#### Pregunta: ¿Por qué Operaciones muestra únicamente formularios de Operaciones?
**Evidencia observada**
- `DynamicModule`:
  - `moduleData = dynamicService.getModuleBySlug(moduleSlug)`.
  - `formsData = dynamicService.getFormsByModule(moduleData.id)`.
- `dynamicService.getFormsByModule(moduleId)` hace `.eq('module_id', moduleId)` sobre `sgc_forms`.

**Análisis**
- Si `moduleSlug` es `/operaciones`, el `moduleData.id` corresponde al módulo de operaciones en `sgc_modules`.
- La lista de formularios se filtra por `sgc_forms.module_id = moduleData.id`.

**Conclusión**
- Operaciones ve únicamente formularios del módulo correcto porque el filtrado de `sgc_forms` usa `module_id` derivado de `moduleSlug`.

#### Pregunta: ¿Por qué Calidad muestra únicamente formularios de Calidad?
**Evidencia observada**
- Mismo mecanismo: `getModuleBySlug(moduleSlug)` y luego `getFormsByModule(moduleData.id)` con filtro `.eq('module_id', moduleId)`.

**Análisis**
- `moduleSlug='calidad'` ⇒ `moduleData.id` específico de calidad.
- Se listan solo `sgc_forms` con `module_id=moduleData.id`.

**Conclusión**
- Misma prueba por código que Operaciones.

#### Pregunta: ¿Por qué Historial muestra únicamente registros del módulo actual?
**Evidencia observada**
- `DynamicModule` en pestaña records: `<DynamicRecordsView moduleId={modInfo.id} />`.
- `DynamicRecordsView` llama `dynamicService.getModuleResponses(moduleId)`.
- `getModuleResponses(moduleId)` hace `.eq('sgc_forms.module_id', moduleId)`.

**Análisis**
- El set de registros está directamente filtrado por `sgc_forms.module_id = moduleId`.

**Conclusión**
- “Historial” (DynamicRecordsView) ve solo registros que pertenecen al `moduleId` del módulo actual.

#### Pregunta: ¿Por qué Repositorio muestra únicamente documentos del módulo actual?
**Evidencia observada**
- `DynamicModule` solo renderiza repositorio si `isDocumentEnabled(moduleSlug)` (lista hardcodeada) y `activeTab==='repositorio'`.
- `ModuleDocumentViewer` recibe `moduleSlug`.
- `ModuleDocumentViewer`:
  - `documentRepositoriesService.getRepositories({ moduleSlug })`
  - luego para cada categoría: `documentsService.getRecords(moduleSlug, c.category_key)`.

**Análisis**
- Los repositorios y records documentales se consultan con `moduleSlug`.

**Conclusión**
- Repositorio está filtrado por `moduleSlug` tanto en selección de repositorios como en obtención de documentos.

---

### 2.3 Determinar qué identifica realmente al módulo (sin asumir)

**Evidencia observada (posibles identificadores)**
- `moduleSlug` (entrada de `DynamicModule` y `ModuleDocumentViewer`).
- `moduleId` (derivado de `modInfo.id`, usado por `DynamicRecordsView`).
- En `DynamicForm`, el input de selección de form es `formSlug`.

**Análisis**
- El código no usa explícitamente `metadata` como “identificador”. Usa campos consultados (p.ej. `modInfo.id`, `form.id`, `form.slug`, `form.roles_allowed`).

**Conclusión**
- Identidad “efectiva” del módulo:
  - **Input**: `moduleSlug` (routing)
  - **Materialización**: `moduleId` (consulta por módulo y filtrado por `sgc_forms.module_id`)

---

## FASE 3 — Flujo completo del módulo (end-to-end)

> Diagramas en texto.

### 3.1 Flujo 1: Clic en módulo → DynamicModule (shell)

**Evidencia observada**
- `Dashboard.jsx` crea enlaces: `to={mod.path}` donde `mod.path` incluye `/operaciones`, `/calidad`, etc.
- `App.jsx` resuelve esos paths con `Route path=":moduleSlug" element={<DynamicModule />}`.

**Diagrama (texto)**
```
[Usuario clic] 
   -> (Dashboard.jsx) Link to /{moduleSlug}
      -> (App.jsx) Route ":moduleSlug" => <DynamicModule />
         -> DynamicModule: useParams() => moduleSlug
         -> dynamicService.getModuleBySlug(moduleSlug) => modInfo
         -> dynamicService.getFormsByModule(modInfo.id) => forms
         -> Render: Header + Tabs
            - Tab forms: list formularios
            - Tab records: <DynamicRecordsView moduleId=modInfo.id>
            - Tab repositorio: <ModuleDocumentViewer moduleSlug=moduleSlug> (si enabled)
```

---

### 3.2 Flujo 2: Desde “Diligenciar Registros” a render final de formulario

**Evidencia observada**
- En `DynamicModule` tab forms:
  - `Link to={`/modulo/${moduleSlug}/${form.slug}`}`.
- `App.jsx`:
  - `Route path="modulo/:moduleSlug/:formSlug" element={<DynamicForm />}`.

**Diagrama (texto)**
```
[Usuario clic en un Form]
   -> (DynamicModule.jsx) Link to /modulo/{moduleSlug}/{formSlug}
      -> (App.jsx) Route "modulo/:moduleSlug/:formSlug" => <DynamicForm />
         -> DynamicForm:
            - useParams => moduleSlug, formSlug
            - dynamicService.getFormBySlug(formSlug) => formDef
            - dynamicService.getFormFields(formDef.id) => fields
            - validación roles_allowed vs rol
            - render engine según formDef.engine_type:
                BaseChecklist | BaseMediciones | BaseGeneric
            - usuario completa fields y evidencia
            - submit => dynamicService.submitFormResponse(formDef.id, user.id, values, evidences)
            - si submit devuelve __runtime_internal_event:
                runtimeActivationLayer.activate(__runtime_internal_event)
            - navigate de vuelta a /{moduleSlug}
```

---

### 3.3 Flujo 3: Historial → DynamicRecordsView

**Evidencia observada**
- `DynamicModule` pestaña records: `<DynamicRecordsView moduleId={modInfo.id} />`.
- `DynamicRecordsView` llama `dynamicService.getModuleResponses(moduleId)`.

**Diagrama (texto)**
```
[Usuario clic pestaña "Historial y Consultas"]
   -> DynamicModule renders <DynamicRecordsView moduleId={modInfo.id} />
      -> DynamicRecordsView:
         - dynamicService.getModuleResponses(moduleId)
         - render tabla y modal de detalles
         - ver/filtrar por estado y computedStatus
```

---

### 3.4 Flujo 4: Repositorio Documental → ModuleDocumentViewer

**Evidencia observada**
- `DynamicModule` tab repositorio: renderiza `<ModuleDocumentViewer moduleSlug={moduleSlug} />` si `isDocumentEnabled(moduleSlug)`.
- `ModuleDocumentViewer`:
  - repositorios: `getRepositories({ moduleSlug })`
  - documentos: `documentsService.getRecords(moduleSlug, category_key)`.

**Diagrama (texto)**
```
[Usuario clic pestaña "Repositorio Documental"]
   -> DynamicModule valida isDocumentEnabled(moduleSlug)
   -> si enabled: render <ModuleDocumentViewer moduleSlug={moduleSlug} />
      -> ModuleDocumentViewer:
         - documentRepositoriesService.getRepositories({moduleSlug})
         - usuario selecciona repositorio => activeRepositoryId
         - documentRepositoriesService.getCategories(activeRepositoryId)
         - por categoría: documentsService.getRecords(moduleSlug, category_key)
         - render lista de PDFs por categoría
```

---

## FASE 4 — Auditoría de reutilización

### 4.1 Matriz de reutilización

> Clasificación requerida: **Reutilización directa**, **Adaptación menor**, **No reutilizable**.

| Elemento | Evidencia de uso | Clasificación | Justificación (evidencia) |
|---|---|---|---|
| `DynamicModule` | Renderiza cualquier módulo por `:moduleSlug` | **Core (contenedor)** | Depende de `moduleSlug` y reusa subcomponentes estándar. |
| `DynamicForm` | Renderiza cualquier form por `modulo/:moduleSlug/:formSlug` | Reutilización directa | Selecciona form por `formSlug` y renderiza engine por `formDef.engine_type`. |
| `DynamicRecordsView` | `moduleId` desde `DynamicModule` | Reutilización directa | Filtra datos por `sgc_forms.module_id = moduleId` usando `getModuleResponses(moduleId)`. |
| `ModuleDocumentViewer` | Repo documental por `moduleSlug` | Reutilización directa | Repositorios/categorías/documentos consultados por `moduleSlug`. |
| `DocumentModule` | Programa técnico normativo del módulo | Reutilización directa | Carga por `module` (slug) usando `documentsService.getProgram(module)`. |
| `BaseChecklist` / `BaseMediciones` | Render por `formDef.engine_type` | Adaptación menor | Están desacoplados por `engine_type`, pero el set de motores conocidos en `DynamicForm` está limitado a `BaseChecklist`/`BaseMediciones`/`BaseGeneric` (evidencia en switch). |
| Hardcode `isDocumentEnabled(moduleSlug)` dentro de `DynamicModule` | Condiciona repositorio tab | **No reutilizable (acoplamiento)** | Reglas de disponibilidad documental están “ancladas” a una lista fija de slugs, impidiendo extensión declarativa solo con metadata (en este punto del código). |

---

### 4.2 Auditoría de acoplamiento (sin propuesta de cambio)

**Evidencia observada**
- `DynamicModule.jsx` contiene: `isDocumentEnabled(slug)` con lista fija.

**Análisis**
- Este mecanismo acopla la evolución del Core UI a una enumeración manual de slugs.

**Conclusión**
- El acoplamiento principal detectado en reutilización es el **hardcode** de disponibilidad de repositorio documental.

---

## FASE 5 — Auditoría del Core Standard (SRP) — Exclusivo `DynamicModule.jsx`

### 5.1 Matriz SRP (responsabilidades mezcladas)

| Responsabilidad | Evidencia observada (archivo / código) | Categoría | ¿Mezclada? |
|---|---|---|---|
| Identidad del módulo (resolver moduleSlug → datos) | `dynamicService.getModuleBySlug(moduleSlug)` | Datos/Orquestación | Sí (mezcla con UI shell) |
| Obtención de formularios del módulo | `dynamicService.getFormsByModule(moduleData.id)` | Datos/Orquestación | Sí |
| Shell de UI del módulo (header + tabs) | estructura de header + `activeTab` | UI | Sí (convive con orquestación) |
| Reglas de UI sobre disponibilidad repositorio documental | `isDocumentEnabled(moduleSlug)` + force tab | UI/Reglas | Sí (reglas hardcodeadas en Core shell) |
| Filtrado por roles de formularios | `forms.filter(f => !f.roles_allowed || f.roles_allowed.includes(rol))` | Autorización/UI | Sí (Core shell aplica control) |
| Render de componentes downstream | `<DynamicRecordsView moduleId=modInfo.id>` y `<ModuleDocumentViewer moduleSlug={moduleSlug} />` | Composición | Sí |

**Conclusión**
- `DynamicModule.jsx` es un **Orquestador + Shell UI + Reglas de habilitación + Filtro de roles**.

---

## FASE 6 — Auditoría del contrato del Core (contratos implícitos)

> Se deben documentar TODOS los contratos implícitos observables por evidencia.

### 6.1 Router Contract (navegación)

**Evidencia observada**
- `src/App.jsx`:
  - `:moduleSlug` ⇒ `DynamicModule`
  - `modulo/:moduleSlug/:formSlug` ⇒ `DynamicForm`

**Análisis**
- “Contrato” de identidad está compuesto por estos params.

**Conclusión**
- Router Contract:
  - `moduleSlug` es el identificador de módulo para el shell.
  - `formSlug` es el identificador de formulario para el render del formulario.

---

### 6.2 Identity Contract (módulo)

**Evidencia observada**
- `DynamicModule`:
  - `moduleSlug` → `dynamicService.getModuleBySlug(moduleSlug)` → `modInfo.id`.

**Análisis**
- `moduleId` no viene del routing: se deriva de `moduleSlug`.

**Conclusión**
- Identity Contract:
  - `moduleSlug` (input) ⇒ `modInfo.id` (materialización) via `sgc_modules.slug`.

---

### 6.3 DynamicRecords Contract (historial/consultas)

**Evidencia observada**
- `DynamicRecordsView({ moduleId })`
  - `dynamicService.getModuleResponses(moduleId)`
- `getModuleResponses(moduleId)`:
  - `.eq('sgc_forms.module_id', moduleId)`.

**Análisis**
- El conjunto de registros se define por join/filtrado por `module_id`.

**Conclusión**
- Records Contract:
  - `moduleId` ⇒ dataset `sgc_form_responses` filtrado por `sgc_forms.module_id`.

---

### 6.4 Repository Contract (documental)

**Evidencia observada**
- `DynamicModule`:
  - Renderiza `ModuleDocumentViewer moduleSlug={moduleSlug}` solo si `isDocumentEnabled(moduleSlug)`.
- `ModuleDocumentViewer({ moduleSlug })`:
  - `documentRepositoriesService.getRepositories({ moduleSlug })`
  - luego `documentsService.getRecords(moduleSlug, category_key)`.

**Análisis**
- El módulo se usa como key para repositorios y records.

**Conclusión**
- Repository Contract:
  - `moduleSlug` ⇒ repositorios + documentos por categoría.

---

### 6.5 Form Contract (render de formulario)

**Evidencia observada**
- `DynamicForm`:
  - lee `formSlug` del routing
  - `getFormBySlug(formSlug)` ⇒ `formDef`
  - `getFormFields(formDef.id)` ⇒ `fields`
  - render engine basado en `formDef.engine_type`.

**Análisis**
- No se observa un “moduleId” explícito en `DynamicForm` más allá de `moduleSlug` del routing (no se usa directamente para fetch de form).

**Conclusión**
- Form Contract:
  - `formSlug` ⇒ `formDef` + `fields` (engine_type define UI).

---

### 6.6 Authorization Contract (roles)

**Evidencia observada**
- `DynamicModule` filtra formularios por `f.roles_allowed.includes(rol)`.
- `DynamicForm` bloquea acceso si `form.roles_allowed` no incluye `rol`.
- `DynamicRecordsView` define `isVerificador = rol === 'administrador' || rol === 'calidad'`.

**Análisis**
- Autorización está distribuida: UI filtering en shell + guard en formulario + reglas de verificación en historial.

**Conclusión**
- Authorization Contract:
  - `rol` gobierna visibilidad y acciones (no es un solo contrato centralizado).

---

### 6.7 Runtime Contract (puente evento)

**Evidencia observada**
- `DynamicForm`:
  - `dynamicService.submitFormResponse(...)` devuelve `result.__runtime_internal_event`
  - si existe: `runtimeActivationLayer.activate(result.__runtime_internal_event)`

**Análisis**
- Runtime se activa desde el submit; no se observa que `DynamicModule`/`DynamicRecordsView` active runtime salvo verify.
- `DynamicRecordsView` también hace:
  - `dynamicService.verifyFormResponse(...)` ⇒ `internalEvent`
  - `runtimeActivationLayer.activate(internalEvent)`.

**Conclusión**
- Runtime Contract:
  - Eventos normalizados (internos) devueltos por `dynamicService` son activados por `runtimeActivationLayer`.

---

## FASE 7 — Evolución necesaria para soportar Business Capabilities

> Solo arquitectura. No proponer código.

### 7.1 Cuál debe evolucionar el Core Standard (según evidencia)

**Evidencia observada**
- `DynamicModule.jsx` mezcla responsabilidades (SRP) y contiene hardcode de disponibilidad de repositorio documental.
- El shell decide con lista fija (`isDocumentEnabled`) si muestra o no un capability (repositorio documental).
- Los “contratos” implícitos están distribuidos entre:
  - routing params (`moduleSlug`, `formSlug`)
  - data derivation (`moduleSlug -> moduleId`)
  - reglas hardcodeadas (habilitación repo)
  - autorización (roles) repartida

**Análisis**
- Para soportar Business Capabilities sin duplicación de UI/lógica, el Core necesita:
  - una forma **declarativa** (desde metadata/config) de habilitación de capabilities en vez de hardcode.
  - una separación clara entre:
    - Orquestación de datos (Identity+fetch)
    - Shell UI (tabs/layout)
    - Política de capabilities (qué módulos soportan qué capacidades)
    - Autorización y filtrado (qué mostrar/permitir)

**Conclusión**
- Evolución necesaria (arquitectura):
  1) El mecanismo de **capability enablement** no puede depender de hardcode en `DynamicModule`.
  2) `DynamicModule` debe perder responsabilidades mezcladas (SRP) para que el Core soporte variaciones declarativas de módulos.
  3) El “verdadero contrato” de capabilities debe ser un contrato explícito (derivado de metadata), en lugar de decisiones dispersas.

---

## FASE 8 — Opciones arquitectónicas (alternativas, sin seleccionar)

### Opción A — Evolucionar `DynamicModule` como orquestador + “Capability Policy” declarativa

**Ventajas (evidencia-driven)**
- Mantiene el modelo actual (routing y shell existen).
- Permite evolucionar solo la capa de policy sin tocar runtime/persistencia.

**Desventajas (observadas por SRP y hardcode)**
- El archivo `DynamicModule.jsx` ya mezcla demasiadas responsabilidades.
- Riesgo de continuar acumulando acoplamientos si se amplía sin separar responsabilidades.

### Opción B — Crear `StandardModuleShell` (solo UI) y extraer orquestación

**Ventajas**
- Ataca directamente la auditoría SRP: UI shell desacoplado de orquestación y reglas.
- Permite que `DynamicModule` sea (o reemplace) por un orquestador delgado.

**Desventajas**
- Requiere rediseñar el flujo actual de props: quién decide tabs y quién hace fetch.
- Puede afectar puntos de acoplamiento actuales (habilitación repositorio y roles filtering).

### Opción C — Separar Shell y Orquestador (y separar Policy + Authorization)

**Ventajas**
- Divide contratos implícitos actuales (UI shell, identity fetch, capability enablement, roles filtering).
- Mejora escalabilidad de Business Capabilities.

**Desventajas**
- Mayor cambio arquitectónico conceptual (contratos y responsabilidades cambian).
- Requiere certificar consistentemente nuevos contratos de inputs/outputs.

> **Nota obligatoria:** No se selecciona ninguna opción.

---

## FASE 9 — Riesgos

| Área | Riesgo | Evidencia | Nivel |
|---|---|---|---|
| Arquitectura | Continuación de SRP violation si se extiende `DynamicModule` | `DynamicModule.jsx` mezcla fetch, UI shell, rules, authorization | Alto |
| Compatibilidad | Cambios en contratos implícitos (params/derivations) | Dependencia de `moduleSlug -> moduleId`, `formSlug -> formDef` | Medio |
| Runtime | Variación del puente de eventos | `DynamicForm`/`DynamicRecordsView` activan runtime con `__runtime_internal_event` e `internalEvent` | Medio |
| Metadata | No existe contrato explícito de capabilities (hardcode actual) | `isDocumentEnabled` lista fija | Alto |
| Performance | Más capas pueden aumentar renders/fetch si no se controla | Actualmente hay fetch secuencial en `DynamicModule` (module then forms) | Medio |
| Testing | Dificultad de probar reglas dispersas | roles filtering + capability enablement hardcode en shell | Medio |
| Escalabilidad | Duplicación de UI/lógica si capabilities se añaden por hardcode | hardcode de repositorio documental en Core | Alto |

---

## FASE 10 — Dictamen final (obligatorio)

### 10.1 ¿Cómo funciona realmente el Core hoy?
**Evidencia observada**
- Router activa `DynamicModule` con `moduleSlug`.
- `DynamicModule` consulta `modInfo` por `moduleSlug` y consulta `forms` por `modInfo.id`.
- Para formularios: navega a `DynamicForm` con `moduleSlug + formSlug`.
- Para historial: `DynamicRecordsView` usa `moduleId` (derivado de `modInfo.id`) para filtrar.
- Para repositorio: `ModuleDocumentViewer` usa `moduleSlug` (y además `DynamicModule` decide si se muestra via hardcode).

**Análisis**
- El Core hoy es un “shell” UI con orquestación de datos y reglas, y un segundo shell para formulario.

**Conclusión**
- Funciona como **UI shell + fetch + composition** basado en routing params, con filtros por metadata/roles y capability hardcoded.

---

### 10.2 ¿Qué identifica realmente a un módulo?
**Evidencia observada**
- Identidad de módulo materializada como `moduleId` derivado desde `moduleSlug`.

**Análisis**
- Datos se filtran por `module_id` en fetch de forms y responses.

**Conclusión**
- Identidad real: `moduleSlug` (entrada) ⇒ `moduleId` (materialización para datasets de records/forms).

---

### 10.3 ¿Qué hace que cada módulo vea únicamente su propia información?
**Evidencia observada**
- Formularios:
  - `getFormsByModule(moduleId)` filtra por `sgc_forms.module_id = moduleId`.
- Historial:
  - `getModuleResponses(moduleId)` filtra por `sgc_forms.module_id = moduleId`.
- Repositorio documental:
  - repositorios y documentos consultados por `moduleSlug`.

**Conclusión**
- La separación de datos ocurre por filtros de identidad (`module_id`/`moduleSlug`) aplicados en servicios.

---

### 10.4 ¿Qué partes son realmente reutilizables?
**Evidencia observada**
- `DynamicForm` reutiliza el rendering genérico por `engine_type`.
- `DynamicRecordsView` reutiliza consultas por `moduleId`.
- `ModuleDocumentViewer` reutiliza consultas por `moduleSlug`.
- `DocumentModule` reutiliza programa por `module`.

**Conclusión**
- Reutilización directa: DynamicForm, DynamicRecordsView, ModuleDocumentViewer, DocumentModule.

---

### 10.5 ¿Qué responsabilidades están mezcladas actualmente en el Core?
**Evidencia observada**
- `DynamicModule.jsx` contiene:
  - fetch identity+forms
  - shell UI tabs
  - policy (isDocumentEnabled hardcode)
  - authorization filtering (roles_allowed)

**Conclusión**
- El Core mezcla **orquestación de datos**, **shell UI**, **política de capacidades** y **autorización/UI filtering**.

---

### 10.6 ¿Cuál es el verdadero cuello de botella arquitectónico?
**Evidencia observada**
- `isDocumentEnabled(moduleSlug)` hardcodea habilitación de repositorio.
- SRP en `DynamicModule` está violado, haciendo que extender capacidades requiera tocar Core UI.

**Análisis**
- Esto impide evolución declarativa para Business Capabilities, creando “puntos de ampliación” manuales.

**Conclusión**
- Cuello de botella: **Capability enablement + SRP violation en `DynamicModule.jsx`**, especialmente la dependencia de un hardcode de capacidades por slug.

---

### 10.7 ¿Qué debe evolucionar primero para permitir Business Modules sin duplicación?
**Evidencia observada**
- La primera necesidad es desacoplar la policy de capabilities del shell, y separar responsabilidades.

**Conclusión**
- Evolucionar primero el Core Standard en el punto de **separación entre shell UI y policy/orquestación** (sin implementar código en este sprint; solo dictamen).

---

## Anexo: Matriz obligatoria (resumen)

### A) Matriz de componentes (síntesis)
| Componente | Rol en el Core | Input principal | Output/efecto |
|---|---|---|---|
| `DynamicModule` | Shell + orquestador | `moduleSlug` (routing) | Tabs; render de forms list / records / repositorio |
| `DynamicForm` | Shell del formulario | `formSlug` (routing) + `moduleSlug` | Render engine por `engine_type`; submit activa runtime |
| `DynamicRecordsView` | Historial/consultas | `moduleId` | Render tabla+modal; verify activa runtime |
| `ModuleDocumentViewer` | Repositorio documental | `moduleSlug` | Render repositorios/categorías/documentos PDF |
| `DocumentModule` | Documento técnico normativo del módulo | `module` (slug) | Render “Ver Programa” y (si admin) upload/delete |
| `dynamicService` | Servicios de identity/forms/records + bridges | `moduleSlug`, `moduleId`, `formId`, `formSlug` | datasets y eventos internos |

### B) Matriz de responsabilidades (síntesis)
| Responsabilidad | Componentes | Evidencia |
|---|---|---|
| Identidad de módulo | `DynamicModule` + `dynamicService` | `getModuleBySlug(moduleSlug)` |
| Selección de formularios | `DynamicModule` + `dynamicService` | `getFormsByModule(moduleId)` |
| Render motor de formulario | `DynamicForm` | `switch(formDef.engine_type)` |
| Historias/records | `DynamicRecordsView` + `dynamicService` | `getModuleResponses(moduleId)` |
| Documentos PDF | `ModuleDocumentViewer` + `documentsService`/`documentRepositoriesService` | `getRepositories({moduleSlug})`, `getRecords(moduleSlug, category_key)` |
| Capability enablement | `DynamicModule` | `isDocumentEnabled(moduleSlug)` (hardcode) |
| Autorización | `DynamicModule`, `DynamicForm`, `DynamicRecordsView` | filtros roles_allowed + guard + isVerificador |
| Runtime bridge | `DynamicForm`, `DynamicRecordsView` | `runtimeActivationLayer.activate(internalEvent)` |

### C) Matriz de contratos implícitos (síntesis)
| Contrato | Componente que lo “exige” | Componente que lo “provee” | Forma |
|---|---|---|---|
| Router Contract | Router (`App.jsx`) | React Router | params: `moduleSlug`, `formSlug` |
| Identity Contract | `DynamicModule` | `dynamicService` | `moduleSlug -> modInfo.id` |
| Records Contract | `DynamicRecordsView` | `dynamicService` | `moduleId -> getModuleResponses(moduleId)` |
| Repository Contract | `ModuleDocumentViewer` | documentRepositories/documents services | `moduleSlug -> repos + docs` |
| Form Contract | `DynamicForm` | `dynamicService` | `formSlug -> formDef + fields` |
| Authorization Contract | UI componentes | metadata (`roles_allowed`) + rol | `rol` filtra acceso/acciones |
| Runtime Contract | `DynamicForm`, `DynamicRecordsView` | `dynamicService` + runtimeActivationLayer | `__runtime_internal_event` o `internalEvent` |

---

## Estado de verificación (sin asumir)
- **Pendiente de Verificación**: Existencia de un modelo de metadata formal que describa capabilities soportadas por módulo (en el código auditado, la habilitación repositorio documental está hardcodeada; no se encontró aún un contrato metadata formal para capacidades).
- **Hipótesis Arquitectónica**: que la evolución para Business Capabilities requiere unificar/centralizar “policy de capabilities” en metadata y separar SRP en un nuevo “StandardModuleShell/Orchestrator”.

(Estas marcas se mantienen porque el sprint prohíbe asumir y el soporte definitivo debe venir de más evidencia de código/mapping de metadata.)

