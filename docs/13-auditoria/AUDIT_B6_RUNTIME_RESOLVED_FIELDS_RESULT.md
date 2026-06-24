# AUDIT_B6_RUNTIME_RESOLVED_FIELDS_RESULT

## Estado actual
Auditoría actualizada tras SPRINT 51 (Runtime FieldType Compatibility Layer).

> Nota: sigue siendo auditoría de solo lectura. No se ejecuta runtime para resolver `FieldRegistry` ni para enumerar runtime-resolved `fieldId/fieldType` en tiempo de ejecución.


## Cadena auditada (resolución fieldType → renderer → componente)

### 1) RuntimeBuilder.resolve(formId)
- Archivo: `src/runtime/builder/engine/RuntimeBuilder.ts`
- Construye `resolved.fields` con:
  - `buildFields(runtimeForm.fieldIds)`
  - `FieldRegistry.get(fieldId)`
- No normaliza tipos.

### 2) FormRuntimeHost → FormRendererEngine
- El host (según arquitectura) entrega `resolved.fields` y crea `formData.__fieldDefs[field.id].fieldType`.

### 3) LayoutEngine
- Archivo: `src/runtime/layout/engine/LayoutEngine.tsx`
- Obtiene `fieldDef` desde:
  - `formData.__fieldDefs?.[fieldId]`
- No normaliza.

### 4) DynamicFieldRenderer
- Archivo: `src/runtime/rendering/DynamicFieldRenderer.tsx`
- Antes:
  - `ComponentRegistry.get(fieldDef.fieldType)`
- Ahora (SPRINT 51):
  - `normalizedType = normalizeFieldType(fieldDef.fieldType)`
  - `ComponentRegistry.get(normalizedType)`

### 5) FieldTypeNormalizer (nuevo)
- Archivo: `src/runtime/rendering/registry/FieldTypeNormalizer.ts`
- Normalizaciones implementadas:
  - `boolean` → `checkbox`
  - `numeric` → `number`
  - `file` → `file_upload`
  - `multi_select` → `multiselect`
  - `text_area` → `textarea`

### 6) Registry efectivo utilizado
- Archivo: `src/runtime/rendering/registry/ComponentRegistry.ts`
- Este archivo registra:
  - `checkbox`, `number`, `text`, `textarea`, `signature`, `file_upload`, `multiselect`, etc.
- Evidencia: `ComponentRegistry.tsx` existe pero `DynamicFieldRenderer.tsx` importa explícitamente:
  - `import { ComponentRegistry } from "./registry/ComponentRegistry";`
  - por resolución de módulo en TypeScript/Vite, esto apunta al archivo `ComponentRegistry.ts`.


## Evidencia de compatibilidad (lógica)

### Caso A: `limpieza-diaria`
- Esperado por contrato/seed: campos de checklist incluyen:
  - Cumple / No Cumple (boolean en BD histórico)
  - Observaciones (text)
  - Firma (signature)

**Compatibilidad por normalización: desconocido fieldType exacto en runtime**, pero si BD emite:
- `boolean` → `checkbox` ✅ (ahora DynamicFieldRenderer usa normalizado)
- `signature` queda igual ✅ (registry existe)
- `text` queda igual ✅ (registry existe)

Resultado: el renderer **debería** poder montar checkbox + signature + text.

### Caso B: `cloro-ph-agua`
- Esperado por seed: campos numéricos (cloro_residual, pH), observaciones, firma.

**Compatibilidad por normalización:**
- si BD emite `numeric` → `number` ✅
- si BD emite `number` queda igual ✅
- `signature` queda igual ✅
- `text` queda igual ✅

Resultado: el renderer **debería** montar FieldNumber + firma + observaciones.


## Evidencia explícita que NO se puede garantizar
- `fieldId` y `fieldType` exactos para `limpieza-diaria` y `cloro-ph-agua` en runtime,
  porque dependen de:
  - `RuntimeBuilder.resolve(formId)`
  - `FieldRegistry.register(...)` que no fue posible enumerar/validar en esta auditoría sin ejecutar el runtime.

