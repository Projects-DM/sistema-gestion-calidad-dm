DOCUMENTACIÓN — SPRINT 34
Layout Registry Layer

Estado: ✅ Completado
Fecha: 2026-06-05

Objetivo

Crear la infraestructura runtime necesaria para resolver layouts mediante metadata.

Antes de este sprint:

RuntimeResolvedForm
       │
       └── layoutId

pero no existía ningún mecanismo para transformar:

layoutId
   ↓
LayoutDefinition

Sprint 34 resuelve este problema.

Componentes creados
1. LayoutRegistry.ts

Ruta:

src/runtime/layout/registry/LayoutRegistry.ts

Responsabilidad:

Registro metadata-driven de layouts.

Implementa:

register(layout)

get(layoutId)

has(layoutId)

getAll()

Internamente utiliza:

Map<string, LayoutDefinition>
2. LayoutRegistryProvider.ts

Ruta:

src/runtime/layout/registry/LayoutRegistryProvider.ts

Responsabilidad:

Exponer acceso global al registry.

Implementa:

getLayoutRegistry()

setLayoutRegistry()

Patrón consistente con:

FieldRegistryProvider
RuntimeBuilderProvider
FormRuntimeProvider
3. LayoutRuntimeResolver.ts

Ruta:

src/runtime/layout/runtime/LayoutRuntimeResolver.ts

Responsabilidad:

Resolver:

layoutId
   ↓
LayoutDefinition

API:

resolve(layoutId)

has(layoutId)

Sin transformación.

Sin builders.

Sin React.

Arquitectura obtenida

Antes:

layoutId

(no resolución)

Después:

layoutId
   ↓

LayoutRegistry
   ↓

LayoutRuntimeResolver
   ↓

LayoutDefinition
Beneficio

Ahora el runtime posee:

Form Registry
Field Registry
Layout Registry

Los tres pilares fundamentales de metadata.