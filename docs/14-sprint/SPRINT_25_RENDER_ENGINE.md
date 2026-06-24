# Sprint 25 — Render Engine Foundation

## Objetivo

Desacoplar completamente la renderización de formularios del runtime de negocio mediante una arquitectura metadata-driven.

---

## Problema Anterior

Los motores realizaban renderizado directo de componentes.

Esto generaba:

* Duplicación de lógica
* Acoplamiento fuerte
* Escalabilidad limitada
* Dificultad para digitalizar formatos masivamente

---

## Arquitectura Objetivo

FORM_SCHEMA

↓

DynamicFieldRenderer

↓

ComponentRegistry

↓

Atomic Field Components

---

## Componentes Base Implementados

### Registry Layer

* ComponentRegistryBase.ts
* ComponentRegistry.ts

---

### Renderer Layer

* DynamicFieldRenderer.tsx

---

### Atomic Components

* FieldText
* FieldTextarea
* FieldNumber
* FieldSelect
* FieldMultiSelect
* FieldCheckbox
* FieldRadio
* FieldDate
* FieldTime
* FieldDateTime
* FieldFileUpload
* FieldSignature
* FieldCalculated
* FieldWorkflowStatus
* FieldTable

---

## Responsabilidades

### ComponentRegistry

Responsable de:

* Registrar componentes
* Resolver componentes
* Mantener desacoplamiento

No contiene:

* Runtime
* Persistencia
* Validaciones

---

### DynamicFieldRenderer

Responsable de:

* Resolver fieldType
* Obtener componente
* Renderizar componente
* Aplicar fallback seguro

---

### Atomic Components

Responsables únicamente de:

* Renderizar UI
* Recibir FieldRenderProps

No contienen:

* Persistencia
* Runtime
* Negocio
* Analytics
* Orchestration

---

## Compatibilidad

Compatible con:

* FORM_SCHEMA_UNIVERSAL
* FIELD_SCHEMA
* SRCL v1.0
* RuntimeActivationLayer
* Form Contract Engine

---

## Resultado

El sistema puede generar formularios dinámicamente utilizando metadata sin necesidad de crear componentes React específicos para cada formato.

Sprint 25 habilita la digitalización masiva futura de formatos SGC.
