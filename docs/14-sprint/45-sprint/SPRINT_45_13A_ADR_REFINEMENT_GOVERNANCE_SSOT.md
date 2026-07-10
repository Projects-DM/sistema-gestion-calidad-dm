# SPRINT_45_13A — ADR REFINEMENT & GOVERNANCE (SSOT)

> Documento SSOT (Solo auditoría documental / gobernanza).
>
> NO implementar código.
> NO modificar arquitectura.
> NO modificar componentes.
> NO modificar runtime.
> NO modificar base de datos.
> NO refactorizar.
>
> Exclusión obligatoria:
> **Trazabilidad NO constituye referencia arquitectónica.**
>
---

## 0) Alcance
Revisar **exclusivamente** el documento:
- `docs/45-sprint/SPRINT_45_13_ARCHITECTURAL_DECISION_RECORDS_ADR_SSOT.md`

Objetivo:
- Convertir el ADR repository en un registro **oficial**, **alineado** con los Sprint 45.9–45.12 y con la gobernanza pedida en el prompt del usuario.

No se valida ni modifica código.

---

## 1) Validación de ADR existentes (45.13) contra SSOT (45.9–45.12)

> Resultado documental: el documento 45.13 es **coherente** con el núcleo (45.11) y con las reglas de evolución (45.12) en términos generales.

### 1.1 Redundancias detectadas
- **ADR-001 (Metadata Driven)** y **ADR-014 (Evolución mediante Metadata)** están parcialmente solapados.
  - Diferencia documental: ADR-001 define la arquitectura (principio), ADR-014 define una regla de evolución (prioridad operativa).
  - Conclusión: **no se considera contradicción**, pero sí **redundancia parcial**.

### 1.2 Contradicciones detectadas
- **No se detectan contradicciones** explícitas entre ADR.

### 1.3 Decisiones duplicadas
- No hay duplicación exacta.

### 1.4 Decisiones incompletas (brechas de gobernanza)
- Todos los ADR actuales mantienen:
  - ID
  - Estado (solo “Aceptada”)
  - Contexto y Decisión
- Sin embargo, faltan sistemáticamente campos de gobernanza requeridos por el prompt del usuario:
  - **Impacto contractual** (cuando aplica)
  - **Impacto sobre dependencias** (cuando aplica)
  - **Relación con invariantes (45.12)**
  - **Relación entre ADR (depende/relaciona/reemplaza)**
  - **Estados de ciclo de vida** (solo “Aceptada”)

---

## 2) Incorporación formal de ADR adicionales (si la evidencia lo soporta)

> Criterio: como el sistema observado ya afirma separación Core/Extensión, metadata driven, contratos públicos prioritarios y ownership único en documentos previos, estas nuevas ADR quedan **alineadas** con evidencia SSOT.

### ADR-017 — Metadata as Single Source of Truth
**Estado:** Aceptada

**Contexto**
El comportamiento funcional del módulo estándar se describe por metadata en sgc_*.

**Problema**
Evitar que lógica “de negocio” se codifique en UI/flujo, produciendo divergencia entre metadata y comportamiento.

**Alternativas consideradas**
- Lógica centralizada en UI con metadata mínima
- Lógica centralizada en servicios con metadata parcial

**Decisión**
`sgc_modules`, `sgc_forms`, `sgc_form_fields` son la única fuente de verdad para el comportamiento funcional del módulo estándar.

**Justificación**
- Consistencia con ADR-001 y el objetivo del sistema.

**Consecuencias positivas**
- Coherencia del SSOT
- Menor duplicación de lógica

**Costos**
- Requiere consistencia de metadata

**Riesgos**
- Metadata inconsistente rompe semántica funcional

**Compatibilidad hacia atrás**
- No aplica breaking si el modelo actual respeta sgc_* como fuente

**Impacto contractual**
- Consistencia con contratos observables de submit/verify/history

**Impacto sobre dependencias**
- Mayor peso de lectura de sgc_* por UI/servicios

**Relación con otros ADR**
- Relaciona con ADR-001 y ADR-014

---

### ADR-018 — Public Contracts First
**Estado:** Aceptada

**Contexto**
Existen contratos públicos observables entre UI ↔ servicios ↔ bridge ↔ runtime.

**Problema**
Evitar cambios internos que “parezcan” compatibles pero rompan contratos públicos.

**Alternativas consideradas**
- Cambiar contratos internos para optimización sin compatibilidad
- Permitir múltiples contratos alternativos

**Decisión**
Los contratos públicos observados tienen prioridad. Ningún cambio interno puede romper:
- submit
- verify
- runtime bridge
- contratos observables

**Consecuencias positivas**
- Estabilidad del flujo estándar

**Costos**
- Menor libertad interna

**Riesgos**
- Cambios internos requieren disciplina documental

**Compatibilidad hacia atrás**
- Mantenimiento estricto

**Impacto contractual**
- Inmoviliza semántica observable de submit/verify/bridge

**Impacto sobre dependencias**
- Congela dependencias de runtime y services hacia contrato

**Relación con otros ADR**
- Refuerza ADR-006, ADR-003 y ADR-002

---

### ADR-019 — Business Logic Ownership
**Estado:** Aceptada

**Contexto**
Se observan responsabilidades funcionales que podrían duplicarse entre UI y servicios.

**Problema**
Evitar duplicación de lógica funcional.

**Alternativas consideradas**
- Permitir cálculos duplicados en UI y services
- Distribuir responsabilidades sin ownership único

**Decisión**
La lógica funcional nunca debe existir duplicada. Responsabilidades como:
- criticidad
- required
- evidenceRequired
- history enrichment

deben tener un único owner.

**Consecuencias positivas**
- Menos divergencias
- Traceabilidad documental

**Costos**
- Requiere identificación explícita de ownership

**Riesgos**
- Si el owner cambia sin gobernanza, se rompe consistencia

**Compatibilidad hacia atrás**
- No cambia contratos; disciplina documental

**Impacto contractual**
- Afecta semántica observable (criticidad/required) vía metadata

**Impacto sobre dependencias**
- Focaliza dependencias hacia el owner

**Relación con otros ADR**
- Refuerza ADR-012 (Ownership único)

---

### ADR-020 — Core vs Extensions
**Estado:** Aceptada

**Contexto**
Existe diferenciación entre core reutilizable y subsistemas opcionales/extensiones.

**Problema**
Evitar que extensiones se vuelvan invariantes del core.

**Alternativas consideradas**
- Tratar documental como parte del core
- Mezclar extensión con pipeline submit/verify

**Decisión**
Separación oficial:
- **Core Arquitectónico**: `DynamicModule`, `DynamicForm`, `DynamicRecordsView`, `dynamicService`, `runtimeActivationLayer`, Engines base.
- **Extensiones**: `DocumentModule`, `ModuleDocumentViewer`, `Export`, `PdfViewer`, futuros módulos opcionales.

**Consecuencias positivas**
- Claridad de invariantes
- Evolución independiente del documental

**Costos**
- Requiere disciplina al definir “core mínimo”

**Riesgos**
- Si se mezcla core/extensión, se romperá el SSOT

**Compatibilidad hacia atrás**
- Coherente con ADR-008 y con Sprint 45.11

**Impacto contractual**
- No altera contratos; delimita invariantes

**Impacto sobre dependencias**
- Reduce acoplamientos conceptuales

**Relación con otros ADR**
- Refuerza ADR-008, ADR-010, ADR-011

---

## 3) Refinamiento de la plantilla ADR (gobernanza documental)

El documento 45.13 solo contiene algunos campos. Para gobernanza SSOT, se **adopta** la siguiente plantilla como estándar documental (sin reescribir lógica):

- ADR-XXX
- Estado (ciclo de vida)
- Contexto
- Problema
- Alternativas consideradas
- Decisión adoptada
- Justificación
- Consecuencias positivas
- Costos
- Riesgos
- Compatibilidad hacia atrás
- Impacto contractual
- Impacto sobre dependencias
- Relación con otros ADR
- Relación con invariantes (Sprint 45.12)

> Nota: se documenta la regla de plantilla; no se refuerza código.

---

## 4) Estados oficiales del ciclo de vida
Se definen estados permitidos para el ADR repository:
- **Proposed**
- **Accepted**
- **Rejected**
- **Superseded**
- **Deprecated**

Estado existente en 45.13:
- “Aceptada” se normaliza documentalmente como **Accepted**.

---

## 5) Relaciones entre ADR (gobernanza)

> Se documenta relación “de alto nivel” según consistencia SSOT.

- ADR-001 depende de: ADR-017 (SSOT metadata)
- ADR-002 depende de: ADR-018 (contracts first)
- ADR-003 depende de: ADR-006 (runtime event contract)
- ADR-004 se relaciona con: ADR-020 (core/extensiones)
- ADR-008 se relaciona con: ADR-020 (extensión)
- ADR-010 se relaciona con: ADR-003 y ADR-002
- ADR-011 se relaciona con: ADR-012 y ADR-020
- ADR-012 se relaciona con: ADR-019 (ownership único)
- ADR-014 se relaciona con: ADR-001 y ADR-017
- ADR-015 se relaciona con: regla de exclusión obligatoria (trazabilidad no estándar)
- ADR-016 se relaciona con: todo el conjunto (SSOT como fuente)

---

## 6) Clasificación de cada ADR

- **Core:** ADR-003, ADR-004, ADR-006, ADR-010, ADR-011, ADR-020
- **Governance:** ADR-012, ADR-013, ADR-018, ADR-019
- **Runtime:** ADR-003, ADR-006
- **Metadata:** ADR-001, ADR-014, ADR-017
- **Persistence:** ADR-002, ADR-005
- **UI:** ADR-007
- **Extension:** ADR-008

---

## 7) Matriz de trazabilidad documental (ADR → contratos/dependencias/reglas/componentes)

> Nota: se “asocia” documentalmente usando Sprint 45.9–45.12.

| ADR | Contratos afectados | Dependencias | Reglas de evolución | Componentes afectados |
|---|---|---|---|---|
| ADR-001 | submit/verify/history indirectos vía metadata | sgc_modules/forms/fields | 45.12 (metadata→evolución) | DynamicModule/DynamicForm/Engines |
| ADR-002 | submit/verify/history centralización | dynamicService | 45.12 (invariantes persistencia) | dynamicService |
| ADR-003 | runtime bridge contract | runtimeActivationLayer + __runtime_internal_event | 45.12 (puente) | DynamicForm/DynamicRecordsView |
| ADR-004 | contrato engine props | Engines base | 45.12 (engine evolucion) | BaseGeneric/BaseChecklist/BaseMediciones |
| ADR-005 | EAV mapping | sgc_response_values | 45.12 (EAV) | DynamicForm/DynamicRecordsView/dynamicService |
| ADR-006 | __runtime_internal_event mínimos | runtimeActivationLayer | 45.12 (runtime contract) | DynamicForm/DynamicRecordsView/RuntimeActivationLayer |
| ADR-007 | separación UI↔services | dynamicService | 45.12 (boundary) | UI components |
| ADR-008 | core/extensión documental | documentsService | 45.12 (extensiones) | DocumentModule/ModuleDocumentViewer |
| ADR-009 | metadata discovery navegado | dynamicService | 45.12 (entrypoint) | DynamicModule |
| ADR-010 | orquestación | engines/evidence/submit | 45.12 (responsabilidad) | DynamicForm |
| ADR-011 | separación submit vs history | dynamicService (lectura/verify) | 45.12 (pipelines) | DynamicRecordsView |
| ADR-012 | ownership y responsabilidades | UI/services/runtime | 45.12 (ownership) | core pipeline |
| ADR-013 | compatibilidad hacia atrás | contratos/metadata | 45.12 (compatibilidad) | todos los core |
| ADR-014 | priorizar metadata | sgc_* | 45.12 (evolución) | metadata-driven growth |
| ADR-015 | exclusión trazabilidad | gating de estándar | 45.12 (no referencia trazabilidad) | todo el estándar |
| ADR-016 | fuente SSOT | conjunto de sprints 45.9–45.12 | 45.12 (SSOT único) | repository |
| ADR-017 | metadata SSOT | sgc_* | 45.12 (metadata) | dynamicService/Engines/DynamicForm |
| ADR-018 | contratos públicos | runtime bridge | 45.12 (contracts) | submit/verify/bridge |
| ADR-019 | ownership no duplicación | responsible components | 45.12 (ownership) | criticidad/required/evidence/history |
| ADR-020 | core vs extensión | documental/otros opcionales | 45.12 (core freeze) | core pipeline vs documental |

---

## 8) Certificación del ADR repository

**Resultado:** **Congelable**

**Justificación documental:**
- El set base (45.13) define invariantes arquitectónicas y governance.
- La refinación propuesta agrega ADRs faltantes (017–020) que formalizan:
  - metadata SSOT
  - prioridad de contratos públicos
  - ownership de lógica funcional
  - separación core vs extensión documental
- Las reglas de evolución (45.12) quedan aplicadas mediante la gobernanza y relaciones ADR.

---


