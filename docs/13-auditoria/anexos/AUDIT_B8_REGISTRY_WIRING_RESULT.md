# AUDIT_B8_REGISTRY_WIRING_RESULT

## 0) Resumen ejecutivo
El runtime (FormRuntimeHost → RuntimeBuilder → FormRuntimeResolver → FormRegistry + FieldRegistry + LayoutResolver → LayoutRegistry) depende de **registries in-memory**. En el flujo de UI actual (DynamicForm.jsx), la app **carga/guarda** contra Supabase, pero el **bootstrap/hidratación** de los registries in-memory para `RuntimeBuilder.resolve(formId)` **no se observa** en el código inspeccionado como pipeline de inicialización del runtime de render.

Resultado: si FormRegistry / FieldRegistry / LayoutRegistry no están poblados con los forms/fields/layouts esperados (`limpieza-diaria`, `cloro-ph-agua`), entonces `RuntimeBuilder.resolve(formId)` devolverá `resolved.fields=[]` (y/o `resolved.layout=undefined`), produciendo “desaparición” de campos.

> Importante: en esta auditoría **no se ejecuta** el runtime en vivo; solo se inspecciona wiring por código.

---

## 1) Diagrama completo del wiring Runtime (render)

### Cadena principal solicitada (render-time)
**DynamicForm** (UI operativa)  
→ **FormRuntimeHost** (`src/runtime/runtime-host/engine/FormRuntimeHost.tsx`)  
→ **RuntimeBuilder.resolve(formId)** (`src/runtime/builder/engine/RuntimeBuilder.ts`)  
→ **FormRuntimeResolver.resolve(formId)** (`src/runtime/forms/runtime/FormRuntimeResolver.ts`)  
→ **FormRegistry.get(formId)** (`src/runtime/forms/registry/FormRegistry.ts`)  
→ **buildFields(fieldIds)** usando **FieldRegistry.get(fieldId)** (`src/runtime/fields/registry/FieldRegistry.ts`)  
→ **LayoutResolver.resolve(layoutId)** usando **LayoutRegistry.get(layoutId)** (`src/runtime/layout/runtime/LayoutRuntimeResolver.ts`)  
→ **FormRendererEngine** (`src/runtime/form/engine/FormRendererEngine.tsx`)  
→ **LayoutEngine** (`src/runtime/layout/engine/LayoutEngine.tsx`)  
→ **DynamicFieldRenderer** (`src/runtime/rendering/DynamicFieldRenderer.tsx`)

### Cadena de runtime usada como bridge (post-persistencia)
DynamicForm → `dynamicService.submitFormResponse()` (Supabase EAV) → devuelve `__runtime_internal_event` → `runtimeActivationLayer.activate()` → bootstrap persistence (router.submit).

Esto es un **uso del runtime para eventos/persistencia core**, pero **no garantiza** que los registries in-memory de render estén poblados.

---

## 2) Registries encontrados (qué son y de dónde salen)

### 2.1 FormRegistry
- Código: `src/runtime/forms/registry/FormRegistry.ts`
- Estado: **map in-memory** (Map) de `FormDefinition`.
- Acceso: `FormRegistry.get(formId)` / `FormRegistry.has(formId)`.
- Provider accessors: `src/runtime/forms/registry/FormRegistryProvider.ts` (get/set Map).

### 2.2 FieldRegistry
- Código: `src/runtime/fields/registry/FieldRegistry.ts`
- Estado: **map in-memory** de `RuntimeFieldDefinition`.
- Acceso: `FieldRegistry.get(fieldId)` / `FieldRegistry.has(fieldId)`.
- Provider accessors: `src/runtime/fields/registry/FieldRegistryProvider.ts` (get/set Map).

### 2.3 LayoutRegistry
- Código: `src/runtime/layout/registry/LayoutRegistry.ts`
- Estado: registry creada por `createLayoutRegistry()` (map in-memory).
- Resolver: `LayoutRuntimeResolver` usa `getLayoutRegistry().get(layoutId)`.
- Provider accessors: `src/runtime/layout/registry/LayoutRegistryProvider.ts` (get/set LayoutRegistry).

---

## 3) Runtime bootstrap encontrado

### 3.1 Bootstrap que SÍ existe (persistence router)
- `src/runtime/integration/RuntimeActivationLayer.ts`
  - Inicializa bootstrap del sistema de persistence/routing:
  - `RuntimePersistenceBootstrap` (lazy import)

### 3.2 RuntimePersistenceBootstrap
- `src/runtime/persistence/provider-factory/bootstrap/RuntimePersistenceBootstrap.ts`
  - Registra providers:
    1) `MemoryPersistenceProvider`
    2) `SupabasePersistenceProvider`
  - Define active provider como **memory** (`providerId: memoryProvider.id`).

### 3.3 Evidencia de conexión a Supabase
- `src/runtime/persistence/providers/SupabasePersistenceProvider.ts`
  - Implementación de `save()` llama a:
    - `dynamicService.submitFormResponse(payload.formId, payload.userId, payload.values, [], {})`

**Conclusión sobre bootstrap:** el bootstrap observado es para **persistence execution router**, no para hidratar `FormRegistry/FieldRegistry/LayoutRegistry` para render.

---

## 4) RuntimeProviderRoot ejecuta realmente el bootstrap?
- `src/runtime/provider/RuntimeProviderRoot.tsx`
  - Solo envuelve `RuntimeProvider` + `RuntimeRendererBase`.
  - No se observa invocación de registries bootstrap en este archivo.

**Respuesta (según evidencia del código inspeccionado):** NO se observa que `RuntimeProviderRoot` ejecute bootstrap que llene `FormRegistry/FieldRegistry/LayoutRegistry`.

---

## 5) RuntimeBuilder wiring (dependencias in-memory)

### RuntimeBuilder.resolve(formId)
- `src/runtime/builder/engine/RuntimeBuilder.ts`

Pseudo-lógica real (del archivo):
1. `runtimeForm = FormRuntimeResolver.resolve(formId)`
2. Si `runtimeForm` no existe → `undefined`
3. Construye `resolved` con:
   - `layout: LayoutResolver.resolve(runtimeForm.layoutId)`
   - `fields: buildFields(runtimeForm.fieldIds)`
   - `fields` depende 100% de `FieldRegistry.get(fieldId)`.

### Dependencias directas usadas por RuntimeBuilder
- `FormRuntimeResolver` → usa `FormRegistry.get(formId)`
- `FieldRegistry.get(fieldId)`
- `LayoutResolver.resolve(layoutId)` → `LayoutRegistry.get(layoutId)`

**Respuesta:** SI, `RuntimeBuilder.resolve(formId)` depende de registries in-memory.

---

## 6) RuntimeHost wiring (render gating)
- `src/runtime/runtime-host/engine/FormRuntimeHost.tsx`

Puntos críticos:
1) `const resolved = builder.resolve(formId)`
2) `const layout = resolved?.layout`
3) Guard:
   - `if (!resolved || !layout) { return null; }`

4) Propiedades pasadas a FormRendererEngine:
- `layout={layout}`
- `fields={resolved.fields}`
- `formData={resolvedFieldsToFormData(resolved, mergedFormData)}`

Donde `resolvedFieldsToFormData` construye `__fieldDefs` SOLO desde `resolved.fields`.

**Consecuencia:** si `resolved.fields` está vacío por falta de wiring en FieldRegistry, entonces `__fieldDefs` queda vacío y LayoutEngine no encuentra fieldDef.

---

## 7) Conexión Runtime ↔ Supabase (¿Runtime carga datos reales?)

Hay 2 vías en el código:

### 7.1 Render-time (FormRuntimeHost)
- No llama Supabase.
- Solo consume registries resolvidos en memoria.

### 7.2 Persistencia/eventos (RuntimeActivationLayer)
- Sí existe vía bridge post-submit:
  - `dynamicService.submitFormResponse` (UI) guarda en Supabase
  - luego `runtimeActivationLayer.activate(__runtime_internal_event)` ejecuta router.submit
  - la persistencia del runtime usa `SupabasePersistenceProvider.save()` → llama otra vez a `dynamicService.submitFormResponse`.

**Respuesta:**
- Runtime **no** carga datos reales de Supabase para poblar registries de render en el flujo mostrado.

---

## 8) Formularios y fields encontrados (para los pilotos)
En esta auditoría, por inspección de código, **no existe evidencia de inicialización** que registre dinámicamente:
- `FormRegistry.register/set/add` para `limpieza-diaria` y `cloro-ph-agua`
- `FieldRegistry.register/set/add` para los `fieldIds` de esos forms
- `LayoutRegistry.register/set/add` para el layout esperado

Por tanto, el motivo más probable (y consistente con B7) es:
- Los registries in-memory no están siendo poblados (o están siendo poblados en otro pipeline no incluido en el flujo render-time), causando:
  - `resolved.fields=[]` y/o
  - `resolved.layout=undefined`

---

## 9) Punto exacto de ruptura (primer punto lógico en render)

### Candidato #1 (gating hard)
- **Archivo:** `src/runtime/runtime-host/engine/FormRuntimeHost.tsx`
- **Función:** componente `FormRuntimeHost`
- **Lógica:**
  - `const resolved = builder.resolve(formId)`
  - `const layout = resolved?.layout`
  - `if (!resolved || !layout) return null;`

**Si falla `LayoutResolver.resolve(layoutId)` →** `resolved.layout` queda `undefined` → runtime no renderiza nada.

### Candidato #2 (camino “sin romper” pero sin defs)
Si `resolved.layout` existe pero `resolved.fields` queda vacío:
- `fields={resolved.fields}` (empty array)
- `resolvedFieldsToFormData()` crea `__fieldDefs` vacío
- `LayoutEngine` intenta `formData.__fieldDefs[fieldId]` y falla (mostrará “Missing field definition” en vez de render efectivo).

---

## 10) Corrección conceptual sugerida (SIN IMPLEMENTAR)

Para que RuntimeBuilder.resolve(formId) devuelva layouts/fields reales:
1) Asegurar una etapa de **bootstrap de registries in-memory** que:
   - registre `FormRegistry` con forms (incluyendo `limpieza-diaria`, `cloro-ph-agua`)
   - registre `FieldRegistry` con todas las definiciones de fields por form
   - registre `LayoutRegistry` con el layoutId referenciado por cada form
2) Ejecutar esa etapa **antes** de montar `FormRuntimeHost`.

Actualmente, el bootstrap observado (RuntimePersistenceBootstrap) solo inicializa **persistence providers**, no registries de render.

---

## 11) Lista de evidencias (archivos clave)
- Runtime render wiring:
  - `src/runtime/runtime-host/engine/FormRuntimeHost.tsx`
  - `src/runtime/builder/engine/RuntimeBuilder.ts`
  - `src/runtime/forms/runtime/FormRuntimeResolver.ts`
  - `src/runtime/layout/runtime/LayoutRuntimeResolver.ts`
  - `src/runtime/form/engine/FormRendererEngine.tsx`
  - `src/runtime/layout/engine/LayoutEngine.tsx`

- Runtime bootstrap para persistencia:
  - `src/runtime/integration/RuntimeActivationLayer.ts`
  - `src/runtime/persistence/provider-factory/bootstrap/RuntimePersistenceBootstrap.ts`
  - `src/runtime/persistence/providers/SupabasePersistenceProvider.ts`

---

## 12) Observación crítica sobre “búsqueda de wiring register”
Las búsquedas por patrón con tooling fallaron por ausencia de `ripgrep` en el entorno. Por eso, esta auditoría se basa en inspección por archivo y en el wiring explícito visible en los componentes/resolvers.

---

**Fin del informe**

