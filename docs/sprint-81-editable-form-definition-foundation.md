# Sprint 81 — Dynamic Forms Visual Builder V2: Editable Form Definition Foundation

**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 80 — Traceability Intelligence Engine Certification
**Branch:** `operativo-v1`
**Build:** 0 errores, 2.13s, 2414 módulos

---

## Objetivo

Evolucionar el Dynamic Forms Visual Builder existente a un editor completo, permitiendo modificar todas las propiedades de formularios y campos sin crear nueva infraestructura. Todo formulario existente debe ser editable: metadatos, campos, tipos, etiquetas y estado requerido, reutilizando el mismo Builder, preparando la base para el futuro Import Assistant (Sprint 82).

## Filosofía Aplicada

- **REUSE FIRST:** Extender componentes existentes. No crear arquitectura nueva.
- **Single Responsibility:** Cada cambio se limita a una responsabilidad.
- **Zero new files:** Sprint implementado con 0 archivos nuevos. Solo modificación de 3 archivos existentes.

---

## Cambios Realizados

### 1. `src/services/dynamicService.js` — Nuevas funciones de persistencia

Se agregaron dos métodos al objeto `dynamicService`:

```js
// Línea 329
async updateForm(formId, updates) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('sgc_forms')
    .update(updates)
    .eq('id', formId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Línea 341
async updateField(fieldId, updates) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('sgc_form_fields')
    .update(updates)
    .eq('id', fieldId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

Ambos siguen el patrón exacto de `updateModule`: directo a Supabase con `.update().eq().select().single()`.

### 2. `src/components/FormBuilder.jsx` — Edición inline de campos

Agregado modo de edición inline para campos existentes. El formulario de edición reutiliza el mismo layout del formulario de creación.

**Estados nuevos:**
- `editingFieldId` — ID del campo en edición (null cuando no se edita)
- `editField` — objeto `{ label, field_type, required, options }`
- `editOptUnit` / `editOptChoices` — opciones específicas por tipo

**Handlers nuevos:**

| Handler | Línea | Función |
|---------|-------|---------|
| `handleStartEdit(field)` | 100 | Inicializa estados de edición desde el campo existente |
| `handleCancelEdit()` | 113 | Limpia todos los estados de edición |
| `handleUpdateField(e)` | 120 | Persiste cambios vía `dynamicService.updateField()` o local según modo |

**UI:**
- Cada tarjeta de campo ahora incluye un botón ⚙ (Settings) para editar
- Al editar, el panel inferior cambia a un formulario con tema ámbar (`bg-amber-50 border-amber-200`)
- El formulario de edición soporta: cambio de etiqueta, tipo de dato, unidad (number), opciones (select), y estado requerido
- Botón "Actualizar Campo" persiste los cambios; "Cancelar" limpia el estado de edición

### 3. `src/pages/Configuration.jsx` — Edición de metadatos del formulario

Agregado modo de edición de metadatos del formulario (nombre, slug, módulo, motor dinámico, descripción).

**Estados nuevos:**
- `isEditingForm` — boolean que activa el modo edición
- `editFormDef` — objeto con `{ id, module_id, name, slug, description, engine_type, roles_allowed }`

**Handlers nuevos:**

| Handler | Línea | Función |
|---------|-------|---------|
| `handleStartEditForm(form)` | 127 | Puebla `editFormDef` desde el formulario existente |
| `handleCancelEditForm()` | 141 | Limpia estados de edición |
| `handleUpdateFormDef(e)` | 163 | Persiste cambios vía Supabase `.update()` |

**UI:**
- Nueva columna de acciones en la tabla de formularios con botón ⚙ (Settings) titulado "Editar metadatos del formulario"
- Al editar, el formulario de edición reemplaza la tabla con tema ámbar (`bg-amber-50 border-amber-200`)
- Campos editables: módulo destino (select), nombre, slug (identificador), motor dinámico, descripción
- El slug es ahora visible y editable
- Botón "Guardar Cambios" persiste; "Cancelar" retorna a la lista

---

## Demo / Flujo de Usuario

### Editar metadatos de formulario:
1. Configuración → Formularios Dinámicos
2. ⚙ en la fila del formulario → formulario de edición ámbar
3. Modificar nombre, módulo, slug, motor o descripción
4. "Guardar Cambios" → `supabase.from('sgc_forms').update()`

### Editar campos existentes:
1. Configuración → Formularios Dinámicos → ✏️ en la fila → Builder
2. ⚙ en la tarjeta del campo → formulario de edición ámbar
3. Modificar etiqueta, tipo, unidad, opciones, requerido
4. "Actualizar Campo" → `dynamicService.updateField()`

---

## Criterios de Certificación

- [x] Formularios existentes editables (metadatos)
- [x] Campos existentes editables (label, type, required, options)
- [x] `updateField()` y `updateForm()` en dynamicService
- [x] Botón de edición en cada tarjeta de campo
- [x] Botón de edición en cada fila de formulario
- [x] Formularios de edición con tema diferenciado (ámbar)
- [x] 0 archivos nuevos
- [x] 0 errores de build
- [x] Reutilización completa del Builder existente
- [x] Sin modificar Runtime, persistencia subyacente, ni contratos

---

## Arquitectura

```
Configuration.jsx
  ├── handleStartEditForm() → form metadata edit (ámbar)
  │   └── supabase.from('sgc_forms').update()
  └── FormBuilder.jsx
      ├── handleStartEdit() → field edit (ámbar)
      │   └── dynamicService.updateField()
      ├── handleAddField() → new field (gris/primary)
      ├── handleDeleteField() → remove field
      └── Up/Down → UniversalOrderMotor + reorder adapter
```

Todos los caminos de edición confluyen en el mismo Builder. No existe un editor secundario.
