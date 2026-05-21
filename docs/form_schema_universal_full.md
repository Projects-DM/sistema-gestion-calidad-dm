# FORM_SCHEMA_UNIVERSAL

## Arquitectura Universal de Formularios - SGC DM

Documento maestro generado desde el inventario enterprise del Sistema de Gestión de Calidad. Define contratos universales, motores dinámicos oficiales, estructuras reutilizables y metadata operacional.

## 1. Form Schema Universal Oficial

| Campo | Tipo | Descripción |

|---|---|---|

| id | UUID | Identificador universal |

| codigo | STRING | Código documental |

| nombre | STRING | Nombre operativo |

| descripcion | TEXT | Descripción funcional |

| modulo | STRING | Módulo principal |

| submodulo | STRING | Subproceso o programa |

| tipo_documental | ENUM | Tipo operativo |

| criticidad | ENUM | Nivel de criticidad |

| riesgo_sanitario | ENUM | Riesgo sanitario |

| riesgo_operativo | ENUM | Riesgo operativo |

| impacto_trazabilidad | ENUM | Impacto trazabilidad |

| motor | STRING | Motor dinámico |

| workflow | STRING | Workflow asociado |

| tipo_interaccion | STRING | Interacción UI |

| estado | ENUM | Estado lifecycle |

| version | STRING | Versión documental |

| frecuencia | ENUM | Frecuencia operativa |

| responsable | STRING | Responsable principal |

| verificador | STRING | Rol verificador |

| requiere_firma | BOOLEAN | Firma requerida |

| requiere_aprobacion | BOOLEAN | Aprobación requerida |

| requiere_evidencia | BOOLEAN | Evidencias |

| requiere_storage | BOOLEAN | Storage |

| genera_workflow | BOOLEAN | Workflow |

| genera_historial | BOOLEAN | Historial |

| offline_ready | BOOLEAN | Operación offline |

| compatible_ia | BOOLEAN | Compatibilidad IA |

| ia_tags | ARRAY | Taxonomía IA |

| componentes | ARRAY | Componentes |

| catalogos | ARRAY | Catálogos |

| tablas_relacionadas | ARRAY | Relaciones SQL |

| exportacion | ARRAY | Exportación |

| roles | ARRAY | Roles autorizados |


## 2. Motores Dinámicos Oficiales

### BaseChecklist

**Propósito:** Checklists operativos BPM, limpieza, verificación y control.

**Capacidades:**

- Cumple / No Cumple

- Observaciones

- Acciones correctivas

- Reinspección

- Firma



### BaseMediciones

**Propósito:** Captura de variables numéricas y sanitarias.

**Capacidades:**

- Temperaturas

- pH

- Cloro

- Rangos automáticos

- Alertas IA



### BaseWorkflow

**Propósito:** Procesos con aprobación y múltiples estados.

**Capacidades:**

- Estados

- Aprobación

- Verificación

- Trazabilidad



### BaseTrazabilidad

**Propósito:** Seguimiento de lotes, producción y recall.

**Capacidades:**

- Lotes

- Trazabilidad

- Historial

- Relaciones



### BaseMantenimiento

**Propósito:** Gestión de mantenimiento preventivo y correctivo.

**Capacidades:**

- Equipos

- Calendarios

- Técnicos

- Historial



### BaseCapacitaciones

**Propósito:** Registro y control de capacitaciones.

**Capacidades:**

- Asistentes

- Temas

- Firmas

- Evaluación



### BaseDocumental

**Propósito:** Gestión documental y control de versiones.

**Capacidades:**

- Versiones

- Vencimientos

- Aprobación documental

- Storage



## 3. Component Registry

### ChecklistSection

- Tipo: None

- Función Principal: ✅ cumple
✅ no cumple
✅ observación
✅ acción correctiva

- Complejidad: None

- Requiere Estado: None

- Storage: None

- Firma: None

- Evidencia: None

- Reutilizable: None


### MeasurementSection

- Tipo: None

- Función Principal: ✅ temperatura
✅ pH
✅ ppm
✅ límites

- Complejidad: None

- Requiere Estado: None

- Storage: None

- Firma: None

- Evidencia: None

- Reutilizable: None


### SignatureSection

- Tipo: None

- Función Principal: ✅ firma operario
✅ firma supervisor

- Complejidad: None

- Requiere Estado: None

- Storage: None

- Firma: None

- Evidencia: None

- Reutilizable: None


### EvidenceUploader

- Tipo: None

- Función Principal: ✅ imágenes
✅ PDFs
✅ evidencias

- Complejidad: None

- Requiere Estado: None

- Storage: None

- Firma: None

- Evidencia: None

- Reutilizable: None


### DynamicTable

- Tipo: None

- Función Principal: ✅ filas dinámicas
✅ agregar registros
✅ tablas repetidas

- Complejidad: None

- Requiere Estado: None

- Storage: None

- Firma: None

- Evidencia: None

- Reutilizable: None


### ApprovalSection

- Tipo: None

- Función Principal: ✅ aprobado
✅ rechazado
✅ observaciones supervisor

- Complejidad: None

- Requiere Estado: None

- Storage: None

- Firma: None

- Evidencia: None

- Reutilizable: None


### DynamicTableSection

- Tipo: Dynamic

- Función Principal: Tablas dinámicas y lotes

- Complejidad: None

- Requiere Estado: None

- Storage: None

- Firma: None

- Evidencia: None

- Reutilizable: None


### ApprovalFlowSection

- Tipo: Workflow

- Función Principal: Flujos multiestado y aprobaciones

- Complejidad: None

- Requiere Estado: None

- Storage: None

- Firma: None

- Evidencia: None

- Reutilizable: None


### ConditionalFieldManager

- Tipo: Logic

- Función Principal: Campos condicionales

- Complejidad: None

- Requiere Estado: None

- Storage: None

- Firma: None

- Evidencia: None

- Reutilizable: None


### EvidenceGallery

- Tipo: Media

- Función Principal: Galería de evidencias

- Complejidad: None

- Requiere Estado: None

- Storage: None

- Firma: None

- Evidencia: None

- Reutilizable: None


## 4. Registry de Módulos

### OPERACIONES

- Función: Checklists, inspecciones, BPM, limpieza, plagas

- Motor principal: BaseChecklist

- Requiere versión: None

- Requiere vencimiento: None

- Requiere aprobación: None

- Storage path: None


### TRAZABILIDAD

- Función: Lotes, despachos, entradas, salidas

- Motor principal: BaseTrazabilidad

- Requiere versión: None

- Requiere vencimiento: None

- Requiere aprobación: None

- Storage path: None


### MEDICIÓN Y CONTROL

- Función: Temperatura, pH, cloro, peso

- Motor principal: BaseMediciones

- Requiere versión: None

- Requiere vencimiento: None

- Requiere aprobación: None

- Storage path: None


### MANTENIMIENTO

- Función: Equipos, calibraciones, mantenimientos

- Motor principal: BaseMantenimiento

- Requiere versión: None

- Requiere vencimiento: None

- Requiere aprobación: None

- Storage path: None


### CALIDAD

- Función: Proveedores, PQRS, recall, evaluaciones, auditorías

- Motor principal: BaseWorkflow

- Requiere versión: None

- Requiere vencimiento: None

- Requiere aprobación: None

- Storage path: None


### GESTIÓN DOCUMENTAL

- Función: PDFs, exportaciones, historial, evidencias

- Motor principal: BaseDocumental

- Requiere versión: None

- Requiere vencimiento: None

- Requiere aprobación: None

- Storage path: None


### CONFIGURACIÓN

- Función: Usuarios, permisos, parámetros

- Motor principal: BaseConfig

- Requiere versión: None

- Requiere vencimiento: None

- Requiere aprobación: None

- Storage path: None


## 5. IA Taxonomy Registry

### #temperatura_fuera_rango

- Descripción: Control crítico temperatura

- Módulo: MEDICIÓN Y CONTROL

- Tipo: ALERTA

- Uso futuro IA: Detección anomalías


### #falla_sanitaria

- Descripción: Incumplimiento sanitario

- Módulo: OPERACIONES

- Tipo: CAPA

- Uso futuro IA: Predicción riesgos


### #recall_producto

- Descripción: Recall activo

- Módulo: CALIDAD

- Tipo: WORKFLOW

- Uso futuro IA: RAG trazabilidad


### #equipo_critico

- Descripción: Equipo crítico mantenimiento

- Módulo: MANTENIMIENTO

- Tipo: ACTIVO

- Uso futuro IA: Mantenimiento predictivo


## 6. SQL Registry Futuro

### sgc_equipment

- Objetivo: Catálogo de equipos

- Prioridad: ALTA

- Módulo: MANTENIMIENTO

- Relación principal: sgc_form_responses

- IA Ready: SI

- Estado: PENDIENTE


### sgc_action_plans

- Objetivo: Planes CAPA

- Prioridad: CRÍTICA

- Módulo: CALIDAD

- Relación principal: response_id

- IA Ready: SI

- Estado: PENDIENTE


### sgc_documents_v2

- Objetivo: Repositorio documental

- Prioridad: CRÍTICA

- Módulo: GESTIÓN DOCUMENTAL

- Relación principal: sgc_forms

- IA Ready: SI

- Estado: PENDIENTE


### sgc_document_versions

- Objetivo: Versionado documental

- Prioridad: ALTA

- Módulo: GESTIÓN DOCUMENTAL

- Relación principal: document_id

- IA Ready: SI

- Estado: PENDIENTE


### sgc_workflows

- Objetivo: Flujos multiestado

- Prioridad: ALTA

- Módulo: CALIDAD

- Relación principal: response_id

- IA Ready: SI

- Estado: PENDIENTE


### sgc_notifications

- Objetivo: Alertas inteligentes

- Prioridad: MEDIA

- Módulo: GLOBAL

- Relación principal: user_id

- IA Ready: SI

- Estado: PENDIENTE


## 7. Registry Universal de Formularios

### FO-CL-009  - FORMATO DE INDUCCIÓN PARA PERSONAL NUEVO

```yaml
codigo: FO-CL-009 
nombre: FORMATO DE INDUCCIÓN PARA PERSONAL NUEVO
tipo_documental: FORMATO
programa_actual: CAPACITACION
area_operativa: OPERACIONES
modulo: CAPACITACIÓN
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-010  - FORMATO DE INDUCCIÓN PARA VISITANTES Y CONTRATISTAS

```yaml
codigo: FO-CL-010 
nombre: FORMATO DE INDUCCIÓN PARA VISITANTES Y CONTRATISTAS
tipo_documental: FORMATO
programa_actual: CAPACITACION
area_operativa: OPERACIONES
modulo: CAPACITACIÓN
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO APLICA
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-011  - CONTROL DIARIO DE BPM Y BPH

```yaml
codigo: FO-CL-011 
nombre: CONTROL DIARIO DE BPM Y BPH
tipo_documental: FORMATO
programa_actual: CAPACITACION
area_operativa: OPERACIONES
modulo: CAPACITACIÓN
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-012  - FORMATO DE CAPACITACIÓN Y SEGUIMIENTO IN SITU. 

```yaml
codigo: FO-CL-012 
nombre: FORMATO DE CAPACITACIÓN Y SEGUIMIENTO IN SITU. 
tipo_documental: FORMATO
programa_actual: CAPACITACION
area_operativa: OPERACIONES
modulo: CAPACITACIÓN
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-013 - FORMATO CONTROL DE CAPACITACIONES

```yaml
codigo: FO-CL-013
nombre: FORMATO CONTROL DE CAPACITACIONES
tipo_documental: FORMATO
programa_actual: CAPACITACION
area_operativa: OPERACIONES
modulo: CAPACITACIÓN
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-014 - FORMATO DE EVALUACIÓN DEL PORCENTAJE DE CUMPLIMIENTO DEL CRONOGRAMA DE CAPACITACIONES.

```yaml
codigo: FO-CL-014
nombre: FORMATO DE EVALUACIÓN DEL PORCENTAJE DE CUMPLIMIENTO DEL CRONOGRAMA DE CAPACITACIONES.
tipo_documental: FORMATO
programa_actual: CAPACITACION
area_operativa: OPERACIONES
modulo: CAPACITACIÓN
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-015 - FORMATO DE EVALUACIÓN DE LA TASA DE COBERTURA (TCC).

```yaml
codigo: FO-CL-015
nombre: FORMATO DE EVALUACIÓN DE LA TASA DE COBERTURA (TCC).
tipo_documental: FORMATO
programa_actual: CAPACITACION
area_operativa: OPERACIONES
modulo: CAPACITACIÓN
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-027 - FORMATO DE EVALUACIÓN DE APRENDIZAJE

```yaml
codigo: FO-CL-027
nombre: FORMATO DE EVALUACIÓN DE APRENDIZAJE
tipo_documental: FORMATO
programa_actual: CAPACITACION
area_operativa: OPERACIONES
modulo: CAPACITACIÓN
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-028 - FORMATO DE EVALUACIÓN DEL CAPACITACITADOR

```yaml
codigo: FO-CL-028
nombre: FORMATO DE EVALUACIÓN DEL CAPACITACITADOR
tipo_documental: FORMATO
programa_actual: CAPACITACION
area_operativa: OPERACIONES
modulo: CAPACITACIÓN
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-001  - FORMATO PREOPERATIVO LIMPIEZA Y DESINFECCION 

```yaml
codigo: FO-CL-001 
nombre: FORMATO PREOPERATIVO LIMPIEZA Y DESINFECCION 
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: OPERACIONES
modulo: SANEAMIENTO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-003  - FORMATO DE VERIFICACIÓN DE OPERACIONES SANITARIAS EXTERIORES LYD

```yaml
codigo: FO-CL-003 
nombre: FORMATO DE VERIFICACIÓN DE OPERACIONES SANITARIAS EXTERIORES LYD
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: OPERACIONES
modulo: SANEAMIENTO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-004  - FORMATO DE VERIFICACIÓN DE OPERACIONES SANITARIAS ACCESOS Y ALREDEDORES LYD

```yaml
codigo: FO-CL-004 
nombre: FORMATO DE VERIFICACIÓN DE OPERACIONES SANITARIAS ACCESOS Y ALREDEDORES LYD
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: OPERACIONES
modulo: SANEAMIENTO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-05  - FORMATO DE VERIFICACIÓN DE OPERACIONES SANITARIAS DEL TANQUE DE ALMACENAMIENTO DE AGUA LYD.

```yaml
codigo: FO-CL-05 
nombre: FORMATO DE VERIFICACIÓN DE OPERACIONES SANITARIAS DEL TANQUE DE ALMACENAMIENTO DE AGUA LYD.
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: OPERACIONES
modulo: SANEAMIENTO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-006  - FORMATO DE VERIFICACIÓN DE ASEOS ESPECIALES LYD

```yaml
codigo: FO-CL-006 
nombre: FORMATO DE VERIFICACIÓN DE ASEOS ESPECIALES LYD
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: OPERACIONES
modulo: SANEAMIENTO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: SEMANAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-007  - FORMATO VERIFICACIÓN DE LAS OPERACIONES SANITARIAS DE LA TRAMPA DE GRASA LYD.

```yaml
codigo: FO-CL-007 
nombre: FORMATO VERIFICACIÓN DE LAS OPERACIONES SANITARIAS DE LA TRAMPA DE GRASA LYD.
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: OPERACIONES
modulo: SANEAMIENTO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-008  - FOTMATO INSPECCIÓN VEHICULAR LYD

```yaml
codigo: FO-CL-008 
nombre: FOTMATO INSPECCIÓN VEHICULAR LYD
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: OPERACIONES
modulo: SANEAMIENTO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-035  - FORMATO DE VERIFICACION DE LA LIMPIEZA Y DESINFECCIÓN DEL VEHICULO DE TRANSPORTE LYD

```yaml
codigo: FO-CL-035 
nombre: FORMATO DE VERIFICACION DE LA LIMPIEZA Y DESINFECCIÓN DEL VEHICULO DE TRANSPORTE LYD
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: OPERACIONES
modulo: SANEAMIENTO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-016  - FORMATO REGISTRO ANALISIS DE MUESTREO MICROBIOLOGICO Y FISICOQUIMICO   

```yaml
codigo: FO-CL-016 
nombre: FORMATO REGISTRO ANALISIS DE MUESTREO MICROBIOLOGICO Y FISICOQUIMICO   
tipo_documental: FORMATO
programa_actual: PLAN DE MUESTREO
area_operativa: OPERACIONES
modulo: MUESTREO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-020  - FORMATO CONTROL DE MUESTREO MICROBIOLOGICO Y FISICOQUIMICO

```yaml
codigo: FO-CL-020 
nombre: FORMATO CONTROL DE MUESTREO MICROBIOLOGICO Y FISICOQUIMICO
tipo_documental: FORMATO
programa_actual: PLAN DE MUESTREO
area_operativa: OPERACIONES
modulo: MUESTREO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: SI
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-018  - FORMATO DE INGRESO Y VERIFICACION DE MATERIA PRIMA E INSUMOS

```yaml
codigo: FO-CL-018 
nombre: FORMATO DE INGRESO Y VERIFICACION DE MATERIA PRIMA E INSUMOS
tipo_documental: FORMATO
programa_actual: TRAZABILIDAD
area_operativa: OPERACIONES
modulo: TRAZABILIDAD
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: SI
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-019  - LIBERACIÓN DE PDTO TERMINADO

```yaml
codigo: FO-CL-019 
nombre: LIBERACIÓN DE PDTO TERMINADO
tipo_documental: FORMATO
programa_actual: TRAZABILIDAD
area_operativa: OPERACIONES
modulo: TRAZABILIDAD
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-020  - FORMATO DE TRAZABILIDAD EN EL DESPACHO

```yaml
codigo: FO-CL-020 
nombre: FORMATO DE TRAZABILIDAD EN EL DESPACHO
tipo_documental: FORMATO
programa_actual: TRAZABILIDAD
area_operativa: OPERACIONES
modulo: TRAZABILIDAD
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: SI
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-021  - FORMATO TRAZABILIDAD EN EL PROCESO

```yaml
codigo: FO-CL-021 
nombre: FORMATO TRAZABILIDAD EN EL PROCESO
tipo_documental: FORMATO
programa_actual: TRAZABILIDAD
area_operativa: OPERACIONES
modulo: TRAZABILIDAD
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: SI
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-022 - FORMATO TRAZABILIDAD ENTREGA DE INSUMOS Y MATERIAL DE EMPAQUE

```yaml
codigo: FO-CL-022
nombre: FORMATO TRAZABILIDAD ENTREGA DE INSUMOS Y MATERIAL DE EMPAQUE
tipo_documental: FORMATO
programa_actual: TRAZABILIDAD
area_operativa: OPERACIONES
modulo: TRAZABILIDAD
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: SI
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-023  - FORMATO DE VERIFICACIÓN DE LA TEMPERATURA DE LAS CAVAS, LA MATERIA PRIMA, PRODUCTO DURANTE EL PROCESO Y LOS PRODUCTOS TERMINADOS

```yaml
codigo: FO-CL-023 
nombre: FORMATO DE VERIFICACIÓN DE LA TEMPERATURA DE LAS CAVAS, LA MATERIA PRIMA, PRODUCTO DURANTE EL PROCESO Y LOS PRODUCTOS TERMINADOS
tipo_documental: FORMATO
programa_actual: TRAZABILIDAD
area_operativa: OPERACIONES
modulo: MEDICIONES
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: SI
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CM-023  - MEDICION DEL PH, CLORO RESIDUAL Y CONCENTRACIONES  

```yaml
codigo: FO-CM-023 
nombre: MEDICION DEL PH, CLORO RESIDUAL Y CONCENTRACIONES  
tipo_documental: FORMATO
programa_actual: TRAZABILIDAD
area_operativa: OPERACIONES
modulo: MEDICIONES
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: SI
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-024  - FORMATO DE EVALUACION A PROVEEDORES

```yaml
codigo: FO-CL-024 
nombre: FORMATO DE EVALUACION A PROVEEDORES
tipo_documental: FORMATO
programa_actual: PROVEEDORES
area_operativa: OPERACIONES
modulo: PROVEEDORES
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-025  - SOLICITUD DE MATERIALES E INSUMOS

```yaml
codigo: FO-CL-025 
nombre: SOLICITUD DE MATERIALES E INSUMOS
tipo_documental: FORMATO
programa_actual: PROVEEDORES
area_operativa: OPERACIONES
modulo: PROVEEDORES
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-026  - FORMATO LISTA DE PROVEEDORES.

```yaml
codigo: FO-CL-026 
nombre: FORMATO LISTA DE PROVEEDORES.
tipo_documental: FORMATO
programa_actual: PROVEEDORES
area_operativa: OPERACIONES
modulo: PROVEEDORES
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: ANUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-029  - FORMATO DE AUDITORIAS A PROVEEDORES

```yaml
codigo: FO-CL-029 
nombre: FORMATO DE AUDITORIAS A PROVEEDORES
tipo_documental: FORMATO
programa_actual: PROVEEDORES
area_operativa: OPERACIONES
modulo: PROVEEDORES
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-MT-001 - FORMATO PREOPERATIVO DE MANTENIMIENTO

```yaml
codigo: FO-MT-001
nombre: FORMATO PREOPERATIVO DE MANTENIMIENTO
tipo_documental: FORMATO
programa_actual: MANTENIMIENTO
area_operativa: OPERACIONES
modulo: MANTENIMIENTO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-MT-002  - FORMATO MANTENIMIENTO PREVENTIVO Y CORRECTIVO DE MAQUINARIA Y EQUIPOS

```yaml
codigo: FO-MT-002 
nombre: FORMATO MANTENIMIENTO PREVENTIVO Y CORRECTIVO DE MAQUINARIA Y EQUIPOS
tipo_documental: FORMATO
programa_actual: MANTENIMIENTO
area_operativa: OPERACIONES
modulo: MANTENIMIENTO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-MT-003  - FORMATO DE LISTADO MAESTRO DE PROVEEDORES DE MANTENIMIENTO EXTERNO.

```yaml
codigo: FO-MT-003 
nombre: FORMATO DE LISTADO MAESTRO DE PROVEEDORES DE MANTENIMIENTO EXTERNO.
tipo_documental: FORMATO
programa_actual: MANTENIMIENTO
area_operativa: OPERACIONES
modulo: MANTENIMIENTO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: ANUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-MT-004  - FORMATO DE INVENTARIO DE EQUIPOS.

```yaml
codigo: FO-MT-004 
nombre: FORMATO DE INVENTARIO DE EQUIPOS.
tipo_documental: FORMATO
programa_actual: MANTENIMIENTO
area_operativa: OPERACIONES
modulo: MANTENIMIENTO
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-DA-001  - FORMATO CONTROL ESTACIONES

```yaml
codigo: FO-DA-001 
nombre: FORMATO CONTROL ESTACIONES
tipo_documental: FORMATO
programa_actual: PLAGAS
area_operativa: OPERACIONES
modulo: PLAGAS
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: SEMANAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-DA-002  - FORMATO PRESENCIA DE PLAGAS

```yaml
codigo: FO-DA-002 
nombre: FORMATO PRESENCIA DE PLAGAS
tipo_documental: FORMATO
programa_actual: PLAGAS
area_operativa: OPERACIONES
modulo: PLAGAS
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: SEMANAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-DA-003  - FORMATO VERIFICACIÓN DE SEPARACIÓN DE RESIDUOS Y ESTADO DE LOS RECIPIENTES

```yaml
codigo: FO-DA-003 
nombre: FORMATO VERIFICACIÓN DE SEPARACIÓN DE RESIDUOS Y ESTADO DE LOS RECIPIENTES
tipo_documental: FORMATO
programa_actual: RECIDUOS SÓLIDOS
area_operativa: OPERACIONES
modulo: RESIDUOS
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: DIARIO
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CO-001  - MONITOREO DE PESAJE

```yaml
codigo: FO-CO-001 
nombre: MONITOREO DE PESAJE
tipo_documental: FORMATO
programa_actual: CALIBRACIÓN
area_operativa: OPERACIONES
modulo: MEDICIONES
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: SEMANAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: SI
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-031  - EVALUACIÓN DEl RIESGO

```yaml
codigo: FO-CL-031 
nombre: EVALUACIÓN DEl RIESGO
tipo_documental: FORMATO
programa_actual: RECALL
area_operativa: OPERACIONES
modulo: CALIDAD
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-032 - FORMATO GUIA DE RECALL

```yaml
codigo: FO-CL-032
nombre: FORMATO GUIA DE RECALL
tipo_documental: FORMATO
programa_actual: RECALL
area_operativa: OPERACIONES
modulo: CALIDAD
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-CL-033  - FORMATO RECOGIDA RECALL

```yaml
codigo: FO-CL-033 
nombre: FORMATO RECOGIDA RECALL
tipo_documental: FORMATO
programa_actual: RECALL
area_operativa: OPERACIONES
modulo: CALIDAD
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-GD-021  - Formato de PQRS

```yaml
codigo: FO-GD-021 
nombre: Formato de PQRS
tipo_documental: FORMATO
programa_actual: PQRSD
area_operativa: OPERACIONES
modulo: CALIDAD
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: NO
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### FO-GD-022  - CIERRE PQRS

```yaml
codigo: FO-GD-022 
nombre: CIERRE PQRS
tipo_documental: FORMATO
programa_actual: PQRSD
area_operativa: OPERACIONES
modulo: CALIDAD
estado_digitalizacion: PENDIENTE
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: EVENTUAL
responsable: SI
quien_verifica: SI
genera_historial: SI
tiene_checklist: SI
tiene_mediciones: NO
tiene_observaciones: SI
tiene_accion_correctiva: SI
tiene_reinspeccion: SI
tiene_tabla_dinamica: NO
tiene_calculos: NO
```

### PD-CL-002  - PROCEDIMIENTO VERIFICACION CALIDAD AGUA

```yaml
codigo: PD-CL-002 
nombre: PROCEDIMIENTO VERIFICACION CALIDAD AGUA
tipo_documental: FORMATO
programa_actual: CALIDAD DEL AGUA
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PD-CL-003 - PROCEDIMIENTO RECIRCULACION AGUA TANQUE ALMACENAMIENTO

```yaml
codigo: PD-CL-003
nombre: PROCEDIMIENTO RECIRCULACION AGUA TANQUE ALMACENAMIENTO
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PD-CL-004  - PROCEDIMIENTO DE INDUCCIÓN PARA PERSONAL NUEVO

```yaml
codigo: PD-CL-004 
nombre: PROCEDIMIENTO DE INDUCCIÓN PARA PERSONAL NUEVO
tipo_documental: FORMATO
programa_actual: CAPACITACION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PD-CL- 007  - PROCEDIMIENTO DE MUESTREO MICROBIOLOGICO Y FISICOQUIMICO

```yaml
codigo: PD-CL- 007 
nombre: PROCEDIMIENTO DE MUESTREO MICROBIOLOGICO Y FISICOQUIMICO
tipo_documental: FORMATO
programa_actual: PLAN DE MUESTREO
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PD-GD-009  - Manual de Petición queja reclamo sugerencia denuncia

```yaml
codigo: PD-GD-009 
nombre: Manual de Petición queja reclamo sugerencia denuncia
tipo_documental: FORMATO
programa_actual: PQRSD
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-001 - LIMPIEZA Y DESINFECCIÓN  DEL TANQUE DE ALMACENAMIENTO DE AGUA

```yaml
codigo: POES-CL-001
nombre: LIMPIEZA Y DESINFECCIÓN  DEL TANQUE DE ALMACENAMIENTO DE AGUA
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-002 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE PISOS Y MEDIAS CAÑAS

```yaml
codigo: POES-CL-002
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE PISOS Y MEDIAS CAÑAS
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-003 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE TECHOS.

```yaml
codigo: POES-CL-003
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE TECHOS.
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-004 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE PAREDES Y PUERTAS

```yaml
codigo: POES-CL-004
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE PAREDES Y PUERTAS
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-005 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE LAS LAMPARA

```yaml
codigo: POES-CL-005
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE LAS LAMPARA
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-006 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE MESAS Y MESONES

```yaml
codigo: POES-CL-006
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE MESAS Y MESONES
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-007 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE BALANZAS, SELLADORA Y BÁSCULA

```yaml
codigo: POES-CL-007
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE BALANZAS, SELLADORA Y BÁSCULA
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-008 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE  CUCHILLOS

```yaml
codigo: POES-CL-008
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE  CUCHILLOS
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-009 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE FILTROS SANITARIOS

```yaml
codigo: POES-CL-009
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE FILTROS SANITARIOS
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-010 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE LAS CAVAS DE CONGELACIÓN Y REFRIGERACIÓN

```yaml
codigo: POES-CL-010
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE LAS CAVAS DE CONGELACIÓN Y REFRIGERACIÓN
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-011 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE REJILLAS Y ESTIBAS

```yaml
codigo: POES-CL-011
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE REJILLAS Y ESTIBAS
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-012 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE ESTANTERIAS.d

```yaml
codigo: POES-CL-012
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE ESTANTERIAS.d
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-013 - PROCEDIMIENTO DE OPERACIONES CANECAS, SOPORTES, RECIPIENTES, BANDEJAS, TABLAS, BOMBA DE ASPERSIÓN Y CANASTILLA

```yaml
codigo: POES-CL-013
nombre: PROCEDIMIENTO DE OPERACIONES CANECAS, SOPORTES, RECIPIENTES, BANDEJAS, TABLAS, BOMBA DE ASPERSIÓN Y CANASTILLA
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-014 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE CORTINAS PLÁSTICAS

```yaml
codigo: POES-CL-014
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE CORTINAS PLÁSTICAS
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-015 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE LAVAMANOS

```yaml
codigo: POES-CL-015
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE LAVAMANOS
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-016 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE LA TUBERIA, SUICHES, CABLADO Y CONEXIONES ELÉCTRICAS

```yaml
codigo: POES-CL-016
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE LA TUBERIA, SUICHES, CABLADO Y CONEXIONES ELÉCTRICAS
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-017 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE LAS SEÑALETICAS Y EXTINTORES

```yaml
codigo: POES-CL-017
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE LAS SEÑALETICAS Y EXTINTORES
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-018 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE LA TRAMPA DE GRASA.

```yaml
codigo: POES-CL-018
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE LA TRAMPA DE GRASA.
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-019 - ROCEDIMIENTO DE OPERACIONES SANITARIAS DE AREAS SOCIAL, OFICINAS, PASILLOS Y ALMACEN DE MATERIAL DE EMPAQUE

```yaml
codigo: POES-CL-019
nombre: ROCEDIMIENTO DE OPERACIONES SANITARIAS DE AREAS SOCIAL, OFICINAS, PASILLOS Y ALMACEN DE MATERIAL DE EMPAQUE
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-020 - ROCEDIMIENTO DE OPERACIONES SANITARIAS DE BATERIAS SANITARIAS

```yaml
codigo: POES-CL-020
nombre: ROCEDIMIENTO DE OPERACIONES SANITARIAS DE BATERIAS SANITARIAS
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-021 - ROCEDIMIENTO DE OPERACIONES SANITARIAS DE LOS VESTIERES

```yaml
codigo: POES-CL-021
nombre: ROCEDIMIENTO DE OPERACIONES SANITARIAS DE LOS VESTIERES
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-022 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DE ACCE Y ALREDE, PUERTAS DE INGRESO DEL PERSONAL, DE MATERIA P, DESPACHO O, MOTORES Y VENTANA

```yaml
codigo: POES-CL-022
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DE ACCE Y ALREDE, PUERTAS DE INGRESO DEL PERSONAL, DE MATERIA P, DESPACHO O, MOTORES Y VENTANA
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-023 - PROCEDIMIENTO DE OPERACIONES SANITARIAS DEL VEHÍCULOS DE TRANSPORTE DE PRODUCTO TERMINADO

```yaml
codigo: POES-CL-023
nombre: PROCEDIMIENTO DE OPERACIONES SANITARIAS DEL VEHÍCULOS DE TRANSPORTE DE PRODUCTO TERMINADO
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-024 - PROCEDIMIENTO DE OPERACIONES CANECAS DE RESIDUOS SÓLIDOS

```yaml
codigo: POES-CL-024
nombre: PROCEDIMIENTO DE OPERACIONES CANECAS DE RESIDUOS SÓLIDOS
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### POES-CL-025 - ROCEDIMIENTO DE OPERACIONES SANITARIAS DEL ÁREA DE ALMACENAMIENTO DE RESIDUOS SOLIDOS

```yaml
codigo: POES-CL-025
nombre: ROCEDIMIENTO DE OPERACIONES SANITARIAS DEL ÁREA DE ALMACENAMIENTO DE RESIDUOS SOLIDOS
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PG-DA-001  - PROGRAMA DE MANEJO INTEGRAL DE PLAGAS

```yaml
codigo: PG-DA-001 
nombre: PROGRAMA DE MANEJO INTEGRAL DE PLAGAS
tipo_documental: FORMATO
programa_actual: PLAGAS
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PG-CL-001  - PROGRAMA DE LIMPIEZA Y DESINFECCIÓN LYD

```yaml
codigo: PG-CL-001 
nombre: PROGRAMA DE LIMPIEZA Y DESINFECCIÓN LYD
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PG-CL-002 - PROGRAMA CALIDAD DE AGUA-ABASTECIMIENTO DE AGUA POTABLE

```yaml
codigo: PG-CL-002
nombre: PROGRAMA CALIDAD DE AGUA-ABASTECIMIENTO DE AGUA POTABLE
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PG-DA-003  - PROGRAMA MANEJO INTEGRAL DE RESIDUOS

```yaml
codigo: PG-DA-003 
nombre: PROGRAMA MANEJO INTEGRAL DE RESIDUOS
tipo_documental: FORMATO
programa_actual: RECIDUOS SÓLIDOS
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PG-CL-004  - PROGRAMA DE CAPACITACIÓN AL PERSONAL

```yaml
codigo: PG-CL-004 
nombre: PROGRAMA DE CAPACITACIÓN AL PERSONAL
tipo_documental: FORMATO
programa_actual: CAPACITACION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PG-CL-005 - PROGRAMA DE TRAZABILIDAD 

```yaml
codigo: PG-CL-005
nombre: PROGRAMA DE TRAZABILIDAD 
tipo_documental: FORMATO
programa_actual: TRAZABILIDAD
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PG-CL-006 - PROGRAMA DE PROVEEDORES

```yaml
codigo: PG-CL-006
nombre: PROGRAMA DE PROVEEDORES
tipo_documental: FORMATO
programa_actual: PROVEEDORES
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PG-MT-001  - PROGRAMA DE MANTENIMIENTO PREVENTIVO Y CORRECTIVO

```yaml
codigo: PG-MT-001 
nombre: PROGRAMA DE MANTENIMIENTO PREVENTIVO Y CORRECTIVO
tipo_documental: FORMATO
programa_actual: MANTENIMIENTO
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### PG-CL-003  - PROGRAMA DE RECALL

```yaml
codigo: PG-CL-003 
nombre: PROGRAMA DE RECALL
tipo_documental: FORMATO
programa_actual: RECALL
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### CR-MT-001  - CRONOGRAMA DE MANTENIMIENTO PREVENTIVO ANUAL

```yaml
codigo: CR-MT-001 
nombre: CRONOGRAMA DE MANTENIMIENTO PREVENTIVO ANUAL
tipo_documental: FORMATO
programa_actual: MANTENIMIENTO
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### CR-CL-001  - CRONOGRAMA DE CAPACITACIÓN CONTINUA

```yaml
codigo: CR-CL-001 
nombre: CRONOGRAMA DE CAPACITACIÓN CONTINUA
tipo_documental: FORMATO
programa_actual: CAPACITACION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### CR-CL-002  - CRONOGRAMA ANUAL DE MUESTREO MICROBIOLÓGICO Y FISICOQUIMICO 

```yaml
codigo: CR-CL-002 
nombre: CRONOGRAMA ANUAL DE MUESTREO MICROBIOLÓGICO Y FISICOQUIMICO 
tipo_documental: FORMATO
programa_actual: PLAN DE MUESTREO
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### CR-CL-003  - CRONOGRAMA DE ACTIVIDADES LIMPIEZA Y DESINFECCIÓN LYD

```yaml
codigo: CR-CL-003 
nombre: CRONOGRAMA DE ACTIVIDADES LIMPIEZA Y DESINFECCIÓN LYD
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### CR-CL-004  - CRONOGRAMA DE VISITA A PROVEEDORES

```yaml
codigo: CR-CL-004 
nombre: CRONOGRAMA DE VISITA A PROVEEDORES
tipo_documental: FORMATO
programa_actual: PROVEEDORES
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### IN-MT-001  - INSTRUCTIVO DE BPM EN MANTENIMIENTO

```yaml
codigo: IN-MT-001 
nombre: INSTRUCTIVO DE BPM EN MANTENIMIENTO
tipo_documental: FORMATO
programa_actual: MANTENIMIENTO
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

### TB-CL-001  - TABLA CONCENTRACION DETERGENTES Y DESINFECTANTES LYD 

```yaml
codigo: TB-CL-001 
nombre: TABLA CONCENTRACION DETERGENTES Y DESINFECTANTES LYD 
tipo_documental: FORMATO
programa_actual: LIMPIEZA Y DESINFECCION
area_operativa: DOCUMENTAL
modulo: DOCUMENTAL
estado_digitalizacion: None
prioridad: None
criticidad: ALTA
riesgo_sanitario: MEDIO
riesgo_operativo: MEDIO
impacto_trazabilidad: MEDIO
motor_dinamico_sugerido: None
tipo_interaccion: None
requiere_firma: None
requiere_evidencia: None
requiere_aprobacion: None
genera_workflow: None
ia_ready: SI
storage_requerido: None
frecuencia: None
responsable: None
quien_verifica: None
genera_historial: None
tiene_checklist: None
tiene_mediciones: None
tiene_observaciones: None
tiene_accion_correctiva: None
tiene_reinspeccion: None
tiene_tabla_dinamica: None
tiene_calculos: None
```

## 8. Recomendaciones Arquitectónicas

- Consolidar engines antes de digitalización masiva.

- Mantener metadata como fuente única de verdad.

- Evitar lógica hardcodeada por formulario.

- Implementar field_schema.md como siguiente fase.

- Separar CORE vs RUNTIME en SQL.

- Formalizar contratos IA para automatización futura.
