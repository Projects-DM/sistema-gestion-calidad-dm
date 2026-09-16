DOCUMENTACIÓN — SPRINT 33
Runtime Integration Layer

Estado: ✅ Completado
Fecha: 2026-06-05

Objetivo

Conectar por primera vez el Runtime Builder con el motor de renderizado.

Hasta Sprint 32 teníamos:

FormRegistry
↓
FormRuntimeResolver
↓
RuntimeBuilder
↓
RuntimeResolvedForm

pero la cadena terminaba allí.

Sprint 33 introduce el componente responsable de consumir el resultado del RuntimeBuilder y delegarlo al motor visual.

Componentes creados
1. RuntimeHostContracts.ts

Ruta:

src/runtime/runtime-host/contracts/RuntimeHostContracts.ts

Define:

FormRuntimeHostProps

Propiedades:

formId: string

formData: Record<string, unknown>

onChange(
 fieldId,
 value
)

disabled?

errors?
2. FormRuntimeHost.tsx

Ruta:

src/runtime/runtime-host/engine/FormRuntimeHost.tsx

Responsabilidad principal:

formId

↓

RuntimeBuilder.resolve()

↓

RuntimeResolvedForm

↓

FormRendererEngine
Flujo interno
Paso 1

Obtiene RuntimeBuilder:

getRuntimeBuilder()
Paso 2

Resuelve:

builder.resolve(formId)

Resultado:

RuntimeResolvedForm
Paso 3

Valida existencia de layout:

resolved.layout
Paso 4

Construye compatibilidad temporal:

__fieldDefs

para mantener compatibilidad con:

LayoutEngine
DynamicFieldRenderer

sin romper motores existentes.

Paso 5

Delega al motor visual:

<FormRendererEngine />
3. FormRuntimeHostProvider.ts

Ruta:

src/runtime/runtime-host/provider/FormRuntimeHostProvider.ts

Implementa:

getFormRuntimeHost()

setFormRuntimeHost()

Patrón idéntico a:

FormRuntimeProvider
RuntimeBuilderProvider
FieldRegistryProvider
Arquitectura antes del Sprint 33
FormRegistry
↓
FormRuntimeResolver
↓
RuntimeBuilder
↓
RuntimeResolvedForm

(Fin)