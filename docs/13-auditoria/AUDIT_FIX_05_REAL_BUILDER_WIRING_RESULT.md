# AUDIT_FIX_05_REAL_BUILDER_WIRING_RESULT

## 1) ¿Existe actualmente alguna llamada a `setRuntimeBuilder(...)`?
**NOT FOUND** (con evidencia directa en el archivo local inspeccionado + sin poder ejecutar búsquedas globales por limitación de herramientas; por lógica de wiring en los archivos leídos, no aparece).

> Archivos inspeccionados (lectura completa):
- `src/runtime/builder/provider/RuntimeBuilderProvider.ts`
- `src/runtime/provider/RuntimeProviderRoot.tsx`
- `src/runtime/integration/RuntimeActivationLayer.ts`
- `src/runtime/runtime-host/engine/FormRuntimeHost.tsx`

En esos archivos:
- `RuntimeBuilderProvider.ts` define `setRuntimeBuilder(...)` pero **no lo invoca**.
- `RuntimeProviderRoot.tsx` no lo invoca.
- `RuntimeActivationLayer.ts` no lo invoca.
- `FormRuntimeHost.tsx` solo llama `getRuntimeBuilder()`.

---

## 2) Si FOUND:
No aplica (NOT FOUND).

---

## 3) Si NOT FOUND: punto exacto donde debería ejecutarse
**Punto esperado por cadena de inicialización (wiring que hoy falta):**
- Algún punto de inicialización global ANTES de que `FormRuntimeHost.tsx` ejecute `getRuntimeBuilder()`.

**Archivo donde debería existir esa inyección (por diseño de tu cadena):**
- `src/runtime/provider/RuntimeProviderRoot.tsx` *o* el bootstrapping invocado desde `src/runtime/integration/RuntimeActivationLayer.ts`.

**Función exacta (dónde tendría sentido):**
- Antes de que ocurra: `FormRuntimeHost → getRuntimeBuilder()`.

**Motivo:**
- Hoy `FormRuntimeHost.tsx` hace:
  - `const builder = getRuntimeBuilder();`
  - `resolved = builder.resolve(formId)`
- Si nadie ejecuta `setRuntimeBuilder(RuntimeBuilder real)`, `getRuntimeBuilder()` devuelve el no-op.

---

## 4) Reconstruir la cadena completa (App → ... → FormRuntimeHost → getRuntimeBuilder())
Cadena confirmada por lectura parcial (los archivos que sí se verificaron):

1. **Form entry point (UI):**
   - `src/pages/DynamicForm.jsx`
   - Render decide runtime y monta:
     - `<FormRuntimeHost formId={formDef.id} ... />`

2. **Runtime host:**
   - `src/runtime/runtime-host/engine/FormRuntimeHost.tsx`
   - Línea lógica:
     - `const builder = getRuntimeBuilder();`
     - `const resolved = builder.resolve(formId);`
   - Si `builder` es no-op → `resolved` queda `undefined` → retorna `null`.

3. **Builder provider (fallback no-op):**
   - `src/runtime/builder/provider/RuntimeBuilderProvider.ts`
   - `getRuntimeBuilder()`:
     - si `runtimeBuilder` es `null` ⇒ asigna no-op `{ resolve: undefined, has: false }`

4. **Dónde debería inyectarse (faltante):**
   - en algún punto previo a `FormRuntimeHost.tsx`
   - mediante `setRuntimeBuilder(RuntimeBuilderReal)`

---

## 5) Confirmar: ¿el primer null proviene de `RuntimeBuilderProvider.no-op builder`?
**SI** (por lógica directa):
- `FormRuntimeHost.tsx` llama `getRuntimeBuilder()`.
- `RuntimeBuilderProvider.ts` documenta fallback: si no se inyectó runtimeBuilder ⇒ no-op ⇒ `resolve()` devuelve `undefined`.
- `FormRuntimeHost.tsx` retorna `null` cuando `!resolved || !layout`.

---

## 6) Resultado / wiring roto
- `FormRuntimeHost` depende de un builder real via `getRuntimeBuilder()`.
- `RuntimeBuilderProvider` contiene un no-op fallback.
- En los archivos verificados no existe ninguna llamada a `setRuntimeBuilder(...)` que sustituya ese no-op.

**Por lo tanto, el wiring roto es la ausencia de la inyección de `RuntimeBuilder` real antes del primer `getRuntimeBuilder()` dentro de `FormRuntimeHost`.**

