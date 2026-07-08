# SPRINT_45_4 — MODULE EXECUTION FLOW AUDIT (SSOT)

> Documento SSOT (Solo auditoría documental). **No** implementar código.
> **No** modificar componentes.
> **No** modificar runtime.
> **No** modificar base de datos.
> **No** refactorizar.
> **No** proponer arquitectura nueva.
>
> Exclusión obligatoria: **Trazabilidad no se toma como referencia arquitectónica**.
>
> Este documento audita el flujo real desde que el usuario selecciona un módulo hasta que se renderiza el formulario y se persisten los datos.

---

## 0) Diagrama secuencial del flujo completo (real)

```text
Sidebar / navegación (UI)
   ↓
App.jsx (router)
   ↓
DynamicModule (resuelve módulo por moduleSlug + tabs)
   ↓
Router interno hacia DynamicForm (/modulo/:moduleSlug/:formSlug)
   ↓
DynamicForm (carga formDef + fields por formId; render engine)
   ↓
Engine correspondiente (BaseChecklist/BaseGeneric/BaseMediciones)
   ↓
EvidenceUploader (adjuntar evidencias)
   ↓
DynamicForm submit
   ↓
dynamicService.submitFormResponse
   ↓
Supabase
   ├─ sgc_form_responses (create)
   ├─ sgc_response_values (EAV por field_id)
   ├─ sgc_evidences (si hay evidencias)
   └─ sgc_audit_logs (action_type=create)
```

---

## 1) Etapa por etapa (responsabilidades, props, servicios, tablas)

> Convención: “tablas modificadas” solo se indica cuando hay evidencia explícita en el código leído.

### Etapa 1 — Sidebar / UI → ruta
**Componente responsable**: no se audita sidebar directamente (no se leyó componente). 
**Evidencia directa disponible**: las rutas dinámicas están definidas en `src/App.jsx` y los enlaces de módulo/formulario se hacen desde `DynamicModule.jsx`.

**Parámetros involucrados**:
- `moduleSlug` (en la ruta `/:moduleSlug` y también usado para navegar a formas)
- `formSlug` (en la ruta `/modulo/:moduleSlug/:formSlug`)

---

### Etapa 2 — Router (App.jsx)
**Componente**: `src/App.jsx`

**Props recibidas (conceptual)**:
- `moduleSlug` y `formSlug` desde la URL (React Router)

**Servicios utilizados**: ninguno en router.

**Tablas consultadas**: ninguna.

**Tablas modificadas**: ninguna.

**Dependencias clave**:
- Rutas declaradas:
  - `path=":moduleSlug"` → `DynamicModule`
  - `path="modulo/:moduleSlug/:formSlug"` → `DynamicForm`

---

### Etapa 3 — DynamicModule (resolución de módulo + catálogo)
**Componente**: `src/pages/DynamicModule.jsx`

**Props**:
- `moduleSlug` desde `useParams()`
- `rol` desde `useAuth()`

**Servicios utilizados**:
- `dynamicService.getModuleBySlug(moduleSlug)`
- `dynamicService.getFormsByModule(moduleData.id)`

**Tablas consultadas** (vía dynamicService):
- `sgc_modules` (por slug)
- `sgc_forms` (por module_id + is_active)

**Tablas modificadas**: ninguna.

**Responsabilidades**:
1. Mostrar header con `modInfo.name/description`.
2. Mostrar tabs:
   - “Diligenciar Registros” (listado de forms)
   - “Historial y Consultas” (`DynamicRecordsView moduleId={modInfo.id}`)
   - “Repositorio Documental” (`ModuleDocumentViewer moduleSlug={moduleSlug}`)
3. Filtrar formularios por roles:
   - `filteredForms = forms.filter(f => !f.roles_allowed || f.roles_allowed.includes(rol))`

**Dependencias del flujo**:
- `moduleSlug` (define qué módulo se resuelve)
- `rol` (filtro de formas visibles)

---

### Etapa 4 — Selección de formulario → navegación a DynamicForm
**Componente**: `DynamicModule` (render de Links)

**Enlace generado**:
- `to={`/modulo/${moduleSlug}/${form.slug}`}`

**Parámetros**:
- `moduleSlug`
- `formSlug` (`form.slug` desde DB)

---

### Etapa 5 — DynamicForm (carga definición + render de engine)
**Componente**: `src/pages/DynamicForm.jsx`

**Props/params**:
- `moduleSlug`, `formSlug` por `useParams()`
- `user`, `rol` por `useAuth()`

**Servicios utilizados**:
- `dynamicService.getFormBySlug(formSlug)`
- `dynamicService.getFormFields(form.id)`

**Tablas consultadas**:
- `sgc_forms` (por slug)
- `sgc_form_fields` (por form_id)

**Tablas modificadas**: ninguna en carga.

**Dependencias clave para el flujo**:
- `formSlug` (identifica `formDef`)
- `formDef.id` (identifica `formFields`)
- `formDef.engine_type` (selecciona motor UI)
- `form.roles_allowed` y `rol` (gating de acceso al form)

**Selección del engine (exacta, sin proponer motores nuevos)**:
```js
switch (formDef.engine_type) {
  case 'BaseChecklist': return <BaseChecklist {...props} />;
  case 'BaseMediciones': return <BaseMediciones {...props} />;
  default: return <BaseGeneric {...props} />;
}
```

**Props entregadas al engine base**:
- `fields` (lista de `sgc_form_fields`)
- `values` (estado inicial derivado de field_type)
- `onChange` (handleChange)

**Evidencia** (cómo inicializa `values`):
- si `field_type === 'boolean'` → `false`
- en otro caso → `''`

---

### Etapa 6 — Engine correspondiente (BaseChecklist / BaseMediciones / BaseGeneric)

#### 6.1 BaseChecklist
**Archivo**: `src/components/engines/BaseChecklist.jsx`

**Responsabilidad**:
- Render de inputs por `field.field_type`
- Manejo específico de `boolean` y `signature`

**Entradas**:
- `fields`, `values`, `onChange`

**Salidas**:
- actualiza `values` vía `onChange(field.id, valor)`

**Dependencias**:
- `field_type` (boolean, signature, fallback textarea/text)

**Tablas**: ninguno (UI only).

#### 6.2 BaseMediciones
**Archivo**: `src/components/engines/BaseMediciones.jsx`

**Responsabilidad**:
- Render de inputs cuantitativos y validación UI por rangos (usa `field.options.min/max`)

**Entradas**:
- `fields`, `values`, `onChange`

**Salidas**:
- actualiza `values` vía `onChange(field.id, e.target.value)` (string en input number; DynamicForm luego parsea a number)

**Dependencias**:
- `field.options.min/max` para marcar críticos
- `field.options.unit` para mostrar unidad

#### 6.3 BaseGeneric
**Archivo**: `src/components/engines/BaseGeneric.jsx`

**Responsabilidad**:
- Render de inputs genéricos por field_type (text/number/boolean/select/textarea/date/time/signature)

**Dependencias**:
- `field.options.choices` para select

---

### Etapa 7 — EvidenceUploader (adjuntos)
**Componente**: `src/components/EvidenceUploader.jsx`

**Props**:
- `onEvidencesChange` (setEvidences en DynamicForm)

**Servicios utilizados**:
- `getSupabaseClient()` (directo)
- `supabase.storage.from('documentos-sgc').upload(...)`
- `supabase.storage.from('documentos-sgc').getPublicUrl(...)`
- (al remover) `supabase.storage.from('documentos-sgc').remove(...)`

**Tablas consultadas**: ninguna (storage).

**Tablas modificadas**:
- ninguna tabla `sgc_*` en evidencia uploader (solo storage bucket).

**Parámetros importantes**:
- bucket: `documentos-sgc`
- storage_path: `evidencias/${fileName}`
- archivo permitido: `accept="image/*,application/pdf"`

---

### Etapa 8 — Submit del formulario (DynamicForm → dynamicService)
**Componente**: `src/pages/DynamicForm.jsx`

**Responsabilidad**:
- Validar campos requeridos y reglas críticas (heursticas)
- Preparar `processedValues`
- Llamar a `dynamicService.submitFormResponse`
- Si retorna internal event, ejecutar `runtimeActivationLayer.activate`

**Servicios utilizados**:
- `dynamicService.submitFormResponse(formDef.id, user.id, processedValues, evidences)`
- `runtimeActivationLayer.activate(result.__runtime_internal_event)`

**Parámetros/Dependencias**:
- `formDef.id`
- `user.id`
- `values` indexados por `field.id`
- `evidences` lista construida en EvidenceUploader

---

### Etapa 9 — dynamicService.submitFormResponse (persistencia + auditoría)
**Componente/servicio**: `src/services/dynamicService.js`

**Responsabilidad**:
- Persistir response principal
- Persistir valores EAV por campo
- Persistir evidencias
- Registrar auditoría (create)
- Emitir `__runtime_internal_event`

**Tablas consultadas**: ninguna.

**Tablas modificadas (explícitas)**:
1. `sgc_form_responses`
   - insert: `{ form_id, created_by: userId, status:'pendiente_revision' }`
2. `sgc_response_values`
   - insert masivo por `field_id` y value_*
   - mapea por tipo de `val`:
     - number → `value_number`
     - boolean → `value_boolean`
     - object → `value_json`
     - fallback → `value_text`
3. `sgc_evidences`
   - insert por evidencias si `evidences.length > 0`
   - mapea:
     - `file_url`
     - `storage_path`
     - `file_type`
4. `sgc_audit_logs`
   - insert de audit create:
     - `action_type:'create'`
     - `modified_by: userId`
     - `new_data: values`
     - `reason: 'Creación inicial del registro'`

**Salida**:
- retorna `{ ...response, __runtime_internal_event: internalEvent }`

**Dependencias clave del flujo**:
- `formId` (form_id)
- `userId` (created_by)
- `values` debe contener keys que correspondan a `sgc_form_fields.id`
- `evidences` debe contener file_url/storage_path/file_type

---

## 2) Parámetros críticos que determinan el flujo

El flujo depende explícitamente de:
- `moduleSlug`
  - usado en `DynamicModule.getModuleBySlug(moduleSlug)`
  - además controla hardcode de repositorio documental
- `formSlug`
  - usado en `DynamicForm.getFormBySlug(formSlug)`
- `formId`
  - usado en `DynamicForm.getFormFields(form.id)`
  - usado como `submitFormResponse(formDef.id, ...)`
- `engine_type`
  - usado en `DynamicForm.renderEngine()` (switch)
  - determina qué engine UI renderiza
- `roles_allowed`
  - gating en `DynamicForm`:
    - `if (form.roles_allowed && !form.roles_allowed.includes(rol)) alert + navigate`
  - gating en `DynamicModule`:
    - filtro de forms listadas por role

---

## 3) Hardcodes detectados durante el flujo de navegación/ejecución

### 3.1 Hardcode de Repositorio Documental por slug
**Archivo**: `src/pages/DynamicModule.jsx`

**Código**:
- `isDocumentEnabled(slug)` con array:
  - `['mantenimiento','calidad','operaciones','gestion-documental','medicion-control']`

**Impacto**:
- un `sgc_modules` nuevo con repositorio documental podría no habilitar el tab “Repositorio Documental”.

**Parametrización futura (solo propuesta conceptual)**:
- habilitar repositorio documental por metadata/DB (ej. existencia de repositorios activos), no por lista fija.

### 3.2 Hardcode de selección engine por `switch engine_type`
**Archivo**: `src/pages/DynamicForm.jsx`

**Impacto**:
- `engine_type` fuera de `BaseChecklist`/`BaseMediciones` cae a `BaseGeneric`.
- No hay soporte para engines adicionales sin cambiar UI (aunque el runtime exista).

### 3.3 Heurísticas de criticidad/verificación en UI
**Archivo**: `src/pages/DynamicForm.jsx` y `src/components/DynamicRecordsView.jsx`

- DynamicForm deriva criticidad usando:
  - boolean false => crítico
  - number fuera de `options.min/max` => crítico
- DynamicRecordsView computa estados de forma similar.

**Impacto**:
- cambia la criticidad solo reconfigurando `sgc_form_fields.options` y field_type.
- si FormBuilder no persiste min/max, el comportamiento crítico puede no dispararse.

---

## 4) Reutilización asegurada para futuros módulos (sin modificar arquitectura)

Pasos completamente reutilizables (estándar):
1. Routing por `moduleSlug` y `formSlug` (App.jsx + DynamicModule/DynamicForm)
2. Render engine por `engine_type` para los motores existentes
3. persistencia y auditoría mediante `dynamicService.submitFormResponse`
4. evidencia mediante `EvidenceUploader` + persistencia asociada en `sgc_evidences`
5. runtime bridge de `runtimeActivationLayer.activate` (consume internal event)

---

## 5) Punto mínimo de parametrización para que un nuevo módulo funcione

Con base en el flujo auditado, el mínimo para que un nuevo módulo funcione end-to-end es:

1) **Metadata del módulo**
- `sgc_modules`:
  - `slug = moduleSlug`
  - `is_active=true`

2) **Definición de formularios**
- `sgc_forms`:
  - `module_id` enlazando al módulo
  - `slug = formSlug`
  - `is_active=true`
  - `engine_type` soportado (al menos uno de los motores referenciados)
  - `roles_allowed` conteniendo el `rol` del usuario

3) **Esquema de campos**
- `sgc_form_fields`:
  - `form_id` referenciando el form
  - `field_type` soportado por engines
  - `required` (boolean)
  - `options` según tipo soportado (por evidencia):
    - `select.options.choices`
    - `number.options.unit` (evidenciado)
    - `min/max` se usa para criticidad en motores/validación (evidencia de consumo), aunque la persistencia exacta de min/max se revisa en Sprint 45.3.
  - `label` y `name` (FormBuilder persiste ambos; DynamicForm/engines renderizan label y usan id para values)
  - `order_index`

4) (Opcional/condicional por UI)
- evidencia para criticidad numérica/fotos depende de reglas y del `EvidenceUploader`.

**Conclusión del punto mínimo**:
- El “punto mínimo” es garantizar metadata completa en DB para `sgc_modules + sgc_forms + sgc_form_fields`, cumpliendo compatibilidad con `engine_type` y `field_type` soportados por las engines base y gating por `roles_allowed`.

---

## 6) Resultado y cierre
- El flujo real es: **DynamicModule → DynamicForm → Engine → EvidenceUploader (opcional) → dynamicService → Supabase → Runtime bridge**.
- La arquitectura reusable ya está operativa.
- Los hardcodes existentes se concentran en:
  - habilitación documental por lista fija de slugs,
  - dispatcher de engines por `switch`,
  - reglas de criticidad en UI que dependen de `field_type` y `options`.

(El documento excluye Trazabilidad como estándar, tal como fue solicitado.)

