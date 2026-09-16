# SPRINT 57.2B — Governed Universal Capability Framework (Core Governance SSOT)

> **Tipo:** Core Architecture / Governance Framework (SSOT)
>
> **Nivel esperado:** LEVEL 3 — CERTIFIED GOVERNED CAPABILITY FRAMEWORK
>
> **Estado esperado:** CORE GOVERNANCE MODEL CERTIFIED
>
> **Restricción (SSOT):**
> - NO modificar código
> - NO crear tablas
> - NO ejecutar SQL
> - NO modificar Runtime
> - NO modificar Metadata Factory
> - NO modificar DynamicModule
> - NO modificar DynamicForm
> - NO modificar ModuleDocumentViewer
> - NO modificar CapabilityRegistry
> - NO modificar CapabilityDiscovery
>
> Solo refinamiento arquitectónico y documentación SSOT.

---

## 0) Objetivo

Convertir el **Universal Capability Framework** (Sprint 57.2A) en un **Framework Gobernado**, estableciendo reglas oficiales mediante las cuales cualquier nueva capacidad podrá ser:

- diseñada
- certificada
- publicada
- evolucionada
- reutilizada dentro del Core

El objetivo pasa de “definir capacidades” a **definir cómo evoluciona el Core de forma controlada**.

Este documento se convierte en la referencia oficial para toda evolución futura del Core.

---

## 1) Revisión arquitectónica obligatoria (57.2A → 57.2B)

Este Sprint incorpora elementos de gobernanza aún no formalizados:

- entidad **Capability Contract** como separación inequívoca frente a Definition/Manifest
- entidad **Capability Interface** (Commands/Queries/Events/Configuration)
- fronteras **Infrastructure / Capability / Business** certificadas
- **Capability Ownership** y **Capability Governance** con responsabilidades por etapa
- **Capability Certification** como proceso SSOT
- **Capability Compatibility Matrix** conceptual
- clasificación de dependencias en **Hard / Soft / Optional**

---

## 2) Capability Contract (formalización)

### 2.1 Problema a eliminar
Ambigüedad entre:
- Capability Definition
- Capability Manifest
- cómo interactúa realmente con el Core

### 2.2 Capacidad Definition (qué es)
Describe qué representa una capacidad.

Incluye:
- identidad (capability_key / id)
- dominio
- versión
- dependencias (declarativas)
- estado lifecycle
- configuración conceptual

### 2.3 Capability Contract (qué define para el Core)
Define **cómo** la capacidad interactúa con el Core.

Formaliza conceptualmente:
- **entradas** (inputs) y **salidas** (outputs) esperadas
- responsabilidades (qué garantiza la capacidad)
- dependencias e invariantes
- compatibilidad (contractual) respecto a Runtime/Metadata/Engine/Repository
- comportamiento esperado (semántica)

### 2.4 Capability Manifest (cómo se publica)
Describe cómo la capacidad es **publicada** dentro del framework.

Incluye elementos conceptuales:
- provides / requires
- runtime hooks (conceptuales)
- routes (conceptuales)
- permissions (conceptuales)
- metadata references
- default configuration
- events

### 2.5 Invariante SSOT
- **Definition** = identidad/alcance conceptual
- **Manifest** = publicación (what it offers/needs)
- **Contract** = integración con el Core (inputs/outputs/responsabilidades/invariantes)

---

## 3) Capability Interface (contrato operativo)

Toda Capability debe exponer una interfaz conceptual estandarizada.

### 3.1 Commands (acciones)
Acciones que la capacidad permite ejecutar.

Ejemplos (conceptuales):
- Create
- Update
- Delete
- Upload
- Complete
- Queries

### 3.2 Queries (lecturas)
Información que la capacidad expone.

Ejemplos:
- Search
- Get
- History
- Status

### 3.3 Events (publicados y consumidos)
- Eventos publicados (producidos por la capacidad)
- Eventos consumidos (dependencias semánticas)

Ejemplos:
- `records.created`
- `repository.document.uploaded`
- `workflow.completed`
- `approval.approved`

### 3.4 Configuration (configuración conceptual)
Configuración conceptual consumida por la capacidad.

Regla:
- no se define formato físico.
- se define semántica conceptual y defaults.

---

## 4) Infrastructure vs Capability vs Business (fronteras certificadas)

Formalizar oficialmente los tres niveles:

### 4.1 Infrastructure
Servicios técnicos reutilizables.

Ejemplos:
- Runtime
- Engine
- Navigation
- Authorization
- Persistence
- Metadata
- Capability Layer

### 4.2 Capability (Infrastructure reusable)
Capacidades reutilizables.

Ejemplos:
- Records
- Repository
- Workflow
- Reports
- Approval
- Dashboard
- Notifications
- Traceability Infrastructure

### 4.3 Business (Business Layer)
Lógica específica del dominio.

Ejemplos:
- despachos
- vehículos
- conductores
- producción
- compras
- inventarios

**Regla permanente (certificada):**

> La lógica de negocio nunca podrá incorporarse al Core.

---

## 5) Capability Ownership (gobernanza por dominio responsable)

Toda Capability debe tener un dominio responsable.

Campos conceptuales:
- **Owner**
- **Dominio**
- **Responsabilidad**
- **Alcance**
- **Dependencias autorizadas**

Objetivo:
- asegurar evolución controlada del catálogo.

---

## 6) Capability Governance (proceso SSOT)

Proceso oficial conceptual:

Proposal
↓
Architecture Review
↓
Capability Definition
↓
Capability Contract
↓
Certification
↓
Publication
↓
Availability

Este documento define responsabilidades por etapa:
- Proposal: origen/razón de necesidad
- Architecture Review: boundary Core/Business + SSOT invariants
- Definition/Contract: semántica completa + integración contractual
- Certification: evaluación SSOT (principios + compatibilidad)
- Publication: alta en catálogo con manifest
- Availability: estado lifecycle pasa a asignable (Available/Enabled)

---

## 7) Capability Certification (SSOT)

Toda nueva Capability debe:
- cumplir principios del framework
- respetar separación Core/Business
- documentar dependencias
- documentar contratos (Capability Contract)
- documentar compatibilidad

Solo después podrá considerarse parte oficial del Core.

---

## 8) Capability Compatibility Matrix (conceptual)

Cada Capability declara compatibilidad respecto a:
- Runtime
- Metadata
- Engine
- Repository
- Authorization
- Navigation
- otras capabilities

Propósito:
- evitar incompatibilidades futuras y garantizar evolución sin regresión.

---

## 9) Dependency Classification (Hard/Soft/Optional)

Clasificar dependencias:

- **Hard Dependency**
  - La capability no puede existir sin la dependencia.
  - Ejemplo conceptual: `records.history` → `records.enabled`.

- **Soft Dependency**
  - Mejora su funcionamiento si existe, pero puede operar sin ella.

- **Optional Dependency**
  - Habilita funcionalidades adicionales; no afecta el funcionamiento principal.

El futuro ModuleCapabilityResolver utiliza esta clasificación en su resolución conceptual.

---

## 10) Capability Identity (gobernanza permanente)

Toda Capability deberá poseer una identidad arquitectónica estable.

Como mínimo se define conceptualmente:
- `capability_id` (identificador estable)
- `capability_key` (clave pública)
- `domain`
- `owner`
- `version`
- `lifecycle`
- `status`

Objetivo:
- Evitar que una Capability sea identificada únicamente por su implementación o por su nombre.
- Asegurar estabilidad durante todo su ciclo de vida.

---

## 10.1) Capability Boundary (frontera arquitectónica)

Cada Capability declara explícitamente:
- responsabilidad única
- alcance funcional
- límites arquitectónicos
- contratos públicos
- responsabilidades excluidas

Principio certificado:
- **Ninguna Capability podrá asumir responsabilidades pertenecientes a otra Capability.**

Objetivo:
- evitar capacidades gigantes (“God Capabilities”).

---

## 10.2) Capability Invariants (reglas permanentes)

Cada Capability define reglas permanentes que nunca podrán romperse.

Ejemplos (ilustrativos por dominio):

- **Repository**
  - nunca conoce módulos
  - nunca conoce lógica de negocio
  - siempre opera vía contratos

- **Records**
  - nunca construye UI
  - nunca conoce Repository

- **Workflow**
  - nunca conoce Metadata interna

Estas reglas se documentan como parte del **Capability Contract**.

---

## 10.3) Capability Composition Rules (reglas de composición)

Certificar cómo se compone el módulo a partir de capacidades:

- una Capability puede consumir otra únicamente mediante **contratos**
- una Capability no puede modificar internamente a otra
- el ensamblaje (assemblage) corresponde exclusivamente al **ModuleCapabilityResolver**
- Runtime y UI consumen el **Capability Set** resultante, nunca capacidades individuales arbitrarias

---

## 10.4) Capability Operational State Model (estado operativo)

Complementar el lifecycle con estado operativo conceptual:

- Disabled
  ↓
- Enabled
  ↓
- Configured
  ↓
- Operational
  ↓
- Degraded

Este modelo describe el estado operativo independientemente del lifecycle.

No se implementa persistencia en esta fase.

---

## 10.5) Capability Configuration Scope (alcances de configuración)

Una Capability puede consumir configuración en distintos alcances conceptuales:

- **Global Configuration**: compartida por todo el sistema
- **Module Configuration**: específica de un módulo
- **Instance Configuration**: específica de una instancia/proceso

Objetivo:
- preparar capacidades configurables sin mezclar responsabilidades.

---

## 10.6) ModuleCapabilityResolver Principles (principios del resolver)

Incorporar principios del futuro ModuleCapabilityResolver:

El Resolver será:
- determinista
- puro
- idempotente
- desacoplado
- sin efectos secundarios
- orientado a contratos

El Resolver únicamente puede:
- validar
- normalizar
- resolver dependencias
- construir el Capability Set

Nunca deberá contener lógica de negocio.

---

## 10.7) Capability Evolution Policy (política de evolución)

Formalizar políticas de evolución del catálogo:

- cambios compatibles
- cambios incompatibles
- cambios mayores
- cambios menores
- criterios para nueva versión
- criterios para deprecación

Objetivo:
- evitar ruptura de contratos durante la evolución del Core.

---

## 10.8) Capability Certification Levels (niveles de certificación)

Complementar el proceso SSOT con niveles:

- Draft
- Reviewed
- Certified
- Operational
- Legacy

Objetivo:
- separar claridad entre una capacidad propuesta y una oficialmente certificada.

---

## 10.9) Framework Design Principles (constitución permanente)

Incorporar principios permanentes del framework:

- Capability First
- Contract First
- Composition over Modules
- Single Responsibility per Capability
- Infrastructure Independence
- Business Isolation
- Runtime Driven
- Metadata Driven
- Configuration Driven
- Governance First
- Backward Compatibility by Default

---

## 11) Compatibilidad preservada


Este documento preserva conceptualmente:
- Sprint 56
- Repository Capability
- Capability Registry
- Capability Discovery
- Runtime Engine
- Metadata Factory
- DynamicModule
- DynamicForm
- ModuleDocumentViewer
- Sprint 57 Fase 0
- Sprint 57.1
- Sprint 57.2
- Sprint 57.2A

Sin introducir regresiones conceptuales.

---

## 12) Entregables (cumplimiento de SSOT)

- Documento principal generado: este archivo.

(El documento complementario de decisiones se crea como Sprint 57.2B/… en el pipeline cuando aplique.)

---

## 13) Dictamen

**PASS — Governed Universal Capability Framework Certified (SSOT)**

Justificación (SSOT):
- Formaliza Capability Contract, Capability Interface, fronteras y proceso de gobernanza.
- Define compatibilidad, clasificación de dependencias y certificación.
- No requiere ni introduce cambios de implementación.

---

# FIN — SPRINT 57.2B

