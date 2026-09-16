DOCUMENTACIÓN — SPRINT 32
Runtime Builder Layer

Estado: ✅ Completado
Fecha: 2026-06-05

Objetivo

Construir la capa intermedia que conecta:

FormRegistry
      ↓
FormRuntimeResolver
      ↓
FieldRegistry
      ↓
RuntimeResolvedForm

antes de llegar al motor de renderizado.

Hasta Sprint 31 existían todos los componentes necesarios, pero no había una pieza que unificara:

FormDefinition
RuntimeFormModel
RuntimeFieldDefinition

en una única estructura consumible por el runtime.

Componentes creados
1. RuntimeBuilderContracts.ts

Ruta:

src/runtime/builder/contracts/RuntimeBuilderContracts.ts

Define:

RuntimeResolvedForm

Contiene:

formId
formName
layoutId
fieldIds
ruleIds
layout?
fields[]
2. RuntimeBuilder.ts

Ruta:

src/runtime/builder/engine/RuntimeBuilder.ts

Responsabilidad:

formId
    ↓
FormRuntimeResolver
    ↓
FieldRegistry
    ↓
RuntimeResolvedForm

Métodos:

resolve(formId)

has(formId)
3. RuntimeBuilderProvider.ts

Ruta:

src/runtime/builder/provider/RuntimeBuilderProvider.ts

Implementa:

getRuntimeBuilder()

setRuntimeBuilder()

siguiendo el mismo patrón utilizado por:

FormRuntimeProvider
FieldRegistryProvider
Arquitectura resultante

Antes:

FormRegistry

FieldRegistry

(no conexión)

Después:

FormRegistry
      ↓

FormRuntimeResolver
      ↓

RuntimeBuilder
      ↓

RuntimeResolvedForm
Beneficio

Ahora existe una única estructura de runtime:

RuntimeResolvedForm

que puede ser consumida por:

FormRendererEngine
LayoutEngine
RulesEngine

sin depender directamente de múltiples registros.

Build Verification
npm run -s build

Resultado:

PASS

(Vite chunk-size warning únicamente)