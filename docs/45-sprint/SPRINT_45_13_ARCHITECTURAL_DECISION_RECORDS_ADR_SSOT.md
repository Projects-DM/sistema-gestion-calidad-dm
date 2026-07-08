# SPRINT_45_13 — ARCHITECTURAL DECISION RECORDS (ADR) (SSOT)

> Documento SSOT (Solo auditoría documental).
>
> NO implementar código.
> NO modificar componentes.
> NO modificar runtime.
> NO modificar base de datos.
> NO refactorizar.
>
> Exclusión obligatoria:
> **Trazabilidad NO constituye referencia arquitectónica.**

## Estado del documento
**Estado:** **Congelable**

> Cada decisión aquí registrada se considera un **ADR (Architectural Decision Record)**.
>
> Estas decisiones **solo pueden modificarse** mediante revisión arquitectónica formal.

---

## ADR-001 — Arquitectura Metadata Driven
**Estado:** Aceptada

### Contexto
El sistema debe permitir crear módulos nuevos sin desarrollar componentes nuevos.

### Decisión
Toda la definición funcional del módulo debe provenir de metadata.
La UI únicamente interpreta metadata.
Nunca define comportamiento específico del negocio.

### Consecuencias
- **Ventajas:** crecimiento horizontal, reutilización, menor duplicación
- **Costos:** mayor complejidad del motor dinámico, dependencia de metadata consistente

---

## ADR-002 — Persistencia centralizada en dynamicService
**Estado:** Aceptada

### Contexto
Existían múltiples lugares potenciales para escribir información.

### Decisión
Toda persistencia del módulo estándar debe concentrarse en:
- `dynamicService`

No debe existir persistencia paralela para:
- submit
- verify
- history

### Consecuencias
- **Ventajas:** punto único de mantenimiento, contratos claros, menor duplicación
- **Costo:** `dynamicService` se convierte en componente crítico

---

## ADR-003 — Runtime desacoplado mediante Runtime Bridge
**Estado:** Aceptada

### Contexto
El runtime no debe depender directamente del formulario.

### Decisión
- `DynamicForm` nunca invoca runtime interno.
- Siempre utiliza:
  - `dynamicService`
  - `__runtime_internal_event`
  - `runtimeActivationLayer.activate()`

### Consecuencias
- **Ventajas:** desacoplamiento, evolución independiente, compatibilidad futura
- **Costo:** existe un contrato obligatorio entre ambos extremos

---

## ADR-004 — Motores Base reutilizables
**Estado:** Aceptada

### Contexto
Los formularios deben renderizarse sin motores específicos por módulo.

### Decisión
Los formularios utilizan engines genéricos.
No existen engines específicos por módulo.
Motores oficiales:
- `BaseGeneric`
- `BaseChecklist`
- `BaseMediciones`

### Consecuencias
- Todo nuevo comportamiento deberá extender un engine existente o crear uno nuevo compatible.

---

## ADR-005 — Persistencia tipo EAV
**Estado:** Aceptada

### Contexto
Los formularios son dinámicos y los campos cambian constantemente.

### Decisión
Los valores se almacenan mediante Entity Attribute Value (EAV).

### Consecuencias
- **Ventajas:** flexibilidad, crecimiento por metadata
- **Costo:** consultas más complejas

---

## ADR-006 — Runtime Event Contract
**Estado:** Aceptada

### Decisión
El Runtime Bridge únicamente consume:
- `__runtime_internal_event`

Campos mínimos:
- `type`
- `responseId`
- `actorId`
- `correlationId`

No se permiten contratos alternativos.

---

## ADR-007 — Separación entre Presentación y Persistencia
**Estado:** Aceptada

### Decisión
Los componentes UI nunca escriben directamente en runtime.
Toda escritura pasa por servicios.

---

## ADR-008 — Documental como extensión
**Estado:** Aceptada

### Contexto
El ecosistema incluye repositorio documental, pero no debe interferir con el pipeline estándar.

### Decisión
El subsistema documental se considera:
- **Extensión Arquitectónica**
- No pertenece al Core mínimo reutilizable

---

## ADR-009 — DynamicModule como punto de descubrimiento
**Estado:** Aceptada

### Decisión
La navegación estándar comienza siempre desde `DynamicModule`.
Su responsabilidad es descubrir metadata.
No ejecutar formularios.

---

## ADR-010 — DynamicForm como orquestador
**Estado:** Aceptada

### Decisión
`DynamicForm` únicamente orquesta.
No implementa persistencia.
No implementa runtime.
No implementa storage.

Coordina:
- metadata
- engines
- evidencias
- submit
- runtime bridge

---

## ADR-011 — DynamicRecordsView separado del Submit
**Estado:** Aceptada

### Decisión
History y Verification pertenecen a un pipeline distinto.
No forman parte del submit.

Comparten persistencia (misma DB/contratos), pero no comparten responsabilidad.

---

## ADR-012 — Ownership único
**Estado:** Aceptada

### Decisión
Cada responsabilidad crítica posee un único owner.

Ejemplo:
- Persistencia → `dynamicService`
- Runtime → `runtimeActivationLayer`
- Metadata Discovery → `DynamicModule`
- Orquestación → `DynamicForm`
- History → `DynamicRecordsView`

---

## ADR-013 — Compatibilidad hacia atrás
**Estado:** Aceptada

### Decisión
Los cambios futuros deberán preservar:
- contratos públicos
- metadata mínima
- runtime bridge
- EAV

Las extensiones nunca podrán romper módulos existentes.

---

## ADR-014 — Evolución mediante Metadata
**Estado:** Aceptada

### Decisión
La evolución funcional del sistema debe priorizar:
- Agregar metadata antes que agregar código.

---

## ADR-015 — Exclusión de Trazabilidad
**Estado:** Aceptada

### Decisión
Trazabilidad constituye un módulo de negocio.
No representa el estándar arquitectónico.
No puede utilizarse para definir contratos del Core.

---

## ADR-016 — SSOT como única fuente arquitectónica
**Estado:** Aceptada

### Decisión
La arquitectura oficial queda distribuida en:
- Sprint 45.9 — Contratos
- Sprint 45.10 — Dependencias
- Sprint 45.10A — Refinamiento
- Sprint 45.11 — Core
- Sprint 45.11A — Certificación
- Sprint 45.12 — Reglas de Evolución
- Sprint 45.13 — ADR

ADR-017 — Metadata como fuente de verdad (Single Source of Truth)

Actualmente está implícito entre ADR-001 y ADR-014.

Pero nunca queda escrito literalmente.

Sería algo como:

La metadata almacenada en sgc_modules, sgc_forms y sgc_form_fields
constituye la única fuente de verdad para describir el comportamiento
funcional del Módulo Estándar.

Consecuencia:

Nunca duplicar reglas funcionales dentro de componentes UI.

ADR-018 — Contratos públicos primero

Otro principio importante.

Decisión:

Toda modificación deberá preservar primero los contratos públicos
antes que la implementación interna.

Esto protege:

submit
verify
runtime bridge
services
engines
ADR-019 — No duplicación de lógica de negocio

Hoy aparece repartido entre varios documentos.

Conviene dejarlo como decisión explícita.

Ejemplo:

criticidad
required
evidenceRequired
history enrichment

No deben existir implementaciones paralelas.

Debe existir un único owner.

ADR-020 — Separación entre Core y Extensiones

Esto ayuda muchísimo para el futuro.

Definir formalmente:

Core

DynamicModule
DynamicForm
DynamicRecordsView
dynamicService
runtimeActivationLayer
Engines

Extensiones

DocumentModule
ModuleDocumentViewer
Export
PDF Viewer
futuros módulos adicionales


Ningún documento posterior podrá contradecir estos principios sin revisión arquitectónica formal.

---



## Reglas para nuevos ADR
Toda nueva decisión arquitectónica deberá documentar, como mínimo:
- Identificador único (ADR-XXX)
- Estado (Propuesta / Aceptada / Rechazada / Reemplazada)
- Contexto
- Problema
- Alternativas consideradas
- Decisión adoptada
- Justificación
- Consecuencias positivas
- Costos
- Riesgos
- Compatibilidad con el SSOT existente
- Impacto sobre contratos, dependencias y reglas de evolución
- Relación con el SSOT

Cada ADR debe ser consistente con los documentos existentes:
- Sprint 45.9: Contratos observables
- Sprint 45.10: Dependencias
- Sprint 45.10A: Refinamiento de dependencias
- Sprint 45.11: Core arquitectónico
- Sprint 45.11A: Certificación del Core
- Sprint 45.12: Reglas oficiales de evolución
- Sprint 45.13: Registro permanente de decisiones arquitectónicas

