# MODULE_CONTRACT_v1

> **Tipo:** Arquitectura SSOT (Documentación únicamente)
>
> **Nivel:** CORE ARCHITECTURE (LEVEL 3 — CERTIFIED)
>
> **Documento:** `MODULE_CONTRACT_v1`
>
> **Estado:** BASELINE CERTIFIED

> Este documento es la **Constitución** de la arquitectura de módulos del SGC-DM.
>
> **Regla de evidencia:** toda afirmación debe estar respaldada por los Sprint certificados **45.1, 45.11, 47, 48, 49 y 49A**. Si no hay evidencia, se clasifica explícitamente como **No confirmado**, **Decisión Arquitectónica** o **Plan Estratégico**.

> **Restricciones:** No se modifica ningún código, React, Runtime, Supabase, rutas, servicios, Sidebar, DynamicModule/DynamicForm.

> **Documento:** Arquitectura SSOT (Documentación únicamente)
>
> **Propósito:** Contrato arquitectónico oficial para definir “qué es un módulo” en el **Sistema de Gestión de Calidad (SGC-DM)**.
>
> **Importante:**
> - Este documento **no introduce** cambios de implementación.
> - Este documento **no modifica** código.
> - Este documento **no modifica** runtime, servicios, rutas, componentes, ni persistencia.
>
> **Evidencia permitida (SSOT):** exclusivamente evidencia certificada de los Sprint **45.1**, **45.11**, **47**, **48**, **49** y **49A**.

---

## 1. Introducción

### 1.1 Propósito del Module Contract
El **Module Contract v1** define el contrato arquitectónico oficial que establece:

- qué constituye un **módulo** dentro del SGC-DM,
- cuál es su **identidad oficial**,
- cuáles son sus **capacidades estándar obligatorias**,
- cómo se integra con el **Core certificado** (motores base + formularios + historial), y
- cómo se integra con **Runtime** vía el contrato de puente observado.

El objetivo principal es eliminar ambigüedad informal y asegurar **Single Source of Truth (SSOT)** para la arquitectura de módulos.

### 1.2 Alcance
Este contrato aplica a:

- **Módulos estándar** gobernados por metadata (Metadata Driven Architecture) en el SGC-DM.
- Construcciones de módulo realizadas mediante la **infraestructura certificada** del Core.

### 1.3 Objetivos
1. Establecer definiciones inambiguas para el concepto de módulo.
2. Congelar el estándar de arquitectura para evitar drift (deriva arquitectónica).
3. Hacer explícitas las fronteras de responsabilidad entre:
   - Runtime,
   - módulo,
   - motor documental,
   - motor de formularios,
   - administración Configuration/Factory.
4. Definir restricciones de consistencia: identidad, metadata y navegación.

### 1.4 Relación con Metadata Driven Architecture
De acuerdo con la evidencia certificada del estándar de módulo y la governance de la Metadata Module Factory:

- La **configuración funcional** del módulo se gobierna mediante **metadata persistida** en el modelo `sgc_*`.
- La operación del módulo estándar se habilita en el Core reutilizando dicha metadata.

> Evidencia (SSOT): Sprint 45.1 (Standard Module Specification) y Sprint 47 (Metadata SSOT Principle).

### 1.5 Relación con Runtime
La integración con Runtime está definida en el Core certificado mediante un **bridge**:

- La persistencia/registro de acciones del módulo produce un objeto **`__runtime_internal_event`** (observado en `dynamicService.submitFormResponse`).
- La verificación retorna un evento normalizado con `type: 'verify'` (observado en `dynamicService.verifyFormResponse`).

Este contrato se considera parte de la arquitectura certificada del Core.

> Evidencia (SSOT): Sprint 45.11 (Core boundaries y runtime bridge) + evidencia observable de `dynamicService` auditada en Sprint 45.

### 1.6 Relación con SSOT
Module Contract v1 es la fuente oficial para:

- definir “módulo” y sus invariantes,
- estandarizar capacidades obligatorias,
- fijar restricciones que impiden desviaciones no gobernadas.

### 1.7 Problemas que resuelve
- Interpretaciones divergentes sobre “cómo construir un módulo”.
- Desviaciones por rutas paralelas o configuración no gobernada.
- Falta de claridad en la frontera entre UI/Core y Runtime.

---

## 2. Evolución arquitectónica

> Esta sección documenta la evolución **a nivel de decisiones certificadas**, sin asumir detalles no evidenciados.

- **Sprint 44 — Motor Universal de Ordenamiento**
  - Se establece el principio de un motor reusable para ordenamiento (referencia evolutiva).
  - **Nota SSOT:** el detalle del motor no se amplía aquí porque el contrato se fundamenta principalmente en Sprint 45–49A.

- **Sprint 45 — Consolidación Runtime y Standard Module Specification**
  - Sprint 45 consolida el “Módulo Estándar” como unidad gobernada por metadata.
  - Sprint 45.11 define el Core certificado, fronteras y ownership.

- **Sprint 48 — Metadata Factory (Administration Model)**
  - Sprint 48 formaliza el modelo administrativo de la Metadata Factory.
  - Establece “Freeze / Congelación” y separación de responsabilidades: administración documental vs ejecución.

- **Sprint 49A — Auditoría completa de identidad de módulos (workspace foundation)**
  - Sprint 49A documenta compatibilidad y congelación operacional del workspace administrativo bajo la Foundation Baseline.
  - **Decisiones certificadas**: no introducir desvíos arquitectónicos (sin runtime/servicios/rutas/tabla nuevas) y preservar el handoff al Runtime certificado.

### 2.1 Cómo esas decisiones llevan al Module Contract
La convergencia de:

- **Standard Module** (Sprint 45.1),
- **Core certificado y fronteras** (Sprint 45.11),
- **SSOT de metadata** y **gates** (Sprint 47),
- **gobernanza y freeze state** (Sprint 48/49/49A)

… produce una necesidad: un contrato arquitectónico unificado que defina módulo como entidad gobernada por metadata, persistida y conectada al Core/Runtime certificado.

---

## 3. Definición oficial de un módulo

Un **módulo** (en el alcance de Module Contract v1) es:

> **Una unidad funcional de negocio gobernada por metadata, persistida en el catálogo del modelo `sgc_modules` (y relaciones `sgc_forms`/`sgc_form_fields`), integrada con el Core certificado y conectada con Runtime vía el bridge observado (`__runtime_internal_event`), compuesta por capacidades estándar y lógica de negocio expresada como submódulos gobernados por la misma estandarización.**

> Evidencia (SSOT):
> - Sprint 45.1: módulo estándar como unidad gobernada por metadata y capacidades estándar.
> - Sprint 45.11: Core certificado y runtime bridge.
> - Sprint 47: SSOT de metadata y gates.

---

## 4. Identidad oficial del módulo

Esta sección define la identidad oficial de un módulo exclusivamente con base en la evidencia certificada.

### 4.1 Identificadores
- **id**
  - **Definición:** identidad persistente utilizada como base relacional lógica para obtener los formularios del módulo.
  - **Evidencia (SSOT):** Sprint 45.1 indica que el módulo agrupa `sgc_forms` asociadas mediante el id del módulo; `DynamicModule` consulta `forms` por `moduleData.id`.

- **slug / moduleSlug**
  - **Definición:** identidad navegable (entrada por ruta) usada para descubrir el módulo.
  - **Evidencia (SSOT):** Sprint 45.1 describe ruteo por `moduleSlug` para construir el catálogo.

- **name**
  - **Definición:** identidad de presentación.
  - **Evidencia (SSOT):** Sprint 45.1 indica que `name` se muestra en `DynamicModule` como parte del catálogo.

- **UUID**
  - **Estado SSOT:** **No confirmado** en la evidencia certificada revisada para este contrato.
  - **Decisión/registro SSOT:** si existiera en el modelo físico, **no se utiliza en este contrato** como identidad obligatoria, a menos que se valide explícitamente en un sprint certificado adicional.

### 4.2 Reglas de interpretación de identidad
- **`slug` NO es una Primary Key**.
  - Motivo SSOT: el slug se usa para navegación/descubrimiento; la identidad persistente operacional se describe como `id` para vínculo con `sgc_forms`.

- **`id` es la identidad persistente**.
  - Motivo SSOT: gobierna relaciones lógicas (consulta de formularios por `module_id`).

- **`name` es solo presentación**.
  - Motivo SSOT: se utiliza para visualización del catálogo, no como clave de persistencia.

---

## 5. Capacidades estándar obligatorias

> Regla: **Todos los módulos** que se declaren como módulos estándar bajo Module Contract v1 deben poseer las capacidades estándar del **GENERAL**.

### 5.1 GENERAL

#### a) Diligenciar registros
- **Responsabilidad del módulo:** permitir operación de captura/diligenciamiento mediante los formularios asociados a la metadata del módulo.
- **Evidencia (SSOT):** Sprint 45.1 define “Diligenciar Registros” como capacidad estándar.

#### b) Historial y consultas
- **Responsabilidad del módulo:** habilitar historial y consultas operando con `DynamicRecordsView` para soportar verificación y auditoría dentro del flujo estándar.
- **Evidencia (SSOT):** Sprint 45.1 define “Historial y Consultas” como capacidad estándar.

#### c) Repositorio documental
- **Responsabilidad del módulo:** habilitar repositorio documental a través del modelo de módulo documental reutilizado por el Core (ModuleDocumentViewer / DocumentModule).
- **Evidencia (SSOT):** Sprint 45.1 indica que el repositorio documental existe como capacidad, pero su habilitación puede depender de condiciones observadas.

> **No afirmación no evidenciada:** este contrato no declara que “repositorio documental” sea universalmente parametrizable vía DB, ya que Sprint 45.1 documenta condición/hardcode por slug.

---

## 6. Lógica del negocio

La lógica de negocio de un módulo:

- puede incorporar **submódulos propios**,
- pero debe integrarse manteniendo el flujo estándar del Core certificado.

### 6.1 Ejemplos (expresados como submódulos)
Ejemplos conceptuales coherentes con la estandarización observada en Trazabilidad (no equivalen a una afirmación de estado arquitectónico Golden Module aún; esto se define en Roadmap/decisión):

- **TRAZABILIDAD**
  - Despachos
  - Historial de Despachos
  - Reportes
  - Buscar Registros

- **OPERACIONES**
  - Producción

- **CALIDAD**
  - No conformidades

> **Decisión SSOT:** estos ejemplos describen “tipos de submódulos” de lógica de negocio, sin implementar motores ni componentes nuevos.

---

## 7. Arquitectura del módulo (diagramas Markdown)

### 7.1 Diagrama maestro

```markdown
# Módulo (identidad + capacidades)

[Módulo]
  ├── GENERAL
  │     ├── Diligenciar Registros
  │     ├── Historial y Consultas
  │     └── Repositorio Documental
  │
  └── BUSINESS
        └── Submódulos propios (lógica de negocio)
```

### 7.2 Diagrama de integración con Core y Runtime (fronteras)

```markdown
[Metadata persistida en sgc_*]
          |
          v
 [Core certificado]
 (DynamicModule + DynamicForm + DynamicRecordsView + engines base)
          |
          v
     [dynamicService]
          |
          | produces
          v
 [__runtime_internal_event]
          |
          v
 [Runtime certificado]
```

> Evidencia SSOT: Sprint 45.11 (boundaries y runtime bridge) + Sprint 45.1 (flujo conceptual).

---

## 8. Responsabilidades

### 8.1 Tabla de ownership (SSOT)

| Responsabilidad | Pertenece a |
|---|---|
| Administración de metadata y gobernanza de publicación | **Metadata Factory (Configuration/Factory)** (Sprint 48/49/49A) |
| Render y orquestación del formulario dinámico (por engine) | **Motor de formularios (DynamicForm + engines base)** (Sprint 45.11) |
| Historial/consultas/verificación en el flujo estándar | **DynamicRecordsView** + persistencia/verify vía Core (Sprint 45.11) |
| Persistencia de respuestas, valores EAV y evidencia (según flujo estándar) | **dynamicService** (Sprint 45.11 + evidencia observable en dynamicService) |
| Ejecución operacional y consumo de puente hacia runtime | **Runtime certificado** (vía runtime bridge) |
| Extensión documental (repositorio/programa/visor) | **Motor documental (ModuleDocumentViewer / DocumentModule)** (Sprint 45.11) |

---

## 9. Restricciones

Estas restricciones se consideran **obligatorias** para todo módulo estándar bajo Module Contract v1.

1. **No duplicar identidad**
   - Un módulo debe ser identificado por su identidad persistente (`id`) y su identidad navegable (`slug/moduleSlug`).

2. **No duplicar metadata**
   - Toda configuración del módulo debe derivarse de metadata en el modelo certificado (`sgc_*`).

3. **No crear navegación paralela**
   - El descubrimiento del módulo debe respetar la identidad navegable oficial.

4. **Toda persistencia pasa por `sgc_*` y el Core certificado**
   - El contrato de persistencia del módulo está definido por el Core (dynamicService).

5. **Toda navegación utiliza la identidad oficial**
   - La navegación hacia el módulo y forms debe depender de `moduleSlug/slug` y `module_id` (lógica persistente), siguiendo el estándar.

> Evidencia SSOT: Sprint 45.1 (moduleSlug discovery) + Sprint 47 (SSOT de metadata) + Sprint 45.11 (ownership/boundaries).

---

## 10. Hallazgos de auditoría (decisiones arquitectónicas)

> Nota SSOT: se consolidan **decisiones arquitectónicas** basadas en la evidencia certificada disponible en Sprint 45–49A.
>
> No se copian literalmente reportes.

Las conclusiones relevantes que alimentan Module Contract v1 incluyen:

1. **Freeze / No drift de arquitectura**
   - La operación Factory y el workspace (49A) se mantienen compatibles con la Foundation Baseline.
   - **Decisión:** preservar Core certificado y handoff al Runtime.

2. **SSOT de metadata**
   - `sgc_modules`, `sgc_forms` y `sgc_form_fields` son SSOT funcional para definir capacidades y comportamiento del módulo estándar.
   - **Decisión:** evitar configuraciones paralelas.

3. **Integración Runtime vía bridge normalizado**
   - La interacción con Runtime se formaliza mediante `__runtime_internal_event` y eventos normalizados con `type` (create/verify).
   - **Decisión:** el módulo no inventa otro canal de ejecución.

4. **Ownership claro entre Core/UI/Runtime/Documental**
   - Las fronteras delimitan qué pertenece al módulo (capacidades estándar) y qué pertenece al runtime bridge.
   - **Decisión:** evitar responsabilidad cruzada.

5. **Gobernanza antes que implementación**
   - La publicación del módulo se gobierna por gates y compliance checklist (Sprint 47).
   - **Decisión:** estandarizar el camino para habilitar módulos.

---

## 11. Decisión oficial

### 11.1 Congelamiento estratégico de Dynamic Module Builder
- **Decisión Arquitectónica (no cancelación):** el **Dynamic Module Builder v1** queda congelado estratégicamente.
- **Reglas:**
  - No se elimina.
  - No se reemplaza en esta versión.
  - Se reevalúa únicamente cuando la plataforma base y los módulos estándar estén completamente consolidados.

> Justificación SSOT (basada en evidencia): el estándar actual se alinea con la certificación del Core y con la gobernanza por metadata (Sprint 45–49A). En este contrato, el módulo se integra mediante el Core certificado, evitando desviaciones arquitectónicas.

### 11.2 Estándar oficial adoptado
- **Decisión de Estándar:** la versión actual adopta **Module Contract v1** como **estándar arquitectónico oficial** (SSOT) para todos los módulos del SGC-DM.

---

## 12. Roadmap

> Nota SSOT: el roadmap define **plan estratégico** (no estado implementado) cuando aplique.

### Fase 1 — Consolidar módulos existentes
- Consolidar módulos existentes bajo el cumplimiento del Module Contract v1.

### Fase 2 — Tomar Trazabilidad como Golden Module
- **Plan Estratégico:** Trazabilidad se toma como referencia (Golden Module) para estandarizar el resto.

### Fase 3 — Replicar el contrato
- Replicar el contrato a:
  - Operaciones
  - Calidad
  - Mantenimiento
  - Medición y Control
  - Gestión Documental

### Fase 4 — Evaluar nuevamente un Dynamic Module Builder
- **Plan Estratégico:** revaluar un Dynamic Module Builder únicamente cuando el sistema base esté completamente consolidado.

---

## 13. Estado arquitectónico

```text
ARCHITECTURE STATUS
LEVEL 3 — CERTIFIED

Module Contract v1
Oficial SSOT
```

### 13.1 Conclusión oficial (SSOT)
- **Module Contract v1 pasa a ser el estándar arquitectónico para todos los módulos del SGC-DM.**
- **Dynamic Module Builder v1 queda congelado estratégicamente (no cancelado)** y se revaluará únicamente cuando la plataforma base y los módulos estándar estén completamente consolidados.
- **Trazabilidad será el Golden Module** del proyecto y servirá como referencia para la estandarización del resto de módulos.
- La creación de nuevos módulos, en la versión actual del sistema, se realizará siguiendo el **Module Contract v1**, garantizando consistencia arquitectónica **sin requerir un constructor dinámico**.

---

## Restricciones del Sprint (documentación únicamente)

- No escribir código.
- No modificar archivos existentes.
- No crear componentes.
- No crear servicios.
- No crear tablas.
- No crear Runtime nuevo.
- No crear motores nuevos.
- Únicamente crear este documento.

