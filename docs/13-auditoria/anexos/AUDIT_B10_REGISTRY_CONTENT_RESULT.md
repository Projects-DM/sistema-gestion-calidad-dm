# AUDIT_B10_REGISTRY_CONTENT_RESULT

## 0) Resumen ejecutivo (solo auditoría estática)
Dentro de `src/runtime/**` las registries de **render** existen como **estructuras in-memory**:
- `FormRegistry`: `Map<string, FormDefinition>`
- `FieldRegistry`: `Map<string, RuntimeFieldDefinition>`
- `LayoutRegistry`: `createLayoutRegistry()` crea un `Map` interno

En el código inspeccionado **no aparece** un bootstrap que llene `FormRegistry`/`FieldRegistry`/`LayoutRegistry` con datos de Supabase para poder resolver `RuntimeBuilder.resolve(formId)` durante el render-time.

Lo que sí existe es bootstrap de **persistence runtime** (`RuntimePersistenceBootstrap`) para ejecutar transacciones (router submit), no para hidratar los registries de render.

> Nota: no se detectan funciones `createFormRegistry`, `getFormRegistry`, `createFieldRegistry`, etc. en el árbol actual bajo los nombres solicitados; hay `FormRegistry`/`FieldRegistry` como constantes con `register/get/has/getAll`, y hay providers `FormRegistryProvider`, `FieldRegistryProvider`, `LayoutRegistryProvider` con get/set.

---

## 1) FormRegistry
### Archivo exacto
- `src/runtime/forms/registry/FormRegistry.ts`

### Función exacta
- `FormRegistry.register(form: RegisterFormInput)`
- `FormRegistry.get(formId: string)`
- `FormRegistry.has(formId: string)`
- `FormRegistry.getAll()`

### ¿Quién llena FormRegistry?
- **En `src/runtime/**` no se observa** un llamador** que ejecute `FormRegistry.register()`.
- Se define internamente como `const registry = new Map<string, FormDefinition>();`.

### ¿Cuándo se llena?
- Solo si algún pipeline externo/otro módulo (fuera de lo localizado en inspección estática) llama a `FormRegistry.register()`.

### Evidencia
- `FormRegistry` inicializa el `Map` en módulo.
- No hay código de “hydration” en los archivos leídos que invoca `FormRegistry.register()`.

(Referencia)
- `FormRegistry.ts`: define `registry` y métodos `register/get/has/getAll`.

---

## 2) FieldRegistry
### Archivo exacto
- `src/runtime/fields/registry/FieldRegistry.ts`

### Función exacta
- `FieldRegistry.register(field: RegisterFieldInput)`
- `FieldRegistry.get(fieldId: string)`
- `FieldRegistry.has(fieldId)`
- `FieldRegistry.getAll()`

### ¿Quién llena FieldRegistry?
- **En `src/runtime/**` no se observa** un llamador** que ejecute `FieldRegistry.register()`.
- Se define internamente como `const registry = new Map<string, RuntimeFieldDefinition>();`.

### ¿Cuándo se llena?
- Solo si algún pipeline externo/otro módulo llama a `FieldRegistry.register()`.

### Evidencia
- `FieldRegistry.ts`: define `registry` y métodos `register/get/has/getAll`.

---

## 3) LayoutRegistry
### Archivo exacto
- `src/runtime/layout/registry/LayoutRegistry.ts`
- Provider accessor: `src/runtime/layout/registry/LayoutRegistryProvider.ts`

### Función exacta
- `createLayoutRegistry().register(layout: LayoutDefinition)`
- `createLayoutRegistry().get(layoutId: LayoutId)`
- `createLayoutRegistry().has(layoutId: LayoutId)`
- `createLayoutRegistry().getAll()`

### ¿Quién llena LayoutRegistry?
- **En `src/runtime/**` no se observa** un llamador** que ejecute `layoutRegistry.register(...)`.
- `getLayoutRegistry()` crea el registro pero no lo hidrata.

### ¿Cuándo se llena?
- Solo si algún módulo registra layouts vía `register()`.

### Evidencia
- `LayoutRegistryProvider.ts` solo hace `layoutRegistry = createLayoutRegistry()` (sin seed/hydration).

---

## 4) Conteo de registros (sin ejecutar)
No es posible determinar un conteo “real” (X) sin ejecutar el runtime o localizar el código que registra los elementos en esas registries.

Sin ejecución, la única determinación posible es:
- **Los registries existen** (Map creados), pero **no hay evidencia** de que se llenen dentro del código inspeccionado.

Por lo tanto, el “conteo real” solo puede ser inferido como:
- FormRegistry count: **(no determinable estáticamente)**
- LayoutRegistry count: **(no determinable estáticamente)**
- FieldRegistry count: **(no determinable estáticamente)**

---

## 5) Formularios piloto (limpieza-diaria / cloro-ph-agua)
### Respuesta (FOUND / NOT FOUND)
En el alcance de `src/runtime/**` inspeccionado, **no hay** evidencia de que:
- `FormRegistry.register()` registre `limpieza-diaria`
- `FormRegistry.register()` registre `cloro-ph-agua`

Por lo tanto:
- `limpieza-diaria`: **NOT FOUND (en wiring registrado dentro de src/runtime/** detectado)**
- `cloro-ph-agua`: **NOT FOUND (en wiring registrado dentro de src/runtime/** detectado)**

### formId / layoutId / fieldIds
No se puede listar `layoutId` ni `fieldIds` porque el mapeo real depende de registries pobladas.

---

## 6) Runtime bootstrap
### ¿Existe bootstrap para registries?
**NO** (para registries de render).

### Evidencia
- `src/runtime/persistence/provider-factory/bootstrap/RuntimePersistenceBootstrap.ts` inicializa providers de persistence (Memory/Supabase).
- `RuntimeProviderRoot.tsx` solo envuelve `RuntimeProvider` + `RuntimeRendererBase` (sin hidratación registries).
- `RuntimeActivationLayer.initialize()` bootstrap persistence/routing (no registries render).

Referencia clave:
- `RuntimePersistenceBootstrap.ts`: registra providers de persistencia y setea activeProvider.

---

## 7) RuntimeBuilder dependencias
`src/runtime/builder/engine/RuntimeBuilder.ts` depende de:
- `FormRuntimeResolver.resolve(formId)`
- `LayoutResolver.resolve(layoutId)`
- `FieldRegistry.get(fieldId)` vía `buildFields()`

### Respuesta (SI / NO)
- Depende de FormRegistry: **SI** (vía `FormRuntimeResolver`)
- Depende de LayoutRegistry: **SI** (vía `LayoutResolver`)
- Depende de FieldRegistry: **SI** (vía `buildFields`)

### Evidencia
- `RuntimeBuilder.ts`: `buildFields()` llama `FieldRegistry.get(fieldId)`
- `RuntimeBuilder.ts`: `layout: LayoutResolver.resolve(runtimeForm.layoutId)`
- `RuntimeBuilder.ts`: `runtimeForm = FormRuntimeResolver.resolve(formId)`

---

## 8) Primer punto exacto de ruptura (código)
Sin ejecución, el “primer punto” determinable por inspección está en el render gating:

- **Archivo exacto:** `src/runtime/runtime-host/engine/FormRuntimeHost.tsx`
- **Función exacta:** componente `FormRuntimeHost`
- **Causa exacta:**
  - `const resolved = builder.resolve(formId)`
  - `const layout = resolved?.layout`
  - `if (!resolved || !layout) { return null; }`

Si `resolved` es `undefined` (p.ej. FormRegistry vacío) o si `resolved.layout` es `undefined` (p.ej. LayoutRegistry vacío), el render se detiene aquí.

---

## 9) Corrección conceptual sugerida (SIN IMPLEMENTAR)
Conceptualmente (solo para entendimiento):
- Se requiere un bootstrap/hydrator **antes** del render-time para poblar:
  - `FormRegistry`
  - `FieldRegistry`
  - `LayoutRegistry`
- Ese hydrator debe cargar desde Supabase (tablas `sgc_forms`, `sgc_form_fields`, y una fuente para layouts) y registrar en los Map.

En el código inspeccionado, el bootstrap existente es para persistence runtime, no para hidratar los registries de render.

---

Fin.

