# SPRINT_45_3 — FORM BUILDER AUDIT (SSOT)

> Documento SSOT (Solo auditoría documental). **No** implementar código.
> **No** modificar componentes.
> **No** modificar runtime.
> **No** modificar base de datos.
>
> Objetivo: auditar **src/components/FormBuilder.jsx** y su relación directa con:
> - `src/pages/DynamicForm.jsx`
> - `src/services/dynamicService.js`
>
> Exclusión: no se auditan otros componentes salvo dependencias directas (p.ej. `order-motor/UniversalOrderMotor` y el adapter de reordenamiento, porque son invocados por FormBuilder).

---

## 0) Qué hace FormBuilder (responsabilidad)

**Archivo**: `src/components/FormBuilder.jsx`

**Responsabilidad**:
1. Cargar los campos persistidos de un formulario desde DB (`sgc_form_fields`).
2. Permitir **agregar** campos (crear fila en `sgc_form_fields`).
3. Permitir **eliminar** campos (delete en `sgc_form_fields`).
4. Permitir **reordenar** campos (cambio de `order_index` vía `reorderFormFieldsOrder`).
5. Mantener el estado local `fields` sincronizado con DB tras cada operación.

---

## 1) Entradas y salidas (contrato funcional)

### 1.1 Entradas
- `FormBuilder({ formDef })`
  - `formDef.id` se usa como FK lógica para cargar/crear/borrar/reordenar campos.

### 1.2 Salidas
- UI render de:
  - lista de campos actuales (`fields`)
  - formulario de “Agregar Nuevo Campo”
- persistencia y consistencia esperada por recarga:
  - tras add/delete/reorder se ejecuta `loadFields()`.

---

## 2) Flujo completo de creación/edición/eliminación de campos

### 2.1 Carga de campos existentes
**Componente**: `FormBuilder`

**Función**: `loadFields()`

**Acción**:
- Llama a `dynamicService.getFormFields(formDef.id)`

**Servicio**: `src/services/dynamicService.js`
- `getFormFields(formId)`:
  - `supabase.from('sgc_form_fields').select('*').eq('form_id', formId).order('order_index', { ascending: true })`

**Tablas consultadas**:
- `sgc_form_fields`

**Notas (estructura)**:
- FormBuilder asume que cada fila retornada contiene al menos:
  - `id`
  - `label`
  - `name`
  - `field_type`
  - `required`
  - `options`
  - `order_index`

---

### 2.2 Creación (Add) de un campo
**UI / Estado**:
- `isAdding` para abrir/cerrar el formulario
- `newField` con campos:
  - `name` (opcional en UI)
  - `label` (obligatorio)
  - `field_type` (default `text`)
  - `required` (default `true`)
  - `options` (objeto, pero se reconstituye al guardar)
- inputs auxiliares según `field_type`:
  - `optUnit` para `number`
  - `optChoices` para `select`

**Función**: `handleAddField(e)`

**Paso a paso**:
1. Deriva `slugName`:
   - si `newField.name` existe, la usa
   - si no, genera desde `newField.label` con regex a `_/underscore` (`replace(/[^a-z0-9]+/g, '_')`)
2. Construye `optionsJson`:
   - Si `field_type === 'number'` y `optUnit` no vacío: `optionsJson.unit = optUnit`
   - Si `field_type === 'select'` y `optChoices` no vacío:
     - `optionsJson.choices = optChoices.split(',').map(trim)`
3. Crea `order_index`:
   - calcula `Math.max(...fields.map(f => f.order_index)) + 1` si ya hay campos
   - si no, `order_index = 1`
4. Inserta en Supabase:

   - **Tabla modificada**: `sgc_form_fields`
   - Inserción (campos explícitos):
     - `form_id: formDef.id`
     - `name: slugName`
     - `label: newField.label`
     - `field_type: newField.field_type`
     - `required: newField.required`
     - `options: optionsJson`
     - `order_index: order_index`

**Servicio**:
- `supabase.from('sgc_form_fields').insert({...})`

**Salida**:
- tras inserción:
  - resetea inputs
  - ejecuta `loadFields()` para refrescar lista

---

### 2.3 Eliminación (Delete) de un campo
**Función**: `handleDeleteField(id)`

**Paso a paso**:
1. Confirma con `window.confirm('¿Eliminar este campo?')`
2. Llama a Supabase:
   - **Tabla modificada**: `sgc_form_fields`
   - `delete().eq('id', id)`
3. Ejecuta `loadFields()` para refrescar lista

---

### 2.4 Reordenamiento (Order Index)
FormBuilder permite mover un campo usando flechas (arriba/abajo).

**Dependencias directas invocadas**:
- `order-motor/UniversalOrderMotor`:
  - `moveUp`
  - `moveDown`
  - `toOrderedIds`
- `order-motor/adapters/FormBuilderOrderAdapter`:
  - `reorderFormFieldsOrder({ formId, orderedIds })`

**Función**: handler inline de botones (MoveUp / MoveDown)

**Paso a paso**:
1. Usa `fields` actual como `sequenceOrdered`.
2. Define `targetId = field.id`.
3. Calcula un nuevo orden con el motor:
   - `nextSequence = motorMoveUp(sequenceOrdered, targetId)` o `motorMoveDown(...)`
4. Convierte secuencia a ids:
   - `nextOrderedIds = toOrderedIds(nextSequence)`
5. Persistencia del orden:
   - llama `reorderFormFieldsOrder({ formId: formDef.id, orderedIds: nextOrderedIds })`
6. Si `res?.ok`:
   - `setFields(res.refreshedFields || [])`
7. Si falla:
   - `alert(res?.errorMessage || 'Error reordenando')`

**Nota**:
- El detalle exacto de qué tabla actualiza el adapter (posiblemente `sgc_form_fields.order_index`) no se audita en este sprint porque el archivo del adapter no se leyó.
- A efectos SSOT del flujo, el comportamiento objetivo es “mantener `order_index` coherente”.

---

## 3) Estructura persistida esperada en `sgc_form_fields`

A partir del código de `handleAddField`, FormBuilder **escribe explícitamente** estos campos en `sgc_form_fields`:
- `form_id` (relación con `sgc_forms`)
- `name` (slug interno del campo)
- `label` (texto visible/pregunta)
- `field_type` (string)
- `required` (boolean)
- `options` (obj JSON, con variantes según tipo)
- `order_index` (number)

### 3.1 Tipos de campo soportados por UI de FormBuilder
El `<select>` de `field_type` ofrece:
- `text`
- `textarea`
- `number`
- `boolean`
- `select`
- `date`
- `time`
- `signature`

**Importante (evidencia de options)**:
- FormBuilder solo construye `optionsJson` para:
  - `number`: `unit`
  - `select`: `choices`
- Para otros tipos (`text`, `textarea`, `boolean`, `date`, `time`, `signature`) **no se evidencia** construcción de options adicionales dentro de este archivo.

---

## 4) Qué espera DynamicForm de la estructura de campos

**Archivo**: `src/pages/DynamicForm.jsx`

DynamicForm carga la estructura de campos con:
- `dynamicService.getFormFields(form.id)`

Y utiliza en 2 puntos clave:

### 4.1 Inicialización de `values`
Para cada campo `f`:
- si `f.field_type === 'boolean'` → `initial[f.id] = false`
- en otro caso → `initial[f.id] = ''`

> Evidencia implícita: DynamicForm usa `f.id` como clave en `values` (no usa `name`).

### 4.2 Validación y criticidad basada en metadata
- Valida “required”:
  - `if (field.required) { const val = values[field.id]; if undefined/null/'' => error }`
- Criticidad por tipos (heurísticas):
  - boolean false → crítico
  - number fuera de `f.options?.min/max`

### 4.3 Render por engine
`DynamicForm` renderiza con engine base usando `formDef.engine_type`:
- BaseChecklist / BaseMediciones / BaseGeneric

Los engines base reciben `fields`, `values`, `onChange`.

> Nota: no se auditan engines en este sprint, pero la criticidad sugiere que `options.min/max` podrían estar presentes para `number` (aunque FormBuilder solo evidencia `unit` como options persistida para number). Eso implica que **o existen campos/options min/max creados por otra vía**, o **FormBuilder actualmente no persiste min/max**, o la UI de FormBuilder es incompleta respecto a DynamicForm.

---

## 5) Hardcodes detectados en FormBuilder (y efecto)

### 5.1 Generación del `name` desde label con regex
- Regex hardcoded: `replace(/[^a-z0-9]+/g, '_')`

**Impacto**:
- Define convención interna del campo; puede afectar cómo se resuelven valores en runtime si algún componente usa `name` (en este sprint se evidencia que DynamicForm usa `id`, pero dynamicService.submitFormResponse usa `Object.keys(values)` y mapea cada key a `field_id` en `sgc_response_values`.
- Dado que el `values` se indexa por `f.id`, el `name` no es clave en `values`; sin embargo se guarda en `sgc_form_fields.name` para UI/identificación.

### 5.2 `optionsJson` solo para number.unit y select.choices
- Hardcode: `if field_type === 'number' && optUnit` → `optionsJson.unit`
- Hardcode: `if field_type === 'select' && optChoices` → `optionsJson.choices`

**Impacto**:
- Si se requieren `options.min/max` para criticidad numérica en DynamicForm, el FormBuilder actual **no evidencia** que los admin puedan configurarlo.

**Propuesta futura (documentar solamente)**:
- Parametrizar en FormBuilder la persistencia de `options.min/max` cuando `field_type === 'number'`.

### 5.3 `order_index` basado en máximo actual
- Hardcode: `Math.max(...fields.map(f => f.order_index)) + 1`

**Impacto**:
- Mantiene orden incremental. Si hay campos reordenados por adapter, se asume que `fields` está actualizado.

---

## 6) Dependencias directas (servicios/queries)

### 6.1 Dependencias en lectura
- `dynamicService.getFormFields(formDef.id)` → `sgc_form_fields`.

### 6.2 Dependencias en escritura
- Inserción/eliminación directa en Supabase:
  - `sgc_form_fields.insert({form_id, name, label, field_type, required, options, order_index})`
  - `sgc_form_fields.delete().eq('id', id)`

### 6.3 Dependencias en reordenamiento
- `reorderFormFieldsOrder` (adapter) actualiza el orden en DB.
- (No auditable en detalle sin leer el adapter, pero el objetivo funcional es persistir un nuevo `order_index`.)

---

## 7) Qué debe proporcionar un administrador para un formulario funcional (según evidencia FormBuilder + DynamicForm)

Para que un formulario quede operativo end-to-end, el administrador debe completar:

1) `sgc_forms` existentes (ya creado por Configuration/sel. engine)
2) En FormBuilder (`sgc_form_fields`):
   - Para cada campo:
     - `label` (etiqueta/pregunta)
     - `field_type`
     - `required`
     - `options` (cuando aplique):
       - `number`: al menos `unit` (evidenciado)
       - `select`: `choices` (evidenciado)
   - Orden correcto (`order_index`), garantizado por add/reorder.

3) Compatibilidad con criticidad de DynamicForm:
   - DynamicForm evalúa `options.min/max` para `number` aunque FormBuilder solo evidencia persistir `unit`.

**Resultado**: con la evidencia actual,
- un formulario “funciona” para render/submit/validación required.
- pero la criticidad numérica por min/max podría no activarse si esos valores no se persisten desde FormBuilder.

---

## 8) Reutilización (qué parte es reusable sin cambios)
- La mecánica CRUD de campos es reusable y estandarizada en metadata:
  - `dynamicService.getFormFields`
  - persistencia en `sgc_form_fields`
  - el modelo `field_type/required/options/order_index`

---

## 9) Checklist final de “estructura y metadatos obligatorios” (según evidencia)

**Obligatorios para persistir** (FormBuilder escritura explícita):
- `form_id`
- `name`
- `label`
- `field_type`
- `required`
- `options`
- `order_index`

**Obligatorios para que DynamicForm funcione**:
- `id` de cada campo (clave usada en `values`)
- `field_type` (para inicialización)
- `required`
- `options` (al menos para `number` min/max en criticidad, aunque no se evidencia persistencia desde FormBuilder)

---

## 10) Conclusión (SSOT del FormBuilder)

FormBuilder es el mecanismo actual para construir el esquema de `sgc_form_fields` de un formulario:
- Carga por `form_id`
- Permite crear/eliminar campos
- Persiste el esquema en `sgc_form_fields` con orden `order_index`
- DynamicForm consume ese esquema con `getFormFields` y asume que:
  - los campos se indexan por `f.id`
  - `required` existe
  - `options` existe y podría usarse para reglas de número (min/max)

**Punto mínimo** para que un nuevo formulario reutilice la infraestructura existente:
- crear `sgc_form_fields` para ese `form_id` con los atributos escritos por FormBuilder (`form_id/name/label/field_type/required/options/order_index`) y con `field_type` soportado por los engines de `DynamicForm`.

</content>
