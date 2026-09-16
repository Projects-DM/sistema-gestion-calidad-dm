# SPRINT 57.2A — Universal Module Capability Framework (Architectural Refinement)

> **Tipo:** Arquitectura Core / SSOT Refinement
>
> **Nivel esperado:** LEVEL 3 — CERTIFIED UNIVERSAL CAPABILITY FRAMEWORK
>
> **Restricción (SSOT):**
> - NO modificar código
> - NO crear tablas
> - NO ejecutar SQL
> - NO modificar Runtime
> - NO modificar DynamicModule
> - NO modificar DynamicForm
> - NO modificar ModuleDocumentViewer
> - Solo refinamiento arquitectónico y documentación SSOT

---

## 0) Objetivo

Refinar el contrato definido en **SPRINT 57.2** para convertirlo en el **Framework Universal de Capacidades Modulares del Core**.

El objetivo deja de ser únicamente describir qué funcionalidades posee un módulo.

El objetivo pasa a ser definir el **modelo arquitectónico** mediante el cual **toda nueva funcionalidad** del sistema deberá diseñarse, publicarse, configurarse y reutilizarse.

Este documento se convierte en la guía oficial para la evolución del Core.

---

## 1) Alcance

- Realizar una revisión completa del contrato actual.
- Incorporar reglas necesarias para evolucionar durante los próximos años sin introducir hardcodes ni módulos especiales.

**No implementación.**

---

## 2) Principio arquitectónico permanente

Debe certificarse oficialmente el siguiente principio del Core:

> **Toda funcionalidad reutilizable deberá implementarse como una Module Capability.**

Quedan prohibidas funcionalidades acopladas directamente a un módulo específico.

Ejemplos incorrectos (prohibidos):

- `if (module === "trazabilidad") { ... }`
- `if (module === "calidad") { ... }`

Toda decisión funcional debe depender exclusivamente del **Capability Set**.

---

## 3) Capability Framework (refinamiento de SPRINT 57.2)

Este framework separa formalmente cuatro conceptos:

1) **Capability Catalog** (catálogo)

Catálogo oficial de capacidades soportadas por el Core.

Ejemplos:
- `records.*`
- `repository.*`
- `traceability.*`
- `reports.*`
- `workflow.*`
- `approval.*`
- `notifications.*`
- `integration.*`
- `dashboard.*`

2) **Capability Definition**

Estructura conceptual de cada capacidad soportada por el Core.

Campos esperados (conceptuales):
- `capability_key`
- `nombre`
- `descripción`
- `dominio`
- `versión`
- `dependencias`
- `estado` (Available/Enabled/Experimental/Deprecated/Removed)
- `configuración conceptual`

3) **Module Capability Assignment** (asignación por módulo)

Declaración por `moduleSlug` de qué capacidades consume.

Propósito:
- permitir activar/desactivar sin modificar código.

Regla de compatibilidad:
- la asignación no reemplaza metadata/servicios existentes.

4) **ModuleCapabilityResolver** (resolver por módulo)

Responsabilidad refinada (más allá de “consultar configuración”):

Debe:
- validar
- normalizar
- resolver dependencias
- aplicar defaults
- devolver un **Capability Set consistente**

---

## 4) Universal Capability Domains (dominios funcionales)

Formalizar el concepto de dominios funcionales para estandarizar taxonomía y evolución.

Como mínimo:
- `records.*`
- `repository.*`
- `traceability.*`
- `reports.*`
- `workflow.*`
- `approval.*`
- `notifications.*`
- `integration.*`
- `dashboard.*`

Este documento **no implementa** estos dominios.

Solo define el modelo para futuras capacidades manteniendo la misma estructura.

---

## 5) Evolución de Traceability hacia capacidad reutilizable (auditoría conceptual)

**Objetivo:** determinar qué partes del módulo Trazabilidad pueden convertirse en capacidades reutilizables.

Partes a analizar (incluye lo requerido):
- navegación
- formularios
- historial
- consulta
- repositorio documental
- lógica de negocio específica
- componentes reutilizables
- contratos existentes

**Resultado esperado (frontera Core vs Business):**
- Infraestructura reutilizable (candidatas a capabilities):
  - habilitación de repositorio documental vía `repository.documents`
  - habilitación de navegación estándar vía capacidades técnicas/navegación
  - habilitación de formularios via disponibilidad de capacidades de registros
  - habilitación de historial/consulta vía `records.history` y `records.query`
- Lógica de negocio (no reusable como Core):
  - decisiones de dominio/estados/reglas del proceso específico de Trazabilidad

Nota SSOT:
- La reutilización corresponde a capacidades de infraestructura y experiencia estándar.

---

## 6) Capability Lifecycle (ciclo de vida)

Incorporar al contrato un ciclo de vida:

- `Available` (definida en catálogo)
- `Enabled` (asignable y activa)
- `Experimental`
- `Deprecated`
- `Removed`

Aunque inicialmente solo se use `Enabled`, el framework certifica el modelo para evolución futura.

---

## 7) Versionado del contrato

Justificar necesidad de versión para compatibilidad futura.

Regla conceptual:
- Cada Capability Definition y/o Module Capability Contract debe incluir versionado para evitar drift.

Este framework asume versionado conceptual (sin persistencia en esta fase).

---

## 8) Capability Validation Pipeline (contrato del resolver)

Formalizar el pipeline conceptual del resolver.

Pipeline oficial (contrato):

Module
↓
Capability Assignment
↓
Validation
↓
Dependency Resolution
↓
Normalization
↓
Capability Set
↓
Runtime / UI

Este pipeline se convierte en el contrato oficial del Core.

---

## 9) Reglas de extensibilidad (cómo incorporar nuevas capacidades)

Proceso oficial para toda nueva funcionalidad:

1. Criterio “reutilizable”
   - Si puede ser usada por múltiples módulos y no es específica de un dominio.

2. Registro conceptual
   - Se registra como **Capability Definition** en el catálogo.

3. Declaración de dependencias
   - Se especifican dependencias en el modelo de dependencias.

4. Integración con Runtime/ UI
   - Runtime/ UI consumen el **Capability Set**, no módulos.

5. Asignación a módulos
   - Cada módulo activa capacidades vía Module Capability Assignment.

6. Reutilización futura
   - Otros módulos asignan las capacidades sin cambiar el Core.

---

## 10) Compatibilidad preservada (SSOT)

Este framework preserva conceptualmente:
- CapabilityRegistry
- CapabilityDiscovery
- Runtime Engine
- Metadata Factory
- DynamicModule
- DynamicForm
- ModuleDocumentViewer
- Repository Capability (Sprint 56)
- Sprint 57 Fase 0
- Sprint 57.1
- Sprint 57.2

No introduce regresiones conceptuales.

---

## 11) Roadmap arquitectónico actualizado

Secuencia (mínima) para evolución:

Sprint 57
↓
Capability Framework
↓
Capability Catalog
↓
Capability Persistence
↓
Capability Resolver
↓
Capability Driven Runtime
↓
Dynamic Module Factory
↓
Universal Module Platform

Justificación del orden:
- primero se certifica el contrato (framework/catálogos)
- luego se habilita persistencia
- después el resolver y consumo driven por runtime/ui

---

## 12) Criterios de aceptación (Sprint 57.2A)

Queda certificado cuando:

- ✅ Se establece el Framework Universal de Capacidades del Core.
- ✅ Se diferencian formalmente:
  - Capability Catalog
  - Capability Definition
  - Module Capability Assignment
  - ModuleCapabilityResolver
- ✅ Se definen dominios funcionales reutilizables.
- ✅ Se documenta cómo convertir la lógica de Trazabilidad en capacidades reutilizables (frontera Core/Business).
- ✅ Se formaliza el pipeline de validación y resolución.
- ✅ Se establece el proceso oficial para incorporar nuevas capacidades.
- ✅ Se mantiene compatibilidad con arquitectura certificada existente.
- ✅ No se modifica código, base de datos ni Runtime.

---

## 13) Dictamen final (evidencia conceptual)

**PASS / FAIL (dictamen SSOT):** **PASS**

Justificación:
- El framework refina sin implementar; solo consolida contratos del modelo.
- Mantiene compatibilidad con el catálogo funcional ya definido en Sprint 57.2.
- Certifica reglas para eliminar hardcodes funcionales por módulo.

---

# FIN — SPRINT 57.2A

