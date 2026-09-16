# AUDIT_V1_RUNTIME_ANALYSIS

## Alcance
Análisis de uso/estado para:
- FormRegistry, FieldRegistry, LayoutRegistry, RuleRegistry
- RuntimeBuilder
- FormRuntimeHost
- FormRendererEngine
- LayoutEngine
- DynamicFieldRenderer

Criterios de clasificación:
- **USADO**: el flujo real de ejecución lo invoca directamente desde la app.
- **PARCIAL**: se usa como pieza “adjunta” (invocado, pero no como motor principal de UI/persistencia del caso principal).
- **NO USADO**: no se observa invocación en el flujo real (por nombre/uso) o no hay wiring aparente.

---

## 1) Quién usa RuntimeBuilder?
### Observación
- `src/runtime/builder/engine/RuntimeBuilder.ts` existe y resuelve un modelo resuelto a partir de resolvers/registries.
- En el flujo real de UI para formularios dinámicos (caso “Control de Cloro y pH”) el usuario llena `DynamicForm` y guarda vía `dynamicService.submitFormResponse()`.
- En el código inspeccionado, **no** se ve que `DynamicForm` use `RuntimeBuilder` para construir un layout/fields en runtime.

### Clasificación
- **RuntimeBuilder: NO USADO (en flujo real de UI/persistencia)**.

---

## 2) Quién usa FormRuntimeHost?
### Observación
- No existe un símbolo/archivo con nombre exacto `FormRuntimeHost` en los artefactos inspeccionados.

### Clasificación
- **FormRuntimeHost: NO USADO**.

> Nota: sí existe `FormRuntimeResolver` (`src/runtime/forms/runtime/FormRuntimeResolver.ts`) como equivalente funcional para “resolver” en memoria, pero no bajo el nombre `FormRuntimeHost`.

---

## 3) Quién usa FormRendererEngine?
### Observación
- `FormRendererEngine` (`src/runtime/form/engine/FormRendererEngine.tsx`) delega en `LayoutEngine`.
- En el flujo real inspeccionado (DynamicForm/Base* engines), la UI se monta con componentes:
  - `BaseMediciones`, `BaseChecklist`, `BaseGeneric`
- No se observa que `DynamicForm` renderice `FormRendererEngine`.

### Clasificación
- **FormRendererEngine: NO USADO (en flujo real de “Control de Cloro y pH”)**.

---

## 4) Quién usa LayoutEngine?
### Observación
- `LayoutEngine` existe (`src/runtime/layout/engine/LayoutEngine.tsx`) y delega a `DynamicFieldRenderer`.
- No se observa que `LayoutEngine` sea invocado desde la ruta real de UI operativa.

### Clasificación
- **LayoutEngine: NO USADO (en flujo real de formulario dinámico)**.

---

## 5) Qué rutas llegan realmente al Runtime?
### Observación
En el flujo real de `DynamicForm.handleSubmit`:
- Se guarda en Supabase vía `dynamicService.submitFormResponse(...)`.
- Si el resultado devuelve `__runtime_internal_event`, se invoca:
  - `runtimeActivationLayer.activate(result.__runtime_internal_event)`

`runtimeActivationLayer`:
- `src/runtime/integration/RuntimeActivationLayer.ts`
  - inicializa bootstrap
  - traduce evento con `BusinessEventTranslationLayer`
  - ejecuta `this.router.submit(payload)`

### Clasificación por “uso del runtime”
- **Runtime Activation Layer: PARCIAL**
  - Se usa como bridge posterior a persistencia.
  - No se usa como motor primario de render del formulario.

### Respuesta directa
- **Rutas que llegan realmente al runtime (observables):**
  - `DynamicForm.jsx -> dynamicService.submitFormResponse() -> runtimeActivationLayer.activate()`
- No se observa acceso a:
  - `RuntimeBuilder.resolve()`
  - `FormRendererEngine`/`LayoutEngine` para render del formulario.

---

## 6) Qué partes del Runtime están sin conectar?
### Sin conexión aparente en el flujo operativo de UI
- **RuntimeBuilder**: no se usa para construir/obtener layout/fields para render.
- **FormRendererEngine**: no se usa para renderizar la UI dinámica.
- **LayoutEngine**: no se usa para render layout/sections/columns.
- **DynamicFieldRenderer**: no se usa en la ruta operativa actual (la UI real usa Base* engines).

### Conexión parcial pero no completa
- **Registries** (FormRegistry/FieldRegistry/RuleRegistry/LayoutRegistry):
  - Existen como mapas en memoria
  - No se observa su wiring/registro desde el flujo principal de `DynamicForm`.

---

## 7) ¿Existe duplicidad con BaseChecklist / BaseMeasurement / BaseWorkflow?
### Observación
- La UI operativa usa “motores” hardcodeados:
  - `BaseChecklist` (src/components/engines/BaseChecklist.jsx)
  - `BaseMediciones` (src/components/engines/BaseMediciones.jsx)
  - `BaseGeneric` (src/components/engines/BaseGeneric.jsx)
- El Runtime contiene un mecanismo paralelo/alternativo de:
  - render de layout (`LayoutEngine`)
  - render de campos por registry (`DynamicFieldRenderer`)

### Clasificación
- **Duplicidad funcional: SÍ (PARCIAL)**
  - Runtime “puede” sustituir los motores hardcodeados (por diseño: layout + renderer + field registry).
  - Pero hoy el flujo real no está usando esas piezas, así que la duplicidad es “arquitectural” más que operacional.

### BaseWorkflow
- No se identificó un componente/entrada UI llamada `BaseWorkflow` en el inventario; por lo tanto:
  - **BaseWorkflow: NO EVALUADO / NO OBSERVADO** como duplicidad directa en lo inspeccionado.

---

## 8) Clasificación por registry
> Dado que los registries observados son mapas en memoria y no hay wiring en el flujo `DynamicForm` inspeccionado, se clasifican como:

- **FormRegistry: NO USADO (en flujo real de formulario dinámico)**
- **FieldRegistry: NO USADO (en flujo real de formulario dinámico)**
- **LayoutRegistry: NO USADO (en flujo real de formulario dinámico)**
- **RuleRegistry: NO USADO (en flujo real de formulario dinámico)**

---

## Resumen final (matriz)
- RuntimeBuilder: **NO USADO**
- FormRuntimeHost: **NO USADO**
- FormRendererEngine: **NO USADO**
- LayoutEngine: **NO USADO**
- DynamicFieldRenderer: **NO USADO**
- RuntimeActivationLayer: **PARCIAL**
- Registries (Form/Field/Layout/Rule): **NO USADO** en UI operativa actual
- Duplicidad con BaseChecklist/BaseMediciones/BaseGeneric: **PARCIAL** (arquitectural; en runtime no conectado en UI)

