# ENGINE_REGISTRY.md
## Registry Oficial de Motores Dinámicos
### Sistema de Gestión de Calidad (SGC-DM)

---

# 1. Propósito del Documento

Este documento define oficialmente la arquitectura de motores dinámicos (Engines) utilizados dentro del Sistema de Gestión de Calidad (SGC-DM).

Los engines representan la capa central de interpretación operativa del sistema y son responsables de:

- renderizar formularios dinámicos,
- controlar comportamiento UI/UX,
- validar reglas operativas,
- manejar workflows,
- procesar evidencias,
- habilitar trazabilidad,
- soportar capacidades IA,
- y garantizar reutilización escalable.

---

# 2. Filosofía Arquitectónica

La arquitectura del sistema NO está basada en formularios hardcodeados.

El sistema sigue un enfoque:

## Metadata-Driven Architecture

Donde:

- los formularios son metadata,
- los engines interpretan comportamiento,
- y los componentes renderizan experiencia visual.

Esto permite:

- escalabilidad masiva,
- reutilización,
- reducción de duplicidad,
- generación dinámica,
- compatibilidad IA,
- y mantenibilidad enterprise.

---

# 3. Jerarquía Arquitectónica

```txt
Form Schema
    ↓
Engine
    ↓
Component Registry
    ↓
Dynamic Renderer
    ↓
Runtime Records
```

---

# 4. Motores Oficiales del Sistema

| Engine | Propósito Principal | Estado |
|---|---|---|
| BaseChecklist | Checklists operativos y BPM | Oficial |
| BaseMediciones | Variables numéricas y sanitarias | Oficial |
| BaseWorkflow | Procesos multiestado y aprobaciones | Oficial |
| BaseTrazabilidad | Seguimiento operativo y lotes | Oficial |
| BaseMantenimiento | Gestión de mantenimiento | Oficial |
| BaseCapacitaciones | Gestión de capacitaciones | Oficial |
| BaseDocumental | Gestión documental y versiones | Oficial |

---

# 5. Engine: BaseChecklist

## Propósito

Motor orientado a procesos de verificación operativa basados en:

- cumplimiento,
- inspección,
- BPM,
- auditoría,
- limpieza,
- validación visual.

---

## Casos de Uso

- Limpieza y desinfección
- BPM
- Verificaciones sanitarias
- Inspecciones
- Auditorías internas
- Checklists operativos

---

## Capacidades

| Capacidad | Soporte |
|---|---|
| Cumple / No cumple | ✅ |
| Observaciones | ✅ |
| Acción correctiva | ✅ |
| Reinspección | ✅ |
| Firma digital | ✅ |
| Evidencias | ✅ |
| Workflow aprobación | ✅ |
| IA compatible | ✅ |

---

## Componentes Compatibles

```txt
ChecklistSection
ApprovalSection
SignatureBlock
EvidenceUploader
CorrectiveActionSection
StatusBadge
```

---

## Tipos de Campo Compatibles

```txt
checkbox
textarea
select
radio
signature
file_upload
```

---

## Workflows Compatibles

```txt
workflow_verificacion
workflow_aprobacion
workflow_reinspeccion
```

---

## Compatibilidad IA

```txt
compliance_scoring
anomaly_detection
audit_assistant
```

---

# 6. Engine: BaseMediciones

## Propósito

Motor especializado en captura y análisis de variables cuantitativas.

Diseñado para procesos críticos de inocuidad y control sanitario.

---

## Casos de Uso

- Temperaturas
- pH
- Cloro residual
- Humedad
- Peso
- Variables ambientales

---

## Capacidades

| Capacidad | Soporte |
|---|---|
| Rangos mínimos y máximos | ✅ |
| Alertas automáticas | ✅ |
| Validación numérica | ✅ |
| Tendencias históricas | ✅ |
| IA predictiva | ✅ |
| Evidencias | ✅ |
| Exportación Excel | ✅ |

---

## Componentes Compatibles

```txt
MeasurementInput
TemperatureInput
RangeValidator
TrendChart
EvidenceUploader
NumericKeyboard
```

---

## Tipos de Campo Compatibles

```txt
number
decimal
temperature
range
slider
calculated
```

---

## Validaciones

```txt
min_value
max_value
decimal_precision
critical_threshold
warning_threshold
```

---

## Compatibilidad IA

```txt
trend_analysis
anomaly_detection
predictive_alerts
```

---

# 7. Engine: BaseWorkflow

## Propósito

Motor orientado a procesos multiestado y control de aprobaciones.

Gestiona:

- validaciones,
- revisiones,
- aprobaciones,
- escalamiento,
- y trazabilidad documental.

---

## Casos de Uso

- CAPA
- Aprobaciones
- Validaciones
- Gestión documental
- Flujos QA

---

## Estados Compatibles

```txt
draft
submitted
verified
approved
rejected
closed
```

---

## Capacidades

| Capacidad | Soporte |
|---|---|
| Multiestado | ✅ |
| Aprobación jerárquica | ✅ |
| Historial | ✅ |
| Trazabilidad | ✅ |
| Firma digital | ✅ |
| Comentarios | ✅ |

---

## Componentes Compatibles

```txt
WorkflowTimeline
ApprovalSection
StatusTracker
CommentThread
SignatureBlock
```

---

## Compatibilidad IA

```txt
approval_assistant
workflow_optimization
risk_analysis
```

---

# 8. Engine: BaseTrazabilidad

## Propósito

Motor especializado en trazabilidad operacional y seguimiento histórico.

---

## Casos de Uso

- Lotes
- Recall
- Producción
- Trazabilidad alimentaria
- Cadena logística

---

## Capacidades

| Capacidad | Soporte |
|---|---|
| Seguimiento lotes | ✅ |
| Relaciones padre-hijo | ✅ |
| Historial operativo | ✅ |
| Recall tracking | ✅ |
| Timeline | ✅ |

---

## Componentes Compatibles

```txt
LotTracker
TimelineViewer
RelationshipMap
BatchSelector
TraceabilityHistory
```

---

## Compatibilidad IA

```txt
recall_analysis
traceability_risk
chain_analysis
```

---

# 9. Engine: BaseMantenimiento

## Propósito

Motor orientado a mantenimiento preventivo y correctivo.

---

## Casos de Uso

- Equipos
- Infraestructura
- Mantenimiento preventivo
- Correctivos
- Cronogramas técnicos

---

## Capacidades

| Capacidad | Soporte |
|---|---|
| Calendarios | ✅ |
| Historial técnico | ✅ |
| Programación | ✅ |
| Evidencias | ✅ |
| Checklists técnicos | ✅ |

---

## Componentes Compatibles

```txt
MaintenanceScheduler
EquipmentSelector
MaintenanceChecklist
EvidenceUploader
CalendarView
```

---

## Compatibilidad IA

```txt
predictive_maintenance
maintenance_alerts
equipment_risk
```

---

# 10. Engine: BaseCapacitaciones

## Propósito

Motor diseñado para gestión de capacitaciones y formación interna.

---

## Casos de Uso

- Capacitaciones BPM
- Inducciones
- Entrenamientos
- Evaluaciones

---

## Capacidades

| Capacidad | Soporte |
|---|---|
| Registro asistentes | ✅ |
| Firma participantes | ✅ |
| Evaluación | ✅ |
| Evidencias | ✅ |
| Historial capacitación | ✅ |

---

## Componentes Compatibles

```txt
AttendanceTable
ParticipantSignature
TrainingTopics
EvaluationSection
CertificateGenerator
```

---

## Compatibilidad IA

```txt
training_analysis
competency_tracking
learning_recommendations
```

---

# 11. Engine: BaseDocumental

## Propósito

Motor especializado en gestión documental y control de versiones.

---

## Casos de Uso

- Procedimientos
- Manuales
- Políticas
- Documentos controlados
- Versionamiento

---

## Capacidades

| Capacidad | Soporte |
|---|---|
| Versionado | ✅ |
| Vigencias | ✅ |
| Aprobación documental | ✅ |
| Historial cambios | ✅ |
| Storage | ✅ |

---

## Componentes Compatibles

```txt
DocumentVersioning
ApprovalFlow
FileUploader
ChangeLog
ExpirationTracker
```

---

## Compatibilidad IA

```txt
document_classification
compliance_analysis
document_summarization
```

---

# 12. Reglas Globales de Arquitectura

## Todos los engines deben:

- ser reutilizables,
- desacoplados,
- metadata-driven,
- compatibles con Form Schema,
- compatibles con Field Schema,
- soportar auditoría,
- soportar trazabilidad,
- y mantener separación entre CORE y RUNTIME.

---

# 13. Separación Arquitectónica Obligatoria

## CORE

Define configuración y metadata.

```txt
sgc_forms
sgc_form_fields
sgc_workflows
sgc_modules
```

---

## RUNTIME

Define operación real.

```txt
sgc_records
sgc_record_values
sgc_record_approvals
sgc_evidences
```

---

# 14. Futuras Expansiones de Engines

| Engine Futuro | Objetivo |
|---|---|
| BaseAnalytics | Dashboards y KPIs |
| BaseIoT | Sensores automáticos |
| BaseAuditorIA | Auditoría inteligente |
| BaseProduction | Producción industrial |
| BaseInventory | Inventarios y stock |

---

# 15. Recomendaciones Técnicas

## Prioridad Alta

- Crear `field_schema.md`
- Formalizar `component_registry.md`
- Diseñar `sql_registry.md`
- Crear renderizador universal dinámico

---

## Prioridad Media

- Migración progresiva TypeScript
- Caché con React Query
- Offline-first architecture

---

## Prioridad Baja

- IA generativa contextual
- Automatización avanzada
- Reglas inteligentes adaptativas

---

# 16. Conclusión

La arquitectura basada en engines permite que el sistema evolucione desde:

```txt
Digitalización de formularios
```

hacia:

```txt
Plataforma operacional enterprise metadata-driven
```

garantizando:

- escalabilidad,
- reutilización,
- mantenibilidad,
- automatización,
- y futura compatibilidad IA.