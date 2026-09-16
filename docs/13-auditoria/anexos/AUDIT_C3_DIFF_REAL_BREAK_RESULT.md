# AUDIT_C3_DIFF_REAL_BREAK_RESULT

**Fecha:** 2026-06-11  
**Baselines:** `281da23` (limpieza), `0c70985` (PH/Cloro)  
**HEAD:** `92a8e21`

---

## 1. Timeline Completo

```
281da23  2026-06-05  feat(runtime): first production runtime form migration         ← BASELINE Limpieza (funciona)
0c70985  2026-06-05  feat(runtime): multi-form runtime validation                    ← BASELINE PH/Cloro (funciona)
aeaf8ea  2026-06-05  feat(runtime): submission validation diagnostics               (Sprint 47)
31b1602  2026-06-05  feat(runtime): introduce submission adapter layer              (Sprint 48) ← ROMPE SUBMIT
fbc1a89  2026-06-08  feat(runtime): introduce persistence provider abstraction      (Sprint 49) ← ELIMINA CONTRATOS
8fa7cb2  2026-06-08  feat(runtime): connect persistence provider to production persistence (Sprint 50) ← DOBLE SUBMIT ACTIVO
5aa4e74  2026-06-08  Sprint 51 - Runtime FieldType Compatibility Layer              ← ROMPE RENDERING
92a8e21  2026-06-10  (sin mensaje — solo archivos de auditoría)                     ← HEAD
```

---

## 2. Archivos Modificados

### Desde `281da23` → HEAD (Limpieza)

| Archivo | Cambios (líneas) |
|---------|-----------------|
| `src/pages/DynamicForm.jsx` | +21 |
| `src/runtime/persistence/contracts/runtimePersistenceContracts.ts` | -34 (ELIMINADO) |
| `src/runtime/persistence/provider/RuntimePersistenceProvider.ts` | +23 (NUEVO) |
| `src/runtime/persistence/providers/SupabasePersistenceProvider.ts` | +31 (NUEVO) |
| `src/runtime/rendering/DynamicFieldRenderer.tsx` | +20 |
| `src/runtime/rendering/registry/FieldTypeNormalizer.ts` | +27 (NUEVO) |
| `src/runtime/runtime-host/engine/FormRuntimeHost.tsx` | +26 |
| `src/runtime/submission/contracts/RuntimeSubmissionContracts.ts` | +17 (NUEVO) |
| `src/runtime/submission/engine/RuntimeSubmissionAdapter.ts` | +25 (NUEVO) |
| `src/runtime/submission/provider/RuntimeSubmissionProvider.ts` | +25 (NUEVO) |

**Total: 10 archivos — 213 inserciones, 36 eliminaciones**

### Desde `0c70985` → HEAD (PH/Cloro)

Idénticos a los anteriores excepto:

| Archivo | Cambios (líneas) |
|---------|-----------------|
| `src/pages/DynamicForm.jsx` | +19 (sin cambio en `runtimeNativeForms`, ya tenía cloro) |
| (resto igual) | — |

**Total: 10 archivos — 206 inserciones, 36 eliminaciones**

---

## 3. Commit Culpable para Limpieza (`limpieza-diaria`)

### PROBLEMA 1 — Rendering (Sprint 51)

**Commit culpable:** `5aa4e74`  
**Mensaje:** `Sprint 51 - Runtime FieldType Compatibility Layer`  
**Fecha:** 2026-06-08  

**Archivo:** `src/runtime/rendering/registry/FieldTypeNormalizer.ts` (NUEVO)  
**Función:** `normalizeFieldType()`

### PROBLEMA 2 — Doble submit / evidencias silenciadas (Sprint 48 → 50)

**Commit culpable:** `31b1602` (introducción del adapter) → activado destructivamente en `8fa7cb2`  
**Archivo:** `src/pages/DynamicForm.jsx`  
**Función:** `handleSubmit()`

---

## 4. Commit Culpable para PH/Cloro (`cloro-ph-agua`)

Ambos problemas son idénticos a los de limpieza.  
`cloro-ph-agua` estaba funcionando en `0c70985`. Los commits que lo rompen son los mismos:

- **Rendering:** `5aa4e74`  
- **Doble submit:** `31b1602` → `8fa7cb2`

---

## 5. Funciones Culpables

| Función | Archivo | Commit | Problema |
|---------|---------|--------|---------|
| `normalizeFieldType()` | `FieldTypeNormalizer.ts` | `5aa4e74` | Mapeo incorrecto rompe rendering de campos |
| `handleSubmit()` en `DynamicForm.jsx` | `DynamicForm.jsx` | `31b1602` | Doble submit: adapter + legacy en secuencia |
| `SupabasePersistenceProvider.save()` | `SupabasePersistenceProvider.ts` | `8fa7cb2` | Submit duplicado vía adapter, sin evidencias |
| `FormRuntimeHost` render block | `FormRuntimeHost.tsx` | `aeaf8ea` | Bloque de diagnóstico rompe flujo de render en ciertos estados |

---

## 6. Cambio Exacto Introducido

### CAMBIO A — Sprint 51 (`5aa4e74`) — `FieldTypeNormalizer`

**Antes (no existía el archivo):** `DynamicFieldRenderer` usaba directamente:
```typescript
// ANTES (en 281da23 / 0c70985)
const component = ComponentRegistry.get(fieldDef.fieldType);
```

**Después (HEAD):**
```typescript
// DESPUÉS — introduce normalización
const originalType = fieldDef.fieldType;
const normalizedType = normalizeFieldType(originalType);
const component = ComponentRegistry.get(normalizedType);
```

`normalizeFieldType()` mapea:
```typescript
case "boolean":    → "checkbox"
case "numeric":    → "number"
case "file":       → "file_upload"
case "multi_select": → "multiselect"
case "text_area":  → "textarea"
```

**El problema:** Los campos de `limpieza-diaria` y `cloro-ph-agua` llegan con `fieldType: "boolean"` y `fieldType: "numeric"` desde la base de datos. El `ComponentRegistry` tiene registrado `"boolean"` y `"numeric"`. Después de Sprint 51, se busca `"checkbox"` y `"number"` — que **no están registrados** en el `ComponentRegistry` con esos alias. El resultado es que el renderer retorna `<UnsupportedFieldTypeFallback>` en lugar del campo real.

---

### CAMBIO B — Sprint 48 (`31b1602`) + Sprint 50 (`8fa7cb2`) — Doble Submit

**Antes (en `0c70985`):** `handleSubmit` en `DynamicForm.jsx` tenía UN SOLO submit:
```javascript
const result = await dynamicService.submitFormResponse(formDef.id, user.id, processedValues, evidences);
```

**Después de Sprint 48 (`31b1602`):**
```javascript
// PRIMER SUBMIT (adapter — SIN evidencias)
const adapter = getRuntimeSubmissionAdapter();
await adapter.submit({
  formId: formDef.id,
  userId: user.id,
  values: processedValues,
});

// SEGUNDO SUBMIT (legacy — CON evidencias)
const result = await dynamicService.submitFormResponse(formDef.id, user.id, processedValues, evidences);
```

**Después de Sprint 50 (`8fa7cb2`):** El adapter ya no es solo diagnóstico — ahora llama REALMENTE a `dynamicService.submitFormResponse()` internamente a través de `SupabasePersistenceProvider.save()`:
```typescript
// SupabasePersistenceProvider.save() en Sprint 50
await dynamicService.submitFormResponse(
  payload.formId,
  payload.userId,
  payload.values,
  [],   // ← evidencias vacías forzadas
  {}
);
```

**Resultado:** Cada submit del usuario produce **DOS registros en base de datos**. La primera llamada (vía adapter) omite `evidences` (pasa `[]` hardcoded). La segunda (legacy) envía evidencias correctamente. Las evidencias del primer registro quedan vacías siempre.

---

## 7. Evidencia Git Diff

### 7.1 — `normalizeFieldType` (Sprint 51, commit `5aa4e74`)

```diff
--- /dev/null
+++ b/src/runtime/rendering/registry/FieldTypeNormalizer.ts
@@ -0,0 +1,27 @@
+export function normalizeFieldType(fieldType: RuntimeFieldType): RuntimeFieldType {
+  switch (fieldType) {
+    case "boolean":
+      return "checkbox";       ← ComponentRegistry NO tiene "checkbox" registrado
+    case "numeric":
+      return "number";         ← ComponentRegistry NO tiene "number" registrado
+    case "file":
+      return "file_upload";
+    case "multi_select":
+      return "multiselect";
+    case "text_area":
+      return "textarea";
+    default:
+      return fieldType;
+  }
+}
```

### 7.2 — Doble submit (Sprint 48→50, commits `31b1602` → `8fa7cb2`)

```diff
--- a/src/pages/DynamicForm.jsx   (0c70985)
+++ b/src/pages/DynamicForm.jsx   (HEAD)

+      const adapter = getRuntimeSubmissionAdapter();
+      await adapter.submit({
+        formId: formDef.id,
+        userId: user.id,
+        values: processedValues,
+      });
+
       const result = await dynamicService.submitFormResponse(formDef.id, user.id, processedValues, evidences);
```

```diff
--- a/src/runtime/persistence/providers/SupabasePersistenceProvider.ts (fbc1a89 — diagnóstico)
+++ b/src/runtime/persistence/providers/SupabasePersistenceProvider.ts (8fa7cb2 — producción)

-    console.debug("[SupabasePersistenceProvider]", payload);
-    // TODO (SPRINT 50): persist using dynamicService / Supabase calls.
-    return { success: false };
+    const response = await dynamicService.submitFormResponse(
+        payload.formId,
+        payload.userId,
+        payload.values,
+        [],      ← evidencias hardcodeadas vacías
+        {}
+    );
+    return { success: Boolean(response), responseId: (response as any)?.id };
```

### 7.3 — `runtimeNativeForms` — primer commit donde aparece `limpieza-diaria`

```diff
--- a/src/pages/DynamicForm.jsx   (281da23)
+++ b/src/pages/DynamicForm.jsx   (0c70985)

-  const runtimeNativeForms = ["cloro-ph-agua"];
+  const runtimeNativeForms = ["cloro-ph-agua", "limpieza-diaria"];
```

**Commit:** `0c70985` — `feat(runtime): multi-form runtime validation`  
**Función:** `renderEngine()` → variable `runtimeNativeForms`  
**Archivo:** `src/pages/DynamicForm.jsx` línea 195 (actual)

---

## 8. Causa Raíz Técnica

Se identifican **DOS causas raíz independientes** que actúan en paralelo:

### Causa Raíz 1 — Desincronización de alias en ComponentRegistry (Sprint 51)

`FieldTypeNormalizer` fue introducido asumiendo que el `ComponentRegistry` usa `"checkbox"` y `"number"` como claves de registro. Sin embargo, el `ComponentRegistry` tiene los campos registrados bajo los mismos valores que llegan de la base de datos (`"boolean"`, `"numeric"`).

El normalizer transforma el tipo **antes** de buscar en el registry, apuntando a claves que no existen. El resultado es que todos los campos de tipo `boolean` y `numeric` — que son la mayoría de los campos de `limpieza-diaria` y `cloro-ph-agua` — caen al fallback `<UnsupportedFieldTypeFallback>` y no se renderizan.

**El formulario aparece vacío o incompleto porque sus campos críticos no se pueden renderizar.**

### Causa Raíz 2 — Submit duplicado con pérdida de evidencias (Sprint 48 → 50)

El Sprint 48 introdujo un adapter de submission que en su momento era solo diagnóstico (retornaba `success: false` sin hacer nada). El Sprint 50 activó el adapter conectándolo a `SupabasePersistenceProvider.save()`, que internamente llama a `dynamicService.submitFormResponse()` — la misma función que ya llama `DynamicForm.handleSubmit()` inmediatamente después.

**El resultado es una secuencia de dos submits para un solo clic del usuario:**
1. `adapter.submit()` → `SupabasePersistenceProvider.save()` → `dynamicService.submitFormResponse(id, userId, values, [], {})` (sin evidencias)
2. `dynamicService.submitFormResponse(id, userId, values, evidences)` (con evidencias)

Dado que el primer submit puede fallar silenciosamente o crear un registro incompleto, el formulario puede mostrar comportamiento errático: éxito sin registro, doble registro, o registro sin evidencias.

---

## 9. Corrección Conceptual Sugerida (SIN IMPLEMENTAR)

### Para Causa Raíz 1 (rendering)

El `FieldTypeNormalizer` debe ser el **inverso** de lo que hace actualmente, O bien el `ComponentRegistry` debe registrar sus componentes con los alias normalizados que usa el normalizer (`"checkbox"`, `"number"`, etc.) — pero nunca ambos desincronizados.

**Opción A:** Verificar las claves reales bajo las que están registrados los componentes en `ComponentRegistry` y hacer que `normalizeFieldType()` mapee HACIA esas claves, no hacia alias inventados.

**Opción B:** Eliminar `normalizeFieldType()` si `ComponentRegistry` ya puede resolver los tipos nativos de BD directamente.

### Para Causa Raíz 2 (doble submit)

`DynamicForm.handleSubmit()` debe llamar al adapter de submission **en lugar de** llamar directamente a `dynamicService.submitFormResponse()` — no las dos en secuencia. El adapter debe ser el único punto de persistencia, y debe recibir `evidences` como parte de su payload. La llamada legacy directa debe ser eliminada.

---

## Respuestas a Preguntas Obligatorias

### P3 — ¿Dónde aparece por primera vez `limpieza-diaria`?

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/pages/DynamicForm.jsx` |
| **Función** | `renderEngine()` → variable `runtimeNativeForms` |
| **Commit** | `0c70985` — `feat(runtime): multi-form runtime validation` — 2026-06-05 |

### P4 — ¿Dónde aparece por primera vez `cloro-ph-agua`?

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/pages/DynamicForm.jsx` |
| **Función** | `renderEngine()` → variable `runtimeNativeForms` |
| **Commit** | `281da23` — `feat(runtime): first production runtime form migration` — 2026-06-05 |

### P5 — Cambios en `runtimeNativeForms`

**Antes (`281da23`):**
```javascript
const runtimeNativeForms = ["cloro-ph-agua"];
```
**Después (`0c70985`):**
```javascript
const runtimeNativeForms = ["cloro-ph-agua", "limpieza-diaria"];
```
**Archivo:** `src/pages/DynamicForm.jsx`  
**Commit:** `0c70985`

### P6 — Cambios en `renderEngine()`

**Archivo:** `src/pages/DynamicForm.jsx`  
**Función:** `renderEngine()`  
**Commit clave:** `281da23` (introducción de `forceRuntime`)  
El renderEngine no cambió su lógica interna después de ese punto — solo `runtimeNativeForms` creció.

### P7 — Cambios en DynamicForm submit flow

**Archivo:** `src/pages/DynamicForm.jsx`  
**Función:** `handleSubmit()`  
**Commits:**
- `31b1602` — agrega `adapter.submit()` antes del submit legacy
- `8fa7cb2` — activa el adapter para llamar realmente a BD

### P8 — Cambios en `RuntimeBuilder.resolve()`

No hubo cambios en `RuntimeBuilder.resolve()` entre `281da23` y HEAD en los archivos auditados. Los cambios están en la capa de submission y rendering, no en el builder.

### P9 — Cambios en `FormRuntimeHost`

**Archivo:** `src/runtime/runtime-host/engine/FormRuntimeHost.tsx`  
**Función:** componente `FormRuntimeHost`  
**Commits:**
- `aeaf8ea` — agrega bloque de diagnóstico de submission (logs antes del return)
- Estos logs se ejecutan en render-time, no en submit

### P10 — Cambios en `FormRuntimeResolver`

No se detectaron cambios en `FormRuntimeResolver` entre los commits auditados.

### P11 — Cambios en Registries

No se detectaron cambios en `FieldRegistry`, `FormRegistry`, o `LayoutRegistry` entre `281da23` y HEAD. La causa del rendering roto está en el `ComponentRegistry` no actualizado frente al nuevo `FieldTypeNormalizer`.

### P12 — Primer commit donde `limpieza-diaria` deja de funcionar

| Campo | Valor |
|-------|-------|
| **Commit hash** | `5aa4e74` |
| **Archivo** | `src/runtime/rendering/registry/FieldTypeNormalizer.ts` |
| **Función** | `normalizeFieldType()` |
| **Línea lógica** | `case "boolean": return "checkbox"` — el ComponentRegistry no tiene `"checkbox"` registrado |

> **Nota:** `limpieza-diaria` también es afectada por el doble submit desde `8fa7cb2`, pero el rendering se rompe en `5aa4e74`.

### P13 — Primer commit donde `cloro-ph-agua` deja de funcionar

Idéntico a P12 para el rendering:

| Campo | Valor |
|-------|-------|
| **Commit hash** | `5aa4e74` |
| **Archivo** | `src/runtime/rendering/registry/FieldTypeNormalizer.ts` |
| **Función** | `normalizeFieldType()` |
| **Línea lógica** | `case "boolean": return "checkbox"` |

Para el submit, el primer commit que introduce el problema es `31b1602`, activado destructivamente en `8fa7cb2`.

---

*Fin de auditoría. Generado a partir de `git diff 281da23..HEAD` y `git diff 0c70985..HEAD`.*
