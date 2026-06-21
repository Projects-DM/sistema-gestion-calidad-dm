# AUDIT_V1_FLOW_ANALYSIS

## Caso: **Control de Cloro y pH**
(En BD/seed corresponde al form con `slug = cloro-ph-agua`, `engine_type = BaseMediciones`.)

### 1) Ruta React
- **Página:** `src/pages/DynamicForm.jsx`
- **Ruta de navegación (según Link en `DynamicModule`):**
  - `/modulo/:moduleSlug/:formSlug`
  - Ejemplo probable: `/modulo/medicion-control/cloro-ph-agua`
- `DynamicModule` arma el link: `to={`/modulo/${moduleSlug}/${form.slug}`}`.

### 2) Componente principal
- **`DynamicForm`** (`src/pages/DynamicForm.jsx`)
  - Orquesta: carga de form + campos, render del motor, recolección de valores, validaciones, guardado y bridge a Runtime.

### 3) Componente formulario (UI del formulario)
- **Motor seleccionado:** `BaseMediciones` (porque `formDef.engine_type === 'BaseMediciones'`).
- **Componente del formulario (render real):**
  - `src/components/engines/BaseMediciones.jsx`
  - Renderiza campos según `field.field_type` (especialmente `number`, `signature`, `text/textarea`).

### 4) Motor utilizado
- **`engine_type`:** `BaseMediciones`
- **Render del motor en `DynamicForm`:**
  ```jsx
  switch (formDef.engine_type) {
    case 'BaseMediciones':
      return <BaseMediciones {...props} />;
    // ...
  }
  ```

### 5) Persistencia utilizada (guardado)
Persistencia **manual/operativa** vía Supabase (no via Runtime core EAV).

En `src/pages/DynamicForm.jsx`:
- Se llama a `dynamicService.submitFormResponse(formDef.id, user.id, processedValues, evidences)`.

En `src/services/dynamicService.js` → `submitFormResponse()`:
1. Insert en **`sgc_form_responses`** (crea la “respuesta”)
2. Insert en **`sgc_response_values`** (EAV por campo)
3. Insert en **`sgc_evidences`** (evidencias adjuntas)
4. Insert en **`sgc_audit_logs`** (audit del create)

### 6) Tabla Supabase utilizada (por etapa)
Para “Control de Cloro y pH” (cloro-ph-agua):
- **Lecturas para construir el formulario** (en `DynamicForm`):
  - `sgc_forms` (por `slug`): `dynamicService.getFormBySlug(formSlug)`
  - `sgc_form_fields` (por `form_id`): `dynamicService.getFormFields(form.id)`
- **Escrituras al guardar (submitFormResponse):**
  - `sgc_form_responses`
  - `sgc_response_values`
  - `sgc_evidences`
  - `sgc_audit_logs`

### 7) Uso o no uso del Runtime
- **Sí se usa, pero como “bridge” posterior al guardado**, no como motor de UI/entrada.

Flujo Runtime bridge:
1. En `submitFormResponse()`, después de guardar en BD, se construye un objeto:
   - `internalEvent = { type: 'create', formId, responseId, actorId, correlationId, auditEventId, ... }`
2. `submitFormResponse()` devuelve:
   - `return { ...response, __runtime_internal_event: internalEvent }`
3. En `DynamicForm.handleSubmit`, si existe ese evento:
   - `await runtimeActivationLayer.activate(result.__runtime_internal_event);`

Ruta de runtime:
- `src/runtime/integration/RuntimeActivationLayer.ts`
  - Traduce evento: `BusinessEventTranslationLayer.translate(input)`
  - Ejecuta en router/persistence: `this.router.submit(payload)`

**Conclusión:**
- **UI y persistencia principal** del formulario: **hardcode por motor** (`BaseMediciones`) + **Supabase directo**.
- **Runtime**: se invoca **después** mediante `__runtime_internal_event` para ejecución de lógica/side-effects adicionales (traducción + router.submit).

