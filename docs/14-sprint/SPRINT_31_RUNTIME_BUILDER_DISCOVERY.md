# RUNTIME_BUILDER_DISCOVERY.md — Runtime Builder Integration Discovery

Fecha: 2026-06-05

## Alcance
Documento **de descubrimiento** para integrar el sistema **metadata-driven** construido en los Sprint 25–31 dentro del flujo existente de formularios dinámicos.

**No se implementa código funcional** y **no se modifica** ningún archivo productivo.

---

## 1) Entry Point de Formularios Dinámicos

### Punto de entrada lógico (UI)
- **`FormRendererEngine`** (`src/runtime/form/engine/FormRendererEngine.tsx`)

Rol:
- Orquesta la experiencia UI final.
- Recibe:
  - `layout: LayoutDefinition`
  - `formData: Record<string, unknown>`
  - `onChange`
  - `disabled?`
  - `errors?`
- Delegación principal:
  - `LayoutEngine`

### Delegación estructural
- **`LayoutEngine`** (`src/runtime/layout/engine/LayoutEngine.tsx`)
  - Renderiza `sections → columns → FieldReference`
  - Resuelve `fieldId → formData[fieldId]`
  - Llama a `DynamicFieldRenderer`

### Delegación de UI atómica
- **`DynamicFieldRenderer`** (`src/runtime/rendering/DynamicFieldRenderer.tsx`)
  - Construye `FieldRenderProps`
  - Obtiene componente desde `ComponentRegistry`

---

## 2) Flujo completo de creación de formularios (Runtime)

### Fase A — Metadata (definición)
1. Se define el **FormDefinition** (metadata de formulario):
   - Sprint 29: `FormContracts.ts`
   - Sprint 29: `FormRegistry.ts`
2. Se define **layout** asociado (Sprint 26.1/26.2):
   - `LayoutDefinition` y estructuras
   - `LayoutEngine` renderiza la estructura visual
3. Se define **campos** metadata:
   - Sprint 31: `RuntimeFieldDefinition`
   - (registro y acceso: `FieldRegistry`)
4. Se definen **reglas** metadata:
   - Sprint 28: `FieldRule` (contratos)
   - Sprint 28: `RulesEngine` (evaluación pura)
   - Sprint 28: `useRulesEngine` (hook)

### Fase B — Resolución runtime (binding)
5. **Runtime resolver (Sprint 30)**
   - `FormRuntimeResolver.resolve(formId)`
   - Convierte `FormDefinition → RuntimeFormModel`
   - `RuntimeFormProvider` provee acceso global al resolver

### Fase C — Render final (UI)
6. **FormRendererEngine** consume:
   - `layout` (LayoutDefinition)
   - `formData` (values)
   - `errors` y `disabled`
7. **LayoutEngine** recorre layout y delega:
   - `DynamicFieldRenderer` por campo
8. **DynamicFieldRenderer** resuelve:
   - `fieldDef.fieldType → ComponentRegistry.getComponent(...)`
9. **Field component** renderiza el input atómico (Sprint 25)

---

## 3) Registro actual de motores (CRUD, Checklist, Measurement)

### Observación
En esta inspección se identifican motores por **técnica de composición UI** (BaseChecklist/BaseMediciones/BaseWorkflow) más que por un “CRUD runtime motor” único.

Sin embargo, a nivel **runtime metadata-driven**, los “motores” relevantes ya están representados como:
- **Registry de componentes de campos**
  - Sprint 25.2: `ComponentRegistry` (parcial/placeholder inicialmente)
- **Motor de resolución de layout**
  - Sprint 26.2: `LayoutEngine`
- **Motor de evaluación de reglas**
  - Sprint 28: `RulesEngine` + `useRulesEngine`
- **Resolutores runtime metadata-driven**
  - Sprint 29: `FormRegistry`
  - Sprint 30: `FormRuntimeResolver`
  - Sprint 31: `FieldRegistry`

### Mapeo conceptual (por tipo de engine base)
- **BaseChecklist**
  - Usa LayoutEngine + DynamicFieldRenderer como base visual.
- **BaseMediciones**
  - Idem.
- **BaseWorkflow**
  - Idem (en la arquitectura target suele incorporar reglas/estado de workflow).

**Punto de integración**: aunque existan motores “CRUD/Checklist/Measurement” a nivel de dominio, el pipeline UI metadata-driven debe permanecer igual: Layout → FieldRenderer → Field components, con RulesEngine como extensión.

---

## 4) Flujo de persistencia de metadata (estado actual)

### Actual
En los Sprint analizados:
- Los registries de metadata (FormRegistry/FieldRegistry) son **in-memory**.
- No se integra persistencia dentro de RulesEngine.
- No se integran DB/adapters en esta fase.

### Implicación
El flujo de persistencia de metadata (típicamente: DB/Supabase → carga → registry) **debe** ocurrir en el layer de infraestructura/composición (fuera del scope de sprint actual) y terminar con:
- `setFormRegistry(map)`
- `setFieldRegistry(map)`
- (y luego) el runtime resolver y render consumen esos registros.

---

## 5) Puntos de integración para (FormRegistry, FieldRegistry, LayoutEngine, RulesEngine)

### 5.1 Integración — FormRegistry
- Producto:
  - `FormRegistry.register(form)`
  - `FormRegistry.get(formId)`
  - `FormRegistry.getAll()`
- Provee `FormRuntimeResolver` (Sprint 30):
  - `FormRuntimeResolver.resolve(formId)`
  - Construye `RuntimeFormModel` con `formId/formName/layoutId/fieldIds/ruleIds`

**Punto de decisión**:
- ¿Dónde se construye/inyecta el `layout` real?
  - `RuntimeFormModel.layoutId` debe mapearse al `LayoutDefinition` consumido por `FormRendererEngine`.
  - (Este mapeo no está descrito aquí; se asume un paso de integración posterior.)

### 5.2 Integración — FieldRegistry
- Producto:
  - `FieldRegistry.register(field)`
  - `FieldRegistry.get(fieldId)`
- Objetivo en el futuro:
  - Construir `fieldDef` (FieldDefinition/FieldContract) a partir de `RuntimeFieldDefinition`.

**Importante**:
- `DynamicFieldRenderer` hoy consume `FieldContract` en su entrada.
- Para integrar estrictamente runtime metadata:
  - se necesita un adaptador de “fieldId → FieldContract/FieldDefinition compatible” (probablemente en una capa de builder, no tocada aún).

### 5.3 Integración — LayoutEngine
- Ya está integrado como estructura base.
- `LayoutEngine` requiere `layout: LayoutDefinition` y hace el binding:
  - `fieldReference.fieldId → formData[fieldId]`

**Punto de mejora no implementada**:
- Ajustar render con `hiddenFields/disabledFields/computedValues` provenientes de RulesEngine (Sprint 28).

### 5.4 Integración — RulesEngine
- Producto:
  - `RulesEngine.evaluateRules({ rules, formData }) → { hiddenFields, disabledFields, computedValues }`
  - `useRulesEngine({ rules, formData })` para recomputar

**Punto de integración obligatorio**:
- `FormRendererEngine` debe ser el lugar para:
  - llamar `useRulesEngine`
  - aplicar:
    - `hiddenFields` → evitar render (o render fallback)
    - `disabledFields` → propagar `disabled` al field component
    - `computedValues` → parchear o combinar con `formData` para que DynamicFieldRenderer lea el valor correcto

Este documento no implementa, solo describe el “dónde y qué”.

---

## 6) Riesgos de migración

1. **Incompatibilidad de tipos de campo**
   - `DynamicFieldRenderer` hoy recibe `FieldContract`.
   - `FieldRegistry` introduce `RuntimeFieldDefinition` (campos en forma simplificada).
   - Riesgo: falta de un “mapeador/adapter” runtime builder para convertir `runtime field definition → FieldContract compatible`.

2. **Orden de integración reglas vs render**
   - Reglas (hidden/disabled/computed) deben aplicarse antes de render atómico.
   - Riesgo: si se aplican “tarde”, el UI puede mostrar valores inconsistentes o permitir edición prohibida.

3. **Computed values vs onChange**
   - Si `computedValues` sobreescribe `formData`, el comportamiento de `onChange` necesita compatibilidad.
   - Riesgo: loops o inconsistencias si se recomputa en cada render sin reglas idempotentes.

4. **Builder de layout/field**
   - `RuntimeFormModel` contiene `layoutId` y `fieldIds`, pero el pipeline actual trabaja con `LayoutDefinition` y `FieldContract`.
   - Riesgo: faltar un builder que resuelva `layoutId → LayoutDefinition` y `fieldIds → FieldContracts`.

5. **Dependencia en registries in-memory**
   - En producción, la carga real de metadata debe conectarse a persistencia.
   - Riesgo: si no se inicializan registries a tiempo, el runtime resolver devolverá `undefined`/vacíos.

---

## 7) Plan recomendado de integración

> Objetivo: construir un **Runtime Builder** que produzca lo que `FormRendererEngine`/`LayoutEngine` esperan, usando FormRegistry/FieldRegistry/RulesEngine.

### Paso 1 — Definir “Builder outputs”
- Para alimentar `FormRendererEngine`:
  - `layout: LayoutDefinition`
  - `formData: Record<string, unknown>`
  - `errors?: Record<string, string>`

### Paso 2 — Resolver FormDefinition → RuntimeFormModel
- Usar:
  - `FormRuntimeResolver.resolve(formId)`
- Obtener:
  - `layoutId, fieldIds, ruleIds`

### Paso 3 — Resolver LayoutDefinition desde layoutId
- Integrar un registry o loader de layouts (fuera del scope actual) para producir `LayoutDefinition`.

### Paso 4 — Resolver field metadata desde fieldIds
- Consultar `FieldRegistry.get(fieldId)` para cada `fieldId`.
- Convertir `RuntimeFieldDefinition → FieldContract compatible`.
  - Esto requiere un mapeador (posible extensión futura; no implementado aquí).

### Paso 5 — Integrar RulesEngine en FormRendererEngine
- Conectar `useRulesEngine({ rules, formData })`.
- Aplicar:
  - hiddenFields: evitar montar campos
  - disabledFields: propagar `disabled`
  - computedValues: combinar/inyectar en `formData` de lectura

### Paso 6 — Validación y consistencia
- Confirmar que computedValues no rompe el flujo `onChange`.
- Asegurar idempotencia y que el UI no crashea por fieldIds inexistentes.

---

## Resumen Ejecutivo (Executive Summary)

- El pipeline actual del UI metadata-driven se apoya en:
  - **LayoutEngine** (estructura visual)
  - **DynamicFieldRenderer** (propagación de valores a componentes atómicos)
  - **ComponentRegistry** (resolución de componente por `fieldType`)
- Los registries construidos en Sprint 29–31 habilitan metadata runtime:
  - **FormRegistry** (metadata de formularios)
  - **FieldRegistry** (metadata de campos)
  - **FormRuntimeResolver** (conversion a `RuntimeFormModel` con `layoutId/fieldIds/ruleIds`)
- El motor de reglas en Sprint 28 aporta determinismo para:
  - visibilidad (`hiddenFields`)
  - habilitación (`disabledFields`)
  - valores computados (`computedValues`)
- La principal pieza faltante para integración total es un **Runtime Builder/Adapter** que traduzca:
  - `RuntimeFormModel + fieldIds/layoutId → LayoutDefinition + FieldContract compatibles`.
- Una vez resuelto, `FormRendererEngine` es el punto natural para conectar `useRulesEngine` y aplicar reglas antes del render atómico.

