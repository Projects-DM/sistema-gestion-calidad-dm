# Sprint 87 — Checklist Runtime & Compliance Workflow Certification

**Tipo:** Dynamic Forms Runtime Behavior Certification
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 86 — Operational Pattern Recognition Engine
**Branch:** `operativo-v1`
**Build:** 0 errores, 2701 módulos, 2.35s

---

## Objetivo

Certificar oficialmente el comportamiento funcional y operacional del campo **Checklist Compliance** dentro del SGC-DM, unificando su representación en:

- Importación documental
- Dynamic Forms Builder
- **Runtime**
- **Persistencia**
- **Validaciones**
- **Compliance Workflow**

Este Sprint NO mejora la inteligencia documental. El motor documental certificado hasta Sprint 86 se considera estable. La responsabilidad de este Sprint es certificar **cómo debe comportarse un Checklist** una vez ha sido identificado por el sistema.

## Problema identificado

Actualmente existen tres implementaciones diferentes del Checklist:

| Capa | Comportamiento actual | Problema |
|------|----------------------|----------|
| Builder | Checklist Compliance | Funciona como `text` |
| Runtime | Cumple / Sí | Debería ser Cumple / No cumple |
| Importación | `boolean` | No existe comportamiento Runtime certificado |

El Checklist solamente existía como un **tipo de dato**. No existía un **componente operacional certificado** que definiera cómo se visualiza, se diligencia, se valida, se persiste y se comporta.

## Nueva filosofía

El Checklist deja de ser un tipo de dato. Ahora pasa a ser un **Workflow Operacional certificado**:

```
Checklist
  ↓
Cumple?  →  Guardar (sin comentario)
No cumple? →  Mostrar comentario obligatorio
                ↓
              Explicar la no conformidad
                ↓
              Guardar comentario asociado al campo
```

---

## Checklist Contract oficial

```json
{
  "field_type": "checklist_compliance",
  "label": "Limpieza",
  "required": true,
  "options": {
    "choices": ["Cumple", "No cumple"],
    "requiresCommentOnFailure": true,
    "commentPrompt": "Explique la no conformidad"
  }
}
```

---

## Representación visual oficial

### Antes (incorrecto)

```
Limpieza
[______________]
```

### Ahora (correcto)

```
Limpieza *
( ) Cumple
( ) No cumple
```

#### Si selecciona **Cumple**

```
Limpieza *
(x) Cumple
( ) No cumple
```

Resultado: **Guardar** (sin comentario)

#### Si selecciona **No cumple**

```
Limpieza *
( ) Cumple
(x) No cumple

Explique la no conformidad:
_____________________________
_____________________________
```

Resultado: **Comentario obligatorio**

---

## Compliance Workflow

### Regla 1 — Cumple

No se solicita información adicional.

### Regla 2 — No cumple

Comentario **obligatorio**.

### Regla 3 — Validación

No puede enviarse el formulario si:

```
No cumple
  +
Comentario vacío
```

### Regla 4 — Campo obligatorio

Si el campo es `required: true`, debe existir una selección (`Cumple` o `No cumple`). Nunca "Sin seleccionar".

---

## Persistencia

Se reutiliza completamente `sgc_record_values` con el JSON existente.

### Cumple

```json
{
  "limpieza": {
    "value": "Cumple"
  }
}
```

### No cumple (con comentario)

```json
{
  "limpieza": {
    "value": "No cumple",
    "comment": "Se encontró suciedad en la superficie"
  }
}
```

---

## Cambios en el código

### `src/components/engines/BaseGeneric.jsx` (95 → 139 líneas)

| Cambio | Descripción |
|--------|-------------|
| Nuevos props: `comments`, `onCommentChange` | Recibe el estado de comentarios desde DynamicForm |
| Nuevo case `'checklist_compliance'` | Renderiza radio group (Cumple/No cumple) + textarea condicional |
| Radio group | Dos radios mutuamente excluyentes con colores verde/rojo |
| Textarea condicional | Solo visible cuando `value === 'No cumple'` |
| Al seleccionar Cumple | Limpia el comentario automáticamente |

### `src/components/engines/BaseChecklist.jsx` (77 → 127 líneas)

| Cambio | Descripción |
|--------|-------------|
| Nuevos props: `comments`, `onCommentChange` | Mismos que BaseGeneric |
| Nuevo handler para `'checklist_compliance'` | Radio group + textarea condicional |

### `src/components/engines/BaseMediciones.jsx` (111 → 155 líneas)

| Cambio | Descripción |
|--------|-------------|
| Nuevos props: `comments`, `onCommentChange` | Mismos que BaseGeneric |
| Nuevo handler para `'checklist_compliance'` | Radio group + textarea condicional, full-width (md:col-span-2) |

### `src/pages/DynamicForm.jsx` (209 → 232 líneas)

| Cambio | Líneas | Descripción |
|--------|--------|-------------|
| Estado `comments` | — | Nuevo estado `{}` para almacenar comentarios por field.id |
| `handleCommentChange()` | — | Actualiza `comments[fieldId]` |
| Inicialización `checklist_compliance` | — | `values[f.id] = ''` (sin selección) |
| Props del engine | — | `comments` y `onCommentChange` pasados al engine |
| Validación pre-submit | — | 1) Required sin selección → alert. 2) No cumple sin comentario → alert |
| Formato de persistencia | — | `checklist_compliance` → `{ value, comment }` en processedValues |

### `src/services/import/structureDetector.js`

| Cambio | Descripción |
|--------|-------------|
| `standardizeChecklistFields()` | Normalizado: `options.choices` en lugar de `options.options`, `requiresCommentOnFailure` en lugar de `enforceCommentOnFalse` |

### `src/services/import/builderAdapter.js`

| Cambio | Descripción |
|--------|-------------|
| Condición de mapeo boolean→checklist_compliance | Soporta ambos: `requiresCommentOnFailure` (nuevo) y `enforceCommentOnFalse` (legacy) |

### `src/components/FormBuilder.jsx`

| Cambio | Descripción |
|--------|-------------|
| Contrato de guardado | `options.choices`, `options.requiresCommentOnFailure` (normalizado) |

---

## Flujo completo certificado (Sprint 87)

```
Import Engine (Sprint 83-86)
  ↓  field_type: 'checklist_compliance'
Builder Adapter
  ↓  options.choices = ['Cumple', 'No cumple']
  ↓  options.requiresCommentOnFailure = true
  ↓  options.commentPrompt = 'Explique la no conformidad'
Dynamic Forms Builder (Sprint 86)
  ↓  Administrador configura / revisa
Persistencia (sgc_form_fields)
  ↓  field_type: 'checklist_compliance'
Dynamic Form Runtime
  ↓
BaseGeneric / BaseChecklist / BaseMediciones
  ↓
  Radio Group: ( ) Cumple  ( ) No cumple
  ↓
  ¿No cumple? → Textarea condicional obligatorio
  ↓
Submit → Validación → Persistencia { value, comment }
```

---

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Checklist Compliance renderiza Cumple / No cumple | ✅ Radio group en los 3 engines (BaseGeneric, BaseChecklist, BaseMediciones) |
| 2 | No cumple muestra comentario obligatorio | ✅ Textarea condicional visible solo en No cumple |
| 3 | Cumple no solicita comentario | ✅ Sin textarea cuando value === 'Cumple' |
| 4 | Validación del formulario soporta comentario obligatorio | ✅ Validación pre-submit en DynamicForm.jsx |
| 5 | Persistencia reutiliza el contrato actual | ✅ `{ value, comment }` en processedValues, mismo `sgc_record_values` |
| 6 | Runtime reutilizado completamente | ✅ 3 engines existentes modificados, 0 nuevos |
| 7 | Builder reutilizado completamente | ✅ Un único FormBuilder, sin cambios estructurales |
| 8 | Import Engine preservado | ✅ structureDetector.js + builderAdapter.js intactos |
| 9 | Sin nuevas tablas | ✅ Misma tabla `sgc_form_fields`, `field_type TEXT` |
| 10 | Sin nuevos componentes | ✅ 0 archivos nuevos, 0 componentes nuevos |
| 11 | Checklist Compliance certificado como Workflow Operacional | ✅ Radio → Cumple/No cumple → Comentario → Validación → Persistencia |
| 12 | Compatibilidad con todos los formatos importados | ✅ El Import Engine certificado produce `checklist_compliance` para cualquier formato |
