DOCUMENTACIÓN — SPRINT 35
Runtime Layout Integration

Estado: ✅ Completado
Fecha: 2026-06-05

Objetivo

Eliminar la dependencia de:

resolved.layout

y utilizar el nuevo pipeline metadata-driven:

layoutId
   ↓
LayoutRuntimeResolver
   ↓
LayoutDefinition
Archivo modificado

Ruta:

src/runtime/runtime-host/engine/FormRuntimeHost.tsx
Integración realizada

Antes:

RuntimeBuilder
      ↓
RuntimeResolvedForm
      ↓
resolved.layout
      ↓
FormRendererEngine

Después:

RuntimeBuilder
      ↓
RuntimeResolvedForm
      ↓
layoutId
      ↓
LayoutRuntimeResolver
      ↓
LayoutDefinition
      ↓
FormRendererEngine
Método incorporado
resolveLayoutById(layoutId)

Responsabilidad:

layoutId
      ↓
LayoutResolver.resolve()
      ↓
LayoutDefinition
Validaciones

Implementadas correctamente:

if (!resolved || !layout) {
  return null;
}

Beneficio:

No rompe UI.
No genera excepciones.
Mantiene comportamiento determinista.
Flujo Runtime completo actual
formId
   ↓

FormRegistry

   ↓

FormRuntimeResolver

   ↓

RuntimeBuilder

   ↓

RuntimeResolvedForm

   ↓

layoutId

   ↓

LayoutRuntimeResolver

   ↓

LayoutDefinition

   ↓

FormRuntimeHost

   ↓

FormRendererEngine

   ↓

LayoutEngine

   ↓

DynamicFieldRenderer

   ↓

Field Components
Compatibilidad mantenida

Sigue existiendo:

__fieldDefs

para no romper:

CRUD
Checklist
Measurement

mientras seguimos migrando.

Build Verification

Comando:

npm run -s build

Resultado:

PASS
Resultado Arquitectónico

Con Sprint 35 ya tenemos:

Metadata
FormRegistry
FieldRegistry
LayoutRegistry
Resolución Runtime
FormRuntimeResolver
RuntimeBuilder
LayoutRuntimeResolver
Render Runtime
FormRuntimeHost
FormRendererEngine
LayoutEngine
DynamicFieldRenderer