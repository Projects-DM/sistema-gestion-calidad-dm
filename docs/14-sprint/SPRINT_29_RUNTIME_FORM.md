# Sprint 29 — Runtime Form Registry

## Objetivo

Implementar el registro central de formularios metadata-driven.

Este sprint introduce la capacidad de registrar formularios de manera desacoplada del sistema de renderizado, permitiendo que cualquier formulario futuro sea cargado mediante metadata.

---

## Problema que resuelve

Antes de Sprint 29:

* Existían motores de renderizado.
* Existían layouts.
* Existían reglas.
* Existía el FormRendererEngine.

Pero NO existía un catálogo central que definiera:

* qué formularios existen
* qué layout utiliza cada uno
* qué campos contiene
* qué reglas aplica

---

## Arquitectura incorporada

```text
Form Registry
      ↓
Form Definition
      ↓
Layout Definition
      ↓
Field Definitions
      ↓
Rules
```

---

## Archivos creados

### src/runtime/forms/contracts/FormContracts.ts

Define:

```ts
FormDefinition
```

Propiedades:

* id
* name
* description?
* layoutId
* fieldIds
* ruleIds?

---

### src/runtime/forms/registry/FormRegistry.ts

Registro central en memoria.

Implementado mediante:

```ts
Map<string, FormDefinition>
```

Métodos:

* register()
* get()
* has()
* getAll()

---

### src/runtime/forms/registry/FormRegistryProvider.ts

Proveedor global del registry.

Métodos:

* getFormRegistry()
* setFormRegistry()

---

## Restricciones respetadas

No se modificó:

* LayoutEngine
* FormRendererEngine
* RulesEngine
* Persistence Layer
* Analytics
* Audit
* Runtime Activation Layer

---

## Resultado

El sistema ahora puede registrar formularios dinámicamente mediante metadata.

Ejemplos futuros:

* Formato de visitantes
* Formato de contratistas
* Inspecciones
* Capacitaciones
* Acciones correctivas
* Auditorías

sin necesidad de crear nuevos motores.

---

## Estado arquitectónico

Después de Sprint 29:

```text
Form Registry
      +
Rules Engine
      +
Layout Engine
      +
Form Renderer
      +
Field System
```

La arquitectura ya está preparada para resolver formularios completos en runtime.

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

Sprint 29 establece la base necesaria para:

### Sprint 30

Form Runtime Resolver

que permitirá cargar formularios reales del SGC mediante:

```text
formId
   ↓
Form Registry
   ↓
Form Definition
   ↓
Runtime Resolution
   ↓
Renderizado Automático
```
