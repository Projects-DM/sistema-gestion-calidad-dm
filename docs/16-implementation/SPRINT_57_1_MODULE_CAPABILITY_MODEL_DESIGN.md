# SPRINT 57.1 — Module Capability Model Design

> **Tipo:** Diseño arquitectónico (solo conceptual)
>
> **Restricción:** NO crear tablas / NO ejecutar SQL / NO modificar código.
>
> **Dependencias existentes a complementar (no reemplazar):**
> - `CapabilityRegistry` (técnicas globales)
> - `CapabilityDiscovery` (fachada de capacidades técnicas)
> - Runtime Engine (ejecución/render de forms)
> - `DynamicModule` / `DynamicForm` (consumidores actuales)
> - Metadata/servicios actuales

---

## 0) Contexto y evidencia (Fase 0)

De la evidencia de **SPRINT 57 Fase 0** se concluye que hoy la disponibilidad funcional por módulo se determina por:

- **DynamicModule**:
  - carga de módulo y formularios por `moduleSlug`.
  - gate por permisos del rol.
  - disponibilidad del tab **Repositorio Documental** por existencia/activación de repositorio documental (datos).

- **DynamicForm**:
  - gate de permisos para acceder al formulario.
  - render del `engine_type` vía `EngineResolver`.
  - submission vía `dynamicService` y activación posterior de runtime (puente por evento).

- **ModuleDocumentViewer**:
  - disponibilidad de repositorio documental por `moduleSlug`.
  - selección del repositorio activo vía `repos[0]`.
  - categorías y documentos vía `sgc_records` (type = `category_key`).

---

## 1) Separación de responsabilidades (Core vs Module Capability)

### 1.1 CapabilityRegistry

**Responsabilidad (certificada/operativa global):**
- Exponer **capacidades técnicas globales** (p.ej. `authorization`, `navigation`, `engine`).
- No debe conocer módulos ni decisiones de disponibilidad por dominio.

**Contrato esperado (principio):**
- CapabilityRegistry es el “catálogo técnico global”.

### 1.2 CapabilityDiscovery

**Responsabilidad (fachada):**
- Re-exponer capacidades técnicas desde `CapabilityRegistry` en forma consumible por capas superiores.
- Mantener un único punto de acceso para consumidores, sin introducir lógica de negocio.

### 1.3 ModuleCapabilityResolver (nueva capa)

**Responsabilidad (nueva, por módulo):**
- Resolver el **Capability Set funcional** disponible por `moduleSlug`.
- Resolver se limita a:
  - leer el estado habilitado por módulo desde la futura configuración conceptual del modelo.
  - aplicar reglas de dependencia (consistencia del set).
  - devolver un conjunto validado de capacidades funcionales.

**Regla de oro:**
- ModuleCapabilityResolver NO reemplaza CapabilityRegistry/Discovery.
- Solo transforma configuración funcional del módulo → capability set consumible por UI/Runtime.

---

## 2) Capability Taxonomy (catálogo funcional inicial)

A partir de la evidencia actual y del objetivo Sprint 57, se define el catálogo funcional mínimo:

### 2.1 Records

#### `records.create`
- Permite:
  - diligenciar registros
  - crear información operacional

#### `records.history`
- Permite:
  - consultar historial
  - auditoría temporal
  - trazabilidad de cambios

**Dependencia (regla):**
- `records.history` requiere `records.create`.

#### `records.query`
- Permite:
  - búsqueda
  - consulta
  - filtros

**Dependencia (regla):**
- `records.query` requiere `records.create`.

### 2.2 Documents

#### `repository.documents`
- Permite:
  - repositorio documental
  - categorías
  - documentos asociados

**Independencia conceptual:**
- `repository.documents` es independiente de Records.

### 2.3 Reports

#### `reports.generate`
- Permite:
  - reportes
  - indicadores
  - análisis

> Nota de diseño: el catálogo se inicia con lo explícitamente utilizable para evolucionar desde la disponibilidad actual; la activación de `reports.generate` puede mapearse en el siguiente sprint según dónde exista disponibilidad operativa hoy.

---

## 3) Modelo conceptual de datos (sin SQL)

### 3.1 Entidad conceptual: `Module Capability`

Se diseña el siguiente modelo conceptual (sin crear tablas aún):

**Entidad:** `sgc_module_capabilities` (nombre conceptual)

**Campos esperados:**
- `id`
- `module_id` (FK conceptual a módulo)
- `capability_key` (p.ej. `records.create`)
- `enabled` (boolean conceptual)
- `metadata/configuración` (objeto/estructura conceptual)
- `created_at`
- `updated_at`

### 3.2 Cardinalidad
- Un `module_id` puede tener **0..N** capacidades configurables.
- El universo de `capability_key` está acotado por el catálogo funcional (taxonomy).

### 3.3 Restricciones (integridad)
- Un `capability_key` puede aparecer como máximo una vez por `module_id`.
- Las combinaciones inválidas (p.ej. `records.history` habilitado sin `records.create`) deben resolverse por regla de dependencia (ver sección 4).

---

## 4) Reglas de dependencia (consistencia del capability set)

### 4.1 Regla formal de dependencia

**Si** `records.create = false`, **entonces automáticamente**:
- `records.history = false`
- `records.query = false`

### 4.2 Implicación de diseño
- El ModuleCapabilityResolver debe devolver un capability set siempre consistente.
- El sistema debe impedir estados inválidos por:
  - normalización del set al resolver (fallback a false), y/o
  - validación conceptual en la generación del set.

---

## 5) Integración futura con componentes existentes

> En esta fase no se modifica código. Se define el “contrato de consumo” que los componentes deben respetar.

### 5.1 DynamicModule (render de tabs/acciones)

**Antes (actual):**
- `moduleSlug` → render tabs por componentes/rutas + gates por datos/permisos.

**Después (diseño):**

- `moduleSlug`
  |
  ModuleCapabilityResolver
  |
  capability set
  |
  render disponible (tabs y secciones)

### 5.2 DynamicForm (creación/diligenciamiento)

**Validación futura (diseño):**
- DynamicForm debe requerir `records.create`.
- Si no hay capacidad, debe bloquear el acceso (comportamiento consistente con UX actual).

### 5.3 ModuleDocumentViewer (repositorio documental)

**Validación futura (diseño):**
- ModuleDocumentViewer debe requerir `repository.documents`.
- Si no hay capacidad, el componente debe operar en modo “no disponible” (misma consistencia UX que hoy con el tab disabled).

---

## 6) Compatibilidad y preservación de Sprint 56

- El modelo propuesto **no reemplaza** repositorios/documentos actuales.
- El repositorio documental seguirá siendo gobernado por datos (repos/categorías/records) en el sistema actual; solo se añade una capa de “availability por capability set” para evolución.

### 6.1 Regla anti-hardcode
- No deben existir condiciones por módulo del tipo:
  - `if (module === "calidad") ...`
- El componente/flujo debe depender de:
  - `capabilities[capability_key]`.

---

## 7) Criterios de aceptación (Sprint 57.1)

**PASS** cuando:
- ✅ Existe catálogo oficial de capacidades (taxonomy inicial).
- ✅ Existe modelo conceptual de datos (`sgc_module_capabilities` como entidad conceptual).
- ✅ Existe separación Registry vs Module Capability (global técnico vs funcional por módulo).
- ✅ Existen reglas de dependencia formalizadas (records.* dependientes de records.create).
- ✅ Existe plan de integración progresiva (DynamicModule/DynamicForm/ModuleDocumentViewer).
- ✅ No se modificó código ni base de datos.

**FAIL** cuando:
- Se definan capacidades que no están soportadas por el inventario de disponibilidad funcional.
- Se asuma “capability-driven” sin formalizar el resolver conceptual.
- Se incluya creación de tablas/SQL o cambios de implementación en esta fase.

---

# FIN — SPRINT 57.1

