Documentación Sprint 40
Nombre

SPRINT 40 — Runtime Builder Full Resolution

Objetivo

Convertir RuntimeBuilder en el ensamblador principal del Runtime.

Antes:

FormDefinition
     ↓

RuntimeBuilder
     ↓

layoutId
ruleIds
fieldIds

     ↓

FormRuntimeHost
     ↓

Resolvers adicionales

Después:

FormDefinition
     ↓

RuntimeBuilder
     ↓

RuntimeResolvedForm

     ├─ layout
     ├─ rules
     ├─ fields
     └─ metadata ids
Archivos modificados
RuntimeBuilderContracts
src/runtime/builder/contracts/RuntimeBuilderContracts.ts
Nuevas propiedades
layout?: LayoutDefinition

rules?: FieldRule[]

Manteniendo:

layoutId
ruleIds

para trazabilidad.

RuntimeBuilder
src/runtime/builder/engine/RuntimeBuilder.ts
Resolución de Layout

Antes:

layoutId

solamente.

Ahora:

layout: LayoutResolver.resolve(layoutId)
Resolución de Rules

Antes:

ruleIds

solamente.

Ahora:

rules:
ruleIds
   ↓
RuleRuntimeResolver
   ↓
FieldRule[]
Resultado

RuntimeBuilder ahora entrega:

RuntimeResolvedForm

completamente enriquecido.

Arquitectura después de Sprint 40
FormRegistry
      ↓

FormRuntimeResolver
      ↓

RuntimeBuilder
      ↓

FieldRegistry
      ↓

LayoutRegistry
      ↓

RuleRegistry
      ↓

RuntimeResolvedForm

      ├─ layout
      ├─ fields
      └─ rules
Beneficio principal

FormRuntimeHost ya no necesita resolver:

layoutId
ruleIds

por sí mismo.

Toda la responsabilidad pasa al Builder.

Estado del Runtime
Fields Registry        ✅

Forms Registry         ✅

Layouts Registry       ✅

Rules Registry         ✅

Runtime Builder        ✅

Runtime Resolution     ✅

Rules Engine           ✅

Visibility Engine      ✅

Disable Engine         ✅

Computed Values        ✅