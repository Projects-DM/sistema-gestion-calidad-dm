# SPRINT 57.2 — Module Capability Contract Definition

> **Tipo:** Arquitectura Core / Contract Design (SSOT)
>
> **Nivel esperado:** LEVEL 3 — CERTIFIED CONTRACT
>
> **Estado esperado:** MODULE CAPABILITY CONTRACT CERTIFIED
>
> **Restricción:**
> - NO modificar código.
> - NO crear tablas.
> - NO ejecutar SQL.
> - NO modificar Runtime existente.
> - NO alterar DynamicModule ni DynamicForm.
> - Solo diseño contractual y documentación oficial.

---

## 0) Objetivo

Definir el **contrato oficial** mediante el cual el Core determina qué funcionalidades posee un módulo.

Este contrato será la base para que, en los siguientes sprints, cualquier módulo pueda construirse únicamente mediante configuración, reutilizando:

- `CapabilityRegistry`
- `CapabilityDiscovery`
- Runtime Engine
- Metadata System
- capacidades técnicas existentes

**Objetivo no funcional:**
- No añadir nuevas funcionalidades.
- Estandarizar cómo se describen y cómo se expresan las capacidades por módulo.

---

## 1) Principio arquitectónico: jerarquía Core

Debe establecerse oficialmente la siguiente jerarquía conceptual:

```text
Core
│
├── Technical Capabilities
│      ├── Authorization
│      ├── Navigation
│      ├── Engine
│      └── Runtime
│
└── Functional Capabilities
       │
       └── Module Capability Contract
               │
               └── Module Capability Resolver
                       │
                       └── DynamicModule
```

---

## 2) Contrato conceptual: Capability Set

Cada módulo deberá poder describirse mediante **un único contrato conceptual**.

Ejemplo ilustrativo (NO representa estructura física):

```yaml
module:
  slug: calidad

capabilities:
  records:
    enabled: true
    create: true
    history: true
    query: true

  repository:
    enabled: true

  reports:
    enabled: true
```

---

## 3) Principios obligatorios

### 3.1 Capability First

El Core **nunca** preguntará:

- “¿Qué módulo es?”

El Core siempre preguntará:

- “¿Qué capacidades tiene?”

Quedan prohibidos patrones como:

- `if (module === "calidad") ...`

Toda decisión debe depender del **capability set**.

### 3.2 Runtime Driven

El Runtime **nunca** conocerá módulos.

El Runtime solo recibe:

- Capability Set
- y actúa en consecuencia.

### 3.3 Metadata Driven

La Metadata continúa definiendo:

- formularios
- campos
- engines

Las capacidades únicamente determinan si la funcionalidad está disponible.

### 3.4 Repository Independence

El contrato **no reemplaza**:

- `sgc_document_repositories`
- `sgc_document_repository_categories`
- `sgc_records`

El contrato solo determina si el módulo puede utilizar el repositorio.

### 3.5 Engine Independence

El contrato **nunca** selecciona engines.

Los engines continúan determinados por:

- `engine_type`

---

## 4) Catálogo inicial (funcionalidades certificadas)

Se certifica el siguiente catálogo inicial:

### 4.1 Records
- `records.enabled` (capacidad raíz)
- `records.create`
- `records.history`
- `records.query`

### 4.2 Documents
- `repository.documents`

### 4.3 Reports
- `reports.generate`

---

## 5) Reglas de dependencia (integridad del capability set)

Debe certificarse oficialmente la regla raíz:

- `records.enabled` es la capacidad raíz.

Si:

- `records.enabled = false`

Entonces automáticamente:

- `records.create = false`
- `records.history = false`
- `records.query = false`

**Propósito:**

- Evitar estados inconsistentes.

---

## 6) Contrato del ModuleCapabilityResolver (conceptual)

### 6.1 Responsabilidad

El futuro `ModuleCapabilityResolver` (capa conceptual) debe entregar un capability set normalizado.

### 6.2 Contrato de entrada/salida

**Entrada:**

- `moduleSlug`

**Salida:**

- Un `Capability Set` normalizado (formato lógico libre; semántica fija).

Ejemplo ilustrativo de salida (no obligatorio el formato exacto):

```json
{
  "records": {
    "enabled": true,
    "create": true,
    "history": true,
    "query": true
  },
  "repository": {
    "documents": true
  },
  "reports": {
    "generate": false
  }
}
```

---

## 7) Integración esperada (cómo consumir el contrato)

### 7.1 DynamicModule

Antes:

- `moduleSlug`
  ↓
- consultas individuales
  ↓
- mostrar tabs

Después (visión contractual):

- `moduleSlug`
  ↓
- `ModuleCapabilityResolver`
  ↓
- `Capability Set`
  ↓
- render disponible

### 7.2 DynamicForm

- Debe validar únicamente:
  - `records.create`

### 7.3 DynamicRecords / Historial / Consulta

- Debe validar:
  - `records.history`
- Debe validar:
  - `records.query`

> Nota: esta sección certifica la regla de disponibilidad por capability set. La evidencia concreta de componentes específicos se valida en fases posteriores.

### 7.4 ModuleDocumentViewer

- Debe validar:
  - `repository.documents`

### 7.5 Reportes

- Debe validar:
  - `reports.generate`

---

## 8) Compatibilidad

Este contrato debe preservar completamente:

- Sprint 56
- Repository Capability
- Capability Discovery
- Runtime
- Metadata Factory
- Engine Resolver

No podrá introducir regresiones.

---

## 9) Visión arquitectónica final (hacia implementación)

El objetivo final del Core queda definido como:

```text
Nuevo Módulo
  ↓
Nombre
  ↓
Capabilities
  ↓
Metadata
  ↓
Guardar
  ↓
Core
  ↓
Módulo completamente operativo
```

Sin escribir componentes específicos para cada módulo.

---

## 10) Criterios de aceptación (Sprint 57.2)

Sprint queda certificado cuando:

- ✅ Existe el contrato oficial del Capability Set.
- ✅ Existe el contrato conceptual del `ModuleCapabilityResolver`.
- ✅ Se definen las capacidades iniciales certificadas.
- ✅ Se establecen las reglas de dependencia.
- ✅ Se define cómo consumirán el contrato `DynamicModule`, `DynamicForm` y `ModuleDocumentViewer`.
- ✅ Se garantiza compatibilidad con Sprint 56 y el Runtime existente.
- ✅ No se modifica código, base de datos ni Runtime.

---

## 11) Validación final SSOT

- Este documento es el **SSOT** (Single Source of Truth) para la implementación posterior del `ModuleCapabilityResolver` y la persistencia de capacidades.
- La evolución del Core debe mantener un único contrato arquitectónico estable y reutilizable.

---

# FIN — SPRINT 57.2

