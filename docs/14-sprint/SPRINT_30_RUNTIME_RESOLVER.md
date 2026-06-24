# Sprint 30 — Runtime Form Resolver

## Objetivo

Implementar el motor central de resolución de formularios runtime.

Este sprint introduce la capacidad de transformar un `formId` registrado en el sistema en un modelo runtime completamente resoluble y consumible por los motores de renderizado.

---

## Problema que resuelve

Antes de Sprint 30:

Existían:

* FormRegistry
* FormDefinition
* LayoutEngine
* RulesEngine
* FormRendererEngine

Pero no existía un mecanismo que conectara:

```text
formId
   ↓
FormDefinition
   ↓
Runtime Model
```

de manera automática.

---

## Arquitectura incorporada

```text
FormRuntimeResolver
        ↓
FormRegistry
        ↓
FormDefinition
        ↓
RuntimeFormModel
```

---

## Archivos creados

### src/runtime/forms/runtime/FormRuntimeContracts.ts

Define:

```ts
RuntimeFormModel
```

Propiedades:

* formId
* formName
* layoutId
* fieldIds
* ruleIds

---

### src/runtime/forms/runtime/FormRuntimeResolver.ts

Responsabilidad:

Resolver formularios registrados.

Métodos:

```ts
resolve(formId)

has(formId)
```

Proceso:

```text
formId
   ↓
FormRegistry
   ↓
FormDefinition
   ↓
RuntimeFormModel
```

---

### src/runtime/forms/runtime/FormRuntimeProvider.ts

Proveedor global del resolver.

Métodos:

```ts
getRuntimeResolver()

setRuntimeResolver()
```

Incluye resolver seguro por defecto cuando no ha sido inicializado.

---

## Restricciones respetadas

No se modificó:

* LayoutEngine
* RulesEngine
* FormRendererEngine
* DynamicFieldRenderer
* Persistence Layer
* Analytics
* Audit
* Scoring Engine

---

## Resultado

Ahora el sistema puede ejecutar:

```ts
resolver.resolve("visitantes")
```

y obtener:

```ts
{
  formId: "visitantes",
  formName: "Formato Visitantes",
  layoutId: "layout_visitantes",
  fieldIds: [...],
  ruleIds: [...]
}
```

sin conocimiento específico del formulario.

---

## Estado arquitectónico

Después de Sprint 30:

```text
Form Registry
      ↓
Form Runtime Resolver
      ↓
Runtime Form Model
      ↓
Layout Engine
      ↓
Dynamic Renderer
```

---

## Build Verification

```bash
npm run -s build
```

Resultado:

PASS ✅

(Vite build exitoso; warning únicamente por tamaño de chunks)

---

## Impacto

Sprint 30 completa la capa de resolución runtime y prepara el sistema para comenzar la digitalización de formularios reales mediante metadata.

Este sprint es el puente entre la arquitectura y la operación real del SGC.
