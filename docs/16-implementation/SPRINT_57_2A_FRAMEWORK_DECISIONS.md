# SPRINT 57.2A — Framework Decisions & Trade-offs

> **Tipo:** Documento complementario (SSOT)
>
> **Restricción:** Solo documentación. No modifica código/SQL/SSOT certificados.

---

## 0) Contexto

Este documento registra decisiones arquitectónicas del **Universal Capability Framework** (Sprint 57.2A), con sus trade-offs, riesgos y principios guía.

Fuente de refinamiento:
- Sprint 57.2 (Module Capability Contract Definition)
- Sprint 57.1 (Module Capability Model Design)

---

## 1) Decisión principal: separar entidades del Framework

### 1.1 Decisión
Formalizar una separación explícita entre:
- **Capability Catalog**
- **Capability Definition**
- **Capability Manifest**
- **Capability Plugin**
- **Module Capability Assignment**
- **ModuleCapabilityResolver**
- **Capability Composition**
- **Capability Lifecycle**

### 1.2 Trade-off
- ✅ Mejora trazabilidad y gobernanza (SSOT real).
- ✅ Facilita evolución sin hardcodes.
- ❌ Incrementa complejidad documental vs. un contrato simple.

---

## 2) Capability Catalog: qué debe ser y por qué

### 2.1 Decisión
Catalog debe incorporar **ownership, identidad, dominio, estado, versión, dependencias y contratos**.

### 2.2 Trade-off
- ✅ Evita que capacidades “aparezcan” solo por implementación.
- ✅ Reduce drift conceptual entre dominios.
- ❌ Requiere disciplina de publicación.

---

## 3) Capability Definition: contrato de capacidad

### 3.1 Decisión
Cada capability tendrá una definición conceptual con:
- id
- nombre/descripción
- dominio
- versión
- dependencias
- estado
- configuración conceptual
- eventos publicados/consumidos

### 3.2 Trade-off
- ✅ Permite que el resolver normalice y valide consistentemente.
- ❌ Exige estandarización de semánticas de eventos.

---

## 4) Capability Manifest: por contrato declarativo

### 4.1 Decisión
El Manifest formaliza **provides/requires**, además de:
- runtime hooks (conceptuales)
- rutas (conceptuales)
- permisos (conceptuales)
- metadata (referencias)
- default configuration
- events

### 4.2 Trade-off
- ✅ Permite “publicar” capacidades con un contrato claro.
- ❌ Puede volverse extenso si se sobre-especifica.

---

## 5) Capability Plugin: distribución reusable

### 5.1 Decisión
Capacidades reutilizables se publican como **Capability Plugins**.

### 5.2 Trade-off
- ✅ Facilita marketplace/plugins en el roadmap.
- ✅ Evita acoplamiento.
- ❌ Obliga a diseñar interfaces contractuales del plugin (solo conceptual en esta fase).

---

## 6) Capability Composition: módulos como composición

### 6.1 Decisión
Certificar el principio:
- Un módulo es composición de capacidades, no una funcionalidad única.

### 6.2 Trade-off
- ✅ Alinea con Capability Driven Runtime.
- ❌ Puede requerir refinar cómo se “grupan” capacidades para UI.

---

## 7) Reutilización de Trazabilidad (frontera Core/Business)

### 7.1 Decisión
Definir auditoría conceptual como criterio:
- Core reutilizable: formularios/historial/consulta/repositorio/timeline/workflow/estados/evidencias/navegación.
- Business no reusable: procesos específicos (despachos, lotes, vehículos, conductores, guías, reglas de trazabilidad).

### 7.2 Trade-off
- ✅ Reduce riesgo de “Core con lógica de negocio”.
- ❌ Requiere disciplina al asignar qué parte es infraestructura.

---

## 8) Capability Events (contrato)

### 8.1 Decisión
Modelar capacidad con eventos **publicados** y **consumidos**:
- `records.created`, `records.updated`
- `repository.document.uploaded`
- `workflow.completed`
- `approval.approved`

Sin implementar event bus en esta fase.

### 8.2 Trade-off
- ✅ Alinea con evolución a integración/automation.
- ❌ Incrementa esfuerzo de estandarización semántica.

---

## 9) Capability Dependency Graph

### 9.1 Decisión
Reemplazar dependencias “aisladas” por un grafo conceptual.

### 9.2 Trade-off
- ✅ Resolver consistente y normalizado.
- ❌ Aumenta complejidad de validación conceptual.

---

## 10) Capability Lifecycle y Versioning

### 10.1 Decisión
Definir lifecycle completo:
- Draft, Available, Enabled, Experimental, Deprecated, Removed.

Y versionado conceptual por compatibilidad/rollback/certificación.

### 10.2 Trade-off
- ✅ Evita ruptura de contratos en el tiempo.
- ❌ Añade disciplina de governance.

---

## 11) Principios guía (permanentes)

- Capability First: Core nunca pregunta por módulos.
- Composition over Modules: composición > entidad singular.
- Business Independence: la lógica de negocio no entra al Core.
- Runtime Driven: Runtime consume Capability Set.
- Metadata Driven: metadata define formularios/campos/engines.
- Plugin Oriented: reutilizable como plugin.

---

## 12) Riesgos y mitigaciones

1) **Riesgo:** inflar el Manifest con detalles técnicos.
   - **Mitigación:** mantener Manifest a nivel conceptual/contractual.

2) **Riesgo:** semantic drift de eventos.
   - **Mitigación:** versionar eventos y documentar contratos.

3) **Riesgo:** capacidades demasiado granulares.
   - **Mitigación:** usar dominios y dependencias para encapsular.

---

## 13) Dictamen complementario

Este documento complementa el SSOT principal:
- `SPRINT_57_2A_UNIVERSAL_MODULE_CAPABILITY_FRAMEWORK.md`

y registra las decisiones para guiar la implementación futura.

---

# FIN — SPRINT 57.2A FRAMEWORK DECISIONS

