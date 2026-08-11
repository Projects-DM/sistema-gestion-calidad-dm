# Sprint 281 — Auditoría y Diseño de Migración de Alertas hacia Recursos Operacionales Reales

**Branch:** `release/stable-sprint79`
**Modo:** AUDIT + ARCHITECTURAL DESIGN + MIGRATION DECISION
**Producción:** 0 cambios · **src/:** 0 cambios · **Supabase:** 0 cambios · **Schema:** 0 cambios · **Nuevos servicios:** 0
**SSOT:** `docs/Sprint-281.md`
**Dependencias:** Sprint 263 · 265 · 268 · 278 · 279 · 280
**Estado final:** **SPRINT 281 — AUDIT COMPLETE · READY FOR EXECUTION**

---

## 1. Objetivo

Auditar el modelo actual de Alertas y determinar cómo migrar su consumo desde la actual:

```text
Operational Experience → Alertas → Registro/Recurso
```

hacia:

```text
Configuración de Alertas
          │
          ▼
Recurso operacional REAL
          │
          ├── Formulario / Registro
          │
          └── Repositorio / Categoría
                    │
                    ▼
             Alertas derivadas
```

La alerta no debe convertirse en un segundo sistema de registros.

El sistema debe tener:

```text
UNA fuente operacional real + múltiples capacidades derivadas.
```

---

## 2. Decisión arquitectónica preliminar

La auditoría deberá validar esta dirección:

### Modelo actual

```text
Módulo
 ├── Formulario
 │    └── Registro real
 │
 ├── Repositorio
 │    └── Categoría
 │
 └── Experiencia Operacional
      └── Alertas
           └── consume recursos
```

La Experiencia Operacional de Alertas está comenzando a convertirse en una segunda
representación operacional.

Eso genera:

- duplicación visual;
- duplicación de navegación;
- lógica adicional;
- botones de "Ir al formulario";
- otra superficie que el usuario debe entender;
- mayor acoplamiento;
- mayor cantidad de estados que mantener sincronizados.

### Modelo objetivo

```text
Módulo
 │
 ├── Formularios
 │      └── Registros reales
 │              │
 │              └── Alertas derivadas
 │
 └── Repositorios
        └── Categorías
               │
               └── Alertas derivadas
```

Y una capa transversal:

```text
                 Alert Configuration
                         │
                         ▼
                 Alert Runtime
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       Form/Records            Repository/
                              Categories
              │                     │
              └──────────┬──────────┘
                         ▼
                  Alert Projection
                         │
                         ▼
                 Visual presentation
```

---

## 3. Lo que NO vamos a eliminar

Esto es importante.

No estamos eliminando el sistema de alertas.

Estamos eliminando la duplicación de la representación operacional.

**Se conserva:**

- `AlertConfiguration`;
- `Alert Runtime`;
- `OccurrenceLifecycle`;
- `OccurrenceSchedule`;
- `OccurrenceContract`;
- `OccurrenceProjection`;
- `CompletionSignal`;
- `CompletionBridge`;
- `OccurrenceLedger`;
- resolución determinística;
- identidad `alertId`;
- identidad `occurrenceId`;
- priorización de alertas;
- estados `overdue` / `today` / `active` / `upcoming`;
- aislamiento de ocurrencias;
- configuración desde Configuraciones.

Todo eso ya está funcionando y representa una inversión arquitectónica importante.

**Se reutiliza. No se reconstruye.**

---

## 4. Nueva responsabilidad de AlertMonitoring

La pregunta fundamental de la auditoría será:

> ¿AlertMonitoring debe seguir siendo una Operational Experience?

La hipótesis arquitectónica es:

**NO como fuente operacional.**

Puede sobrevivir temporalmente como proyección visual de alertas, pero **no como propietario de
registros**.

Objetivo final:

```text
AlertMonitoring
      │
      ▼
Alert Projection
      │
      ▼
consume registros reales
```

No:

```text
AlertMonitoring
      │
      ▼
crea/duplica representación de registros
```

Esto además elimina progresivamente:

```text
Alerta → Ir al formulario
Alerta → Ir al repositorio
Alerta → modificar registro
```

porque el usuario ya estaría trabajando sobre el registro real.

---

## 5. Formulario: modelo objetivo

Actualmente:

```text
Formulario
   │
   └── registro
         │
         └── alerta
               │
               └── Experiencia Alertas
```

Objetivo:

```text
Módulo
  │
  ▼
Formulario
  │
  ▼
Registro real
  │
  ├── datos operacionales
  ├── metadata
  └── alert projection
```

Visualmente podríamos tener dentro del propio contexto del registro:

```text
Registros
────────────────────────────
Pendientes
Alertas
Historial
...
```

La alerta simplemente agrega información operacional derivada.

**No crea otro registro.**

---

## 6. Repositorio documental

Aquí coincidimos en que debemos ser especialmente cuidadosos.

Actualmente:

```text
Repositorio
    │
    ▼
Categoría
    │
    ▼
Documento / archivo
```

Pero la alerta actualmente está asociada a un nivel demasiado alto:

```text
Alerta
  │
  ▼
Repositorio
```

La auditoría debe determinar cómo llevarla hacia:

```text
Repositorio
    │
    ▼
Categoría
    │
    ▼
Documento
    │
    ▼
Archivo final
```

### Dirección recomendada

La categoría parece ser una frontera mucho más útil para el consumidor final.

Esto permite posteriormente:

```text
Repositorio
 ├── Categoría A
 │    ├── documentos
 │    └── alertas
 │
 ├── Categoría B
 │    ├── documentos
 │    └── alertas
 │
 └── Categoría C
      ├── documentos
      └── alertas
```

Pero **Sprint 281 no debe modificar todavía esa relación.**

Primero debemos comprobar exactamente:

- quién es dueño de la categoría;
- cómo se identifica;
- cómo se obtiene;
- cómo se persiste;
- cómo se navega;
- cómo se proyecta;
- qué consume actualmente Alert Runtime;
- qué información adicional necesitaría la alerta.

---

## 7. Configuraciones NO se toca

Esto también queda certificado.

La administración continuará siendo:

```text
Configuración
     │
     ▼
¿Recurso genera persistencia?
     │
     ├── Sí
     └── No
```

No vamos a rediseñar Configuraciones ahora.

La auditoría solamente debe responder:

> ¿La configuración actual puede seguir siendo consumida directamente por los recursos reales?

- Si la respuesta es **sí**: se reutiliza.
- Si existe una adaptación necesaria: se documenta para un sprint posterior.

---

## 8. Límite actual de alertas

También estamos de acuerdo con retirar la restricción artificial de:

```text
máximo 2 registros
máximo 2 alertas
```

Pero aquí hay una distinción importante.

No debemos implementar todavía "N alertas".

El objetivo inmediato será:

```text
1 recurso
   └── 1 configuración de alerta
```

Esto simplifica el modelo actual.

Posteriormente podremos evolucionar:

```text
1 recurso
   ├── alerta A
   ├── alerta B
   └── alerta C
```

sin cambiar la arquitectura fundamental porque ya tenemos:

```text
alertId
occurrenceId
resourceId
CompletionIntent
DeterministicCompletionResolver
OccurrenceLedger
```

Precisamente el **Sprint 280** nos dejó preparada esa separación.

Por eso no necesitamos diseñar ahora una segunda arquitectura para múltiples alertas.

---

## 9. Auditoría de reutilización

Este será uno de los puntos más importantes de Sprint 281.

Clasificaremos cada componente en:

| Clase | Descripción | Ejemplo |
|-------|-------------|---------|
| **A — REUTILIZAR** | Componentes que funcionan tal cual | `AlertConfiguration`, `OccurrenceLifecycle`, `OccurrenceSchedule`, `OccurrenceProjection`, `CompletionBridge`, `OccurrenceLedger` |
| **B — ADAPTAR** | Elementos ligados a la Experiencia Operacional pero con lógica reutilizable | — |
| **C — MIGRAR** | Consumo que debe pasar de `Operational Experience` → `Real Resource` | — |
| **D — DEPRECAR** | Elementos que solo existen porque las alertas tenían representación separada | — |
| **E — ELIMINAR** | Duplicaciones sin valor arquitectónico | — |

---

## 10. Auditoría específica de datos

Debemos identificar exactamente:

```text
¿Dónde nace el registro?
¿Dónde se persiste?
¿Dónde se identifica?
¿Dónde se consulta?
¿Dónde se proyecta?
¿Dónde se genera la alerta?
¿Dónde se completa?
```

Para cada recurso.

### Formularios

```text
Form Definition
      ↓
DynamicForm
      ↓
Record
      ↓
Alert Configuration
      ↓
Occurrence
      ↓
Projection
```

### Repositorios

```text
Repository
      ↓
Category
      ↓
Document
      ↓
File
      ↓
Alert
```

Aquí especialmente debemos comprobar si el verdadero recurso de cumplimiento debería ser:

```text
Repository
```
o:
```text
Category
```
o incluso:
```text
Document
```

**La auditoría debe decidirlo con evidencia del código, no por intuición.**

---

## 11. Nueva presentación de alertas

La lógica visual que ya construimos se conserva.

Por ejemplo:

```text
🔴 Vencidas
────────────────────────

🟠 Para hoy
────────────────────────

🟡 Próximas
────────────────────────
```

Pero en lugar de:

```text
Alerta
  → botón "Ir al formulario"
```

la información aparecerá dentro del contexto real:

```text
MÓDULO
  │
  └── REGISTROS
       │
       ├── Registro 001
       │     🔴 Alerta vencida
       │
       ├── Registro 002
       │     🟠 Alerta hoy
       │
       └── Registro 003
             ✓ Sin alerta
```

La alerta pasa a ser atributo/proyección del registro, **no** otro registro.

---

## 12. Principio UX

Esto es probablemente el mayor beneficio de la migración.

Actualmente:

```text
Usuario
 ↓
Experiencias Operacionales
 ↓
Alertas
 ↓
Busca alerta
 ↓
Ir al formulario
 ↓
Formulario
 ↓
Modificar
```

Objetivo:

```text
Usuario
 ↓
Módulo
 ↓
Registro
 ↓
ve alerta
 ↓
modifica registro
```

Menos navegación.

Menos conceptos.

Menos pantallas.

Menos botones.

Menos duplicación.

Y más importante:

**el usuario trabaja siempre sobre la fuente real de información.**

---

## 13. Alcance estricto de Sprint 281

### SE AUDITA

- `AlertMonitoringExperience`;
- `AlertWorkspaceBuilder`;
- `AlertWorkspaceActionDescriptor`;
- `AlertConfiguration`;
- `Alert Runtime`;
- `OccurrenceProjection`;
- `OccurrenceLedger`;
- formularios;
- registros;
- repositorios;
- categorías;
- navegación;
- persistencia;
- consumidores de alertas;
- relaciones `resourceId`;
- relaciones `alertId`;
- relaciones `occurrenceId`;
- límites actuales de 2 registros/alertas.

### NO SE MODIFICA

- `src/`
- Supabase
- `schema`
- `Runtime`
- `Scheduler`
- `Engine`
- `Enrollment`
- `OccurrenceLifecycle`
- `CompletionBridge`
- `OccurrenceLedger`
- `AlertConfiguration`

durante esta auditoría.

---

## 14. Entregable de Sprint 281 — MATRIZ VALIDADA CON EVIDENCIA

Matriz base (hipótesis del diseño) validada y corregida con la auditoría (§17):

| Componente | Estado actual | Destino | Acción | Evidencia |
|------------|---------------|---------|--------|-----------|
| `AlertConfiguration` | Configuración SSOT en el recurso | Configuración en el recurso | REUTILIZAR | `sgc_forms.alert_config` / `sgc_document_repositories.alert_config`; único lector `AlertConfigurationResolver`; escritura `AlertConfigurationPersistenceAdapter` |
| `Alert Runtime` | Motor transversal (enclave boundary, `scheduler:false`) | Motor transversal | REUTILIZAR | `runtime/index.js:17-21`; no ejecuta: `RuntimeActivationBoundary.js:28-36` |
| `OccurrenceLifecycle` | Dominio (clasificador SSOT) | Dominio | REUTILIZAR | `OccurrenceLifecycle.js:48-67` `classifyOccurrence` — completion-first |
| `OccurrenceProjection` | Proyección (solo forms+repositories) | Proyección + consumo en vistas reales | **ADAPTAR** | `OccurrenceProjection.js:48-51`; `useAlertRuntime.occurrences` SIN consumidor UI (§17.4) |
| `AlertMonitoringExperience` | Experiencia (único render visual) | Proyección visual temporal → registros reales | **MIGRAR** | Único render de cards (`CardButton`, líneas 380-437); registrada como sub-tab experiment (**§17.1**) |
| `AlertWorkspace` | Stack workspace certificado | Revisar dependencia | **AUDITAR — hallazgo: ViewModel sin consumidor UI (pila huérfana)** | `AlertWorkspaceBuilder/Resolver/ViewModel` computados en `useAlertRuntime.workspace` (447-455) pero NINGÚN componente los renderiza (§17.4) |
| `DynamicForm` | Fuente real | Fuente real | REUTILIZAR | `dynamicService.submitFormResponse` → `sgc_form_responses`; intent `origin` Sprint 280 (199-224) |
| `DynamicRecords` | Fuente real | Fuente real (añadir consumo de proyección) | REUTILIZAR + ADAPTAR | `DynamicRecordsView.jsx` usa solo `visibility.badges`; NO consume `occurrences` |
| `Repository` | Fuente real (dueño de config y categorías) | Fuente real (config SSOT) | REUTILIZAR | `documentRepositoriesService.js:27-31,121-123`; config en repo |
| `Category` | Subcapa documental persistida | Posible frontera de alerta para el consumidor | **AUDITAR — persistida con id+category_key; frontera recomendada (§17.6)** | `sgc_document_repository_categories` (DDL Sprint 43.2); docs vinculados por string `type===category_key` |
| botones "Ir a..." | Navegación duplicada | Eliminar progresivamente | DEPRECAR | `navigationLabel` duplicado ×2 ("Ir al formulario"); `go-to-document` con `documentId` roto (H2 §17.3) |
| límite 2 alertas | **NO EXISTE en código** | — | DEPRECAR (documentar) | Búsqueda exhaustiva: 0 hits de `slice(0,2)`/`max`/`length>2`; el panel permite N (§17.5) |

---

## 15. Decisión que debe producir la auditoría — RESPUESTAS CON EVIDENCIA

Al terminar Sprint 281 debemos poder responder con evidencia:

**Pregunta 1 — ¿Podemos eliminar Alertas como Operational Experience sin perder ninguna capacidad?**

> **SÍ, sin perder NINGUNA capacidad del sistema de alertas.**
> La prueba: `AlertMonitoringExperience` es 100% presentación + navegación; NO escribe registros
> ni configuración. Todos los hechos operacionales (completamiento, ledger, proyección) viven en
> el runtime y se consumen vía `useAlertRuntime`. `AlertMonitoringExperience.jsx:443-446` consume
> solo `existing` (snapshot de recursos) y reconstruye su propio ViewModel.
> Lo que se perdería es la SUPERFICIE consolidada ("ver todas las alertas vencidas/hoy de todos
> los módulos") — no la lógica. Por eso la migración es GRADUAL: la capa visual debe moverse a la
> vista de registros reales ANTES de deprecar la experience (§17.4).

**Pregunta 2 — ¿Qué parte de AlertMonitoring puede convertirse directamente en una proyección sobre registros reales?**

> La ingeniería de cards (`projectConfigCards`, 218-343), los buckets de estado (462-477) y los
> clasificadores de presentación (`deriveFormState`/`derivedState`, 142-205) son DERIVACIÓN PURA
> sobre recursos + ledger. Eso es exactamente una proyección. Puede re-expresarse como un selector
> sobre `useAlertRuntime.occurrences` (que YA expone el runtime pero nadie consume en UI).
> El stack paralelo `AlertWorkspaceBuilder → AlertWorkspaceResolver → AlertWorkspaceViewModel` es
> YA un ViewModel de proyección certificado... y está huérfano: se computa pero ningún componente
> lo renderiza (§17.4). Debe decidirse: reusarlo como proyección de las vistas reales, o eliminarlo.

**Pregunta 3 — ¿Qué lógica actual de alertas puede reutilizarse sin modificaciones?**

> REUTILIZAR (A): `AlertConfigurationResolver` (SSOT, único lector), `OccurrenceSchedule`,
> `OccurrenceLifecycle`, `OccurrenceContract`, `OccurrenceProjection`, `CompletionSignal`,
> `CompletionBridge`, `OccurrenceLedger`, `DeterministicCompletionResolver`,
> `ExplicitEnrollmentValidator` (E1-E4), `AlertConfigurationApplicationService` (persistencia en
> el recurso), renderers de badge `runtime-visibility/*`. Cero cambios necesarios: todos son
> transportables y ya consumidos por el runtime, no por la experience.

**Pregunta 4 — ¿Qué código se vuelve innecesario y puede eliminarse posteriormente?**

> - La pila de action descriptors duplicada dentro de `AlertMonitoringExperience`
>   (`navigationLabel` propio, `ACTION_ROUTE` 345-378) vs la pila certificada del workspace:
>   git diff confirma strings duplicados ("Ir al formulario" ×2; "Ir al documento" vs
>   "Ir al repositorio").
> - `ACTION_ROUTE['open-record']` (361-364): definida pero **nunca emitida**; además
>   `DynamicRecordsView` no consume `location.state`. GPS huérfano.
> - `AlertWorkspaceBuilder/Resolver/ViewModel`: o se consumen o se eliminan (E/—).
>   `dynamicService.js:366` `alertasActivas: 0` hardcodeado — desconectado del runtime.
> - Cuando la proyección viva en las vistas reales: cards, botones "Ir a..." y el sub-tab
>   de la experience (solo si la consolidated view queda cubierta).

**Pregunta 5 — ¿Cuál es la verdadera frontera de cumplimiento del repositorio: Repository, Category o Document?**

> **Hoy: REPOSITORY.** Evidencia: config en `sgc_document_repositories.alert_config`;
> `resourceId` de la ocurrencia = id del repo (`OccurrenceProjection.js:164-166`);
> la card de repositorio navega con `documentId: resource?.id` (**id del repo**,
> `AlertMonitoringExperience.jsx:336`).
> **Categoría es la frontera para el CONSUMIDOR**: entidad persistida con `id` +
> `category_key` (UNIQUE repository_id/category_key), ya condiciona la VISIBILIDAD del
> documento (`RuntimeSourceIntegrityPolicy.js:170-181` "category-inactive").
> **Document NO es frontera fiable**: `sgc_records` NO tiene FK a repo/categoría; la pertenencia
> es por strings `doc.module === repo.module_slug` y `doc.type === category.category_key`.
> Recomendación: REPOSITORY conserva la configuración; CATEGORY es la frontera de
> presentación/consumo derivada. Sprint 281 NO modifica la relación (§6).

**Pregunta 6 — ¿Cómo conectar la configuración actual con el recurso real sin duplicar persistencia?**

> **Ya está conectada — no existe duplicación de persistencia.** La configuración vive EN el
> recurso real (`alert_config` en la fila del form/repo), se escribe por un único adaptador
> (`AlertConfigurationPersistenceAdapter.js:60,67`) y se lee por el único Resolver. La conexión
> faltante es de CONSUMO: `useAlertRuntime.occurrences` (la proyección certificada) debe
> alimentar la vista de registros reales (`DynamicRecordsView`) y la vista documental
> (`ModuleDocumentViewer`) — hoy solo usan `visibility.badges`, que es un badge único a nivel
> módulo. Sprint 282: consumir la proyección, no crear un segundo almacén.

**Pregunta 7 — ¿Cómo eliminamos el límite artificial de 2 sin introducir todavía complejidad de N alertas?**

> **El límite de 2 NO EXISTE.** Búsqueda exhaustiva en `src/`: 0 ocurrencias de
> `slice(0,2)`/`length > 2`/`max`/`MAX_` en el contexto de cantidad de alertas. El único matiz es
> `AlertConfigurationResolver.js:62-64` — el acceso single-config expone solo `alertConfigurations[0]`
> (contrato legacy de lectura, no un techo). El panel (`AlertConfigurationPanel.jsx:178-217`) permite
> agregar/duplicar N alertas sin tope; el persistence adapter no limita la colección.
> Operativamente: mantener el modelo 1 recurso → 1 configuración principal (§8) y documentar que la
> arquitectura multi-entrada (alertId/occurrenceId/colección por índice) del Sprint 280 ya soporta N
> sin rediseño. Sprint 282: alinear el contrato de exposición `[0]` y verificar la ruta de colección.

**Pregunta 8 — ¿Qué debe implementarse primero y qué debe esperar?**

> **PRIMERO (Sprint 282):**
> 1. **H1 — Unificar álgebra de `alertId`** (divergencia crítica §17.2): proyección
>    `dynamicForms:12:0` vs enrollment `12:alert:0`. Una única fuente de identidad.
> 2. **H2 — Corrección `go-to-document`**: `documentId` debe ser el del documento real (o la
>    categoría), no el id del repositorio, para que el highlight/categoría objetivo funcione.
> 3. **Consumo de la proyección en vistas reales**: `DynamicRecordsView` + `ModuleDocumentViewer`
>    reciben `occurrences` del runtime por fila/categoría (badge de alerta real, no badge único).
> 4. Decidir el destino de la pila `AlertWorkspace` (consumir o eliminar).
> **ESPERA:**
> - Deprecar `AlertMonitoringExperience` como experience (hasta que la vista consolidada de
>   vencidas/hoy/próximas esté cubierta dentro del módulo).
> - Reanclar la configuración a Categoría (requiere antes auditar `sgc_records`/FK documental).
> - UI de N-alertas por recurso (técnicamente ya soportada; decisión de producto).
> - Cualquier Scheduler (permanece prohibido: `scheduler:false`).

---

## 16. Arquitectura que estamos buscando

En términos simples:

```text
                  CONFIGURACIÓN
                       │
                       ▼
                ALERT CONFIG
                       │
                       ▼
                 ALERT RUNTIME
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
          FORMULARIOS       REPOSITORIOS
              │                 │
              ▼                 ▼
           REGISTROS         CATEGORÍAS
              │                 │
              └────────┬────────┘
                       ▼
                 OCCURRENCES
                       │
                       ▼
                 ALERT PROJECTION
                       │
                       ▼
                 UI DEL MÓDULO
```

Y el principio fundamental:

> **La alerta observa y califica el recurso; no reemplaza al recurso.**

Eso, en nuestra opinión, es una evolución arquitectónica mucho más sólida que seguir aumentando la
Experiencia Operacional de Alertas.

Además, **Sprint 280** nos deja en una posición excelente para hacerlo, porque ya tenemos aislados
`resourceId`, `alertId` y `occurrenceId`, y la regla de cumplimiento ya no depende de que exista una
pantalla independiente de alertas.

---

## 17. RESULTADOS DE AUDITORÍA (evidencia del código)

> Sprint 281 = AUDIT ONLY. No se modificó ningún archivo. Evidencia obtenida por revisión
> exhaustiva del código (rutas + líneas).

### 17.1 Dónde se monta Alertas como experience

- Registrada como experiencia operacional: `src/core/capabilities/alert/enterprise-activation/index.js:42-126`
  (`experienceKey:'alert-monitoring'`, `renderable:true`, `role:'configuration'`, `defaultOrder:99`;
  `resolveComponent` → `AlertMonitoringExperience.jsx` línea 114).
- La substab "Alertas" aparece bajo "Experiencias Operacionales" del módulo:
  `src/pages/DynamicModule.jsx:135,161-181,190` (`OperationalExperienceRegistry.resolveComponent`).
- **NO tiene ruta propia** (`src/App.jsx:56-60` solo moduleSlug/moduleId/formSlug); el `Bell` de la
  topbar es decorativo (`DashboardLayout.jsx:251-254`, sin onClick).

### 17.2 Hallazgo H1 — Divergencia del álgebra de `alertId` (crítico para Sprint 282)

Dos identidades para el MISMO componente:

| Fuente | Fórmula | Ejemplo | Ubicación |
|--------|---------|---------|-----------|
| Proyección (occurrence runtime) | `` `${source}:${resourceId}:${idx}` `` | `dynamicForms:12:0` | `OccurrenceProjection.js:160-162` |
| Resolver / Enrollment | `` `${resourceId}:alert:${index}` `` | `12:alert:0` | `AlertConfigurationResolver.js:199-201`; `ExplicitEnrollmentValidator.js:89` |

Consecuencia: la clave específica del ledger (`occurrence::<alertId>::<occurrenceId>`) solo
matcheará si el emisor usa EXACTAMENTE el alertId de la PROYECCIÓN. La ruta explícita proveniente
de la resolución/enrollment (`rules.alertId`) no coincide. Certificado en Sprint 279 §3.3 como
riesgo; ahora confirmado con las dos fórmulas.

### 17.3 Hallazgo H2 — `go-to-document` con `documentId` roto

```text
AlertMonitoringExperience.jsx:336  → { action:'go-to-document', documentId: resource?.id }
                                                                ↑ es el id del REPOSITORIO
ModuleDocumentViewer.jsx:62-68,84-87 → busca un record de sgc_records por ID de DOCUMENTO
```

Los uuids de repositorio y documento son de entidades distintas → el highlight/scroll objetivo
casi nunca encuentra el documento. La alerta lleva al usuario al tab repositorio (nivel repo), no
al documento.

### 17.4 Hallazgo H3 — Proyección de occurrences sin consumidor UI + pila workspace huérfana

- `useAlertRuntime` expone `occurrences` (524-538) alimentando el OccurrenceProvider del bridge,
  pero **ningún componente de UI las renderiza** (grep exhaustivo).
- `DynamicRecordsView.jsx:36-40,396-407` usa solo `visibility.badges.dynamicRecords`: un badge
  único a nivel módulo repetido en cada fila — NO es el estado de la ocurrencia.
- El stack `AlertWorkspaceBuilder → Resolver → ViewModel` (capability workspace) se computa en
  `useAlertRuntime.js:447-455` y **no tiene consumidor visual**: la experience usa `existing`, no
  el ViewModel certificado. Pila paralela sin render.

### 17.5 Hallazgo H4 — No existe el "límite de 2"

- Búsqueda exhaustiva en `src/`: **0 hits** de restricciones de cantidad de alertas/registros.
- `AlertConfigurationResolver.js:62-64`: el acceso single expone `alertConfigurations[0]`
  (contrato de lectura legacy, NO un techo).
- Panel: `AlertConfigurationPanel.jsx:178-217` (add/duplicate/delete N alertas, render `.map`
  382-430); `AlertConfigurationPersistenceAdapter.js:126-161` no limita la colección.
- `RelativeRiskPolicy.js:73` (`>=2 → escalated`) es prioridad/severidad, no cantidad de alertas.

### 17.6 Hallazgo H5 — Categoría: persistida y candidata a frontera (evidencia)

- Entidad: `sgc_document_repository_categories` (DDL `docs/12-database/SQL_SPRINT_43_2_*
  ·34-50`): `id` PK, `repository_id` FK cascade, `category_key` (mapea `sgc_records.type`),
  UNIQUE `(repository_id, category_key)`.
- CRUD completo: `documentRepositoriesService.js:152-261`; sólo admin en
  `DocumentRepositoriesAdmin.jsx:250-321`.
- El documento (`sgc_records`) NO tiene FK a repo/categoría: vinculación por strings
  (`doc.type === category.category_key`, `doc.module === repo.module_slug`)
  `ModuleDocumentViewer.jsx:120-127`.
- En el subsistema de alertas la categoría **solo** condiciona VISIBILIDAD
  (`runtime-audit/ResourceVisibilityValidator.js:29-71`; `RuntimeSourceIntegrityPolicy.js:170-181`).
  No participa en la identidad de alerta/ocurrencia (`OccurrenceContract.js:19-32` sin `category`).

### 17.7 Hallazgo H6 — Estado actual del flujo de datos (traza verificada)

**Formularios:**
```text
Form definition (sgc_forms, alert_config en la fila) → DynamicForm → submitFormResponse
  → sgc_form_responses (registro real, SIN campos de alerta) → COMPLETION_INTENT (origin) →
  CompletionBridge → DeterministicCompletionResolver → OccurrenceLedger → Proyección (forms)
```

**Repositorios:**
```text
Repository (sgc_document_repositories, alert_config en la fila) → Categorías (tabla propia) →
  Documentos (sgc_records, sin FK categoría) → Proyección (repositories, resourceId = repo.id)
```

- `OccurrenceProjection` solo proyecta `forms` + `repositories`
  (`OccurrenceProjection.js:48-51`); `dynamicRecords` NO genera ocurrencias (solo completa vía
  señales legacy window-aware).
- El completamiento de formularios es la ÚNICA fuente semánticamente final
  (`CompletionBridge.js:7-8`); la experience operacional completa con
  `RESOURCE_COMPLETED`/`RECORDS_APPROVED`/`RECORDS_CLOSED` (`Orchestrator.js:203-210,238,257`).
- `dynamicService.js:366` `alertasActivas: 0` hardcodeado en `getDashboardStats` — KPIs de alertas
  del dashboard NO conectados al runtime.

### 17.8 No-Scheduler certificado

- No existe `*Scheduler*` en `src/`. `scheduler:false` declarado en
  `RuntimeActivationBoundary.js:44`; `Scheduler` listado en `forbiddenPath` en
  `WorkspaceBoundary.js:33` y `RuntimeVisibilityBoundary.js:28`. `OccurrenceSchedule` es
  derivación temporal pura, no un agendador (no ejecuta, no hay setInterval/cron).

---

## VERDICT FINAL

```text
SPRINT 281
AUDIT + ARCHITECTURAL DESIGN

Producción:      0 cambios
src/:            0 cambios
Supabase:        0 cambios
Schema:          0 cambios
Nuevos servicios: 0

OBJETIVO (validado): 
  Migrar progresivamente Alertas desde una representación
  operacional independiente hacia una capacidad transversal
  consumida por los recursos reales.

PRINCIPIOS (mantenidos):
  REUTILIZAR > ADAPTAR > MIGRAR > DEPRECAR > ELIMINAR

DECISIONES CERRADAS con evidencia:
  Config en el recurso real:      REUTILIZAR (alert_config en sgc_forms/sgc_document_repositories)
  Alert Runtime:                  REUTILIZAR (enclave, scheduler:false)
  Occurrence/Proyección:          REUTILIZAR core; ADAPTAR consumo (occurrences → vistas reales)
  Experience Alertas:             MIGRAR a proyección en registros reales; deprecar después
  Repository:                     REUTILIZAR (dueño de config y categorías; resourceId actual)
  Category:                       FRONTERA de consumo recomendada (persistida: id+category_key)
  límite 2 alertas:               NO EXISTE en código — DEPRECAR la narrativa
  botones "Ir a...":              DEPRECAR (open-form OK; go-to-document ROTO, H2)

HALLAZGOS para Sprint 282 (no implementados aquí):
  H1  Divergencia alertId (proyección vs enrollment)     → UNIFICAR
  H2  go-to-document usa id del repo no del documento    → CORREGIR navegación
  H3  occurrences sin consumidor UI; workspace huérfano  → CONSUMIR en DynamicRecordsView/
                                                           ModuleDocumentViewer; decidir workspace
  H4  Sin límite de 2 en código                          → alinear contrato [0]
  H5  Categoría persistida, sin FK documental            → auditar sgc_records antes de reanclar

Sprink 280 dejó listo: resourceId/alertId/occurrenceId aislados + resolución determinística +
ledger específico. La migración NO requiere un segundo sistema de registros.

VERDICT: SPRINT 281 — AUDIT COMPLETE · READY FOR EXECUTION
Siguiente: Sprint 282 — Implementación de proyección de alertas sobre recursos reales
           (H1 unificación identidad, H2 navegación, H3 consumo de occurrences).
```