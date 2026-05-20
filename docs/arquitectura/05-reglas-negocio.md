# REGLAS DE NEGOCIO - SGC EMPRESARIAL

**Documento:** Especificación de Reglas de Negocio Operativas, Técnicas y Auditables  
**Versión:** 1.0  
**Clasificación:** Documentación Técnica Estratégica  
**Sistema:** Sistema de Gestión de Calidad (SGC) DM Distribuciones

---

## 1. INTRODUCCIÓN

### 1.1 Propósito

Este documento cataloga, clasifica y especifica todas las reglas de negocio que gobiernan el comportamiento del SGC. Las reglas están organizadas en categorías según su naturaleza (operativas, técnicas, auditables, IA-ready) y su estado (actuales implementadas, futuras planificadas).

### 1.2 Estructura de Clasificación

Cada regla de negocio se documenta con la siguiente estructura:

```
ID: RN-XX (Regla de Negocio número XX)
Tipo: [OPERATIVA | TÉCNICA | AUDITABLE | IA-READY]
Estado: [IMPLEMENTADA | PLANIFICADA]
Componente: [Componente afectado]
Severidad: [ALTA | MEDIA | BAJA]
Descripción: [Qué hace la regla]
Validación: [Cómo se valida]
```

---

## 2. REGLAS DE NEGOCIO OPERATIVAS

### 2.1 Gestión de Formularios

| ID | Regla | Estado | Componente | Severidad |
|----|-------|--------|-----------|-----------|
| **RN-01** | Los formularios se renderizan según `engine_type` configurado en BD | ✅ Implementada | DynamicForm.jsx | Alta |
| **RN-02** | Solo los usuarios con rol en `roles_allowed` pueden acceder al formulario | ✅ Implementada | DynamicForm.jsx | Alta |
| **RN-03** | Los campos se renderizan en el orden definido por `order_index` | ✅ Implementada | Motores | Media |
| **RN-04** | Los campos marcados como `required=true` deben ser completados antes del submit | ✅ Implementada | DynamicForm.jsx | Alta |
| **RN-05** | Los campos booleanos se inicializan como `false` | ✅ Implementada | DynamicForm.jsx | Baja |
| **RN-06** | Los módulos inactivos (`is_active=false`) no se muestran en el Dashboard | ✅ Implementada | DynamicModule.jsx | Media |
| **RN-07** | Los formularios inactivos (`is_active=false`) no se muestran en el módulo | ✅ Implementada | DynamicModule.jsx | Media |

### 2.2 Validación Condicional (Reglas de Hallazgos Críticos)

| ID | Regla | Estado | Componente | Severidad |
|----|-------|--------|-----------|-----------|
| **RN-08** | Si un campo booleano es `false` (No Cumple), se marca como hallazgo crítico | ✅ Implementada | DynamicForm.jsx | Alta |
| **RN-09** | Si un campo numérico está fuera del rango `[options.min, options.max]`, se marca como hallazgo crítico | ✅ Implementada | DynamicForm.jsx | Alta |
| **RN-10** | Si hay hallazgos críticos, las evidencias fotográficas son obligatorias | ✅ Implementada | DynamicForm.jsx | Alta |
| **RN-11** | Si hay hallazgos críticos, el campo de observaciones es obligatorio (si existe) | ✅ Implementada | DynamicForm.jsx | Alta |
| **RN-12** | La detección de críticos se recalcula en cada cambio de valores (useEffect) | ✅ Implementada | DynamicForm.jsx | Media |

### 2.3 Procesamiento de Valores

| ID | Regla | Estado | Componente | Severidad |
|----|-------|--------|-----------|-----------|
| **RN-13** | Los valores numéricos se convierten con `parseFloat` antes de enviar | ✅ Implementada | DynamicForm.jsx | Alta |
| **RN-14** | Los valores booleanos se almacenan en `value_boolean` | ✅ Implementada | dynamicService.js | Alta |
| **RN-15** | Los valores numéricos se almacenan en `value_number` | ✅ Implementada | dynamicService.js | Alta |
| **RN-16** | Los valores de texto, selects, fechas, horas y URLs de firma se almacenan en `value_text` | ✅ Implementada | dynamicService.js | Alta |
| **RN-17** | Los valores complejos (objetos) se almacenan en `value_json` | ✅ Implementada | dynamicService.js | Media |

### 2.4 Gestión de Evidencias

| ID | Regla | Estado | Componente | Severidad |
|----|-------|--------|-----------|-----------|
| **RN-18** | Las evidencias se suben a Supabase Storage bucket `documentos-sgc` | ✅ Implementada | EvidenceUploader.jsx | Alta |
| **RN-19** | El nombre de archivo se genera con formato `random(15)_timestamp.ext` | ✅ Implementada | EvidenceUploader.jsx | Media |
| **RN-20** | Las evidencias se asocian a una respuesta vía `response_id` en `sgc_evidences` | ✅ Implementada | dynamicService.js | Alta |
| **RN-21** | Se pueden subir imágenes (image/*) y PDFs (application/pdf) | ✅ Implementada | EvidenceUploader.jsx | Media |
| **RN-22** | Las evidencias se eliminan del storage si el usuario las remueve antes de guardar | ✅ Implementada | EvidenceUploader.jsx | Media |
| **RN-23** | **No hay límite de tamaño** de archivo actualmente | ⚠️ Pendiente | EvidenceUploader.jsx | Alta |

### 2.5 Gestión de Firmas

| ID | Regla | Estado | Componente | Severidad |
|----|-------|--------|-----------|-----------|
| **RN-24** | Las firmas se capturan mediante Canvas HTML5 | ✅ Implementada | SignaturePad.jsx | Alta |
| **RN-25** | Las firmas se convierten a PNG (toDataURL) | ✅ Implementada | SignaturePad.jsx | Alta |
| **RN-26** | Las firmas se suben a Supabase Storage como PNG | ✅ Implementada | SignaturePad.jsx | Alta |
| **RN-27** | La URL de la firma se almacena en `value_text` del campo signature | ✅ Implementada | SignaturePad.jsx | Alta |
| **RN-28** | Las firmas soportan entrada táctil (touch events) para tablets | ✅ Implementada | SignaturePad.jsx | Alta |

---

## 3. REGLAS DE NEGOCIO TÉCNICAS

### 3.1 Seguridad y Acceso

| ID | Regla | Estado | Componente | Severidad |
|----|-------|--------|-----------|-----------|
| **RN-29** | Todo acceso requiere autenticación JWT vía Supabase Auth | ✅ Implementada | Supabase Auth | Alta |
| **RN-30** | Solo los roles `administrador` y `calidad` pueden verificar registros | ✅ Implementada | DynamicRecordsView.jsx | Alta |
| **RN-31** | Ningún usuario puede verificar sus propios registros (segregación de funciones) | ✅ Implementada | DynamicRecordsView.jsx | Alta |
| **RN-32** | Los formularios filtran su visibilidad según `roles_allowed` | ✅ Implementada | DynamicModule.jsx | Alta |
| **RN-33** | Las tablas EAV tienen RLS habilitado | ✅ Implementada | Base de Datos | Alta |
| **RN-34** | Las políticas RLS actuales permiten lectura a todos los autenticados | ✅ Implementada | Base de Datos | Media |
| **RN-35** | La escritura en `sgc_audit_logs` requiere autenticación | ✅ Implementada | Base de Datos | Alta |

### 3.2 Estados y Workflow

| ID | Regla | Estado | Componente | Severidad |
|----|-------|--------|-----------|-----------|
| **RN-36** | Todo registro nuevo se crea con `status='pendiente_revision'` | ✅ Implementada | dynamicService.js | Alta |
| **RN-37** | Los estados posibles son: `pendiente_revision`, `aprobado`, `rechazado`, `corregido` | ✅ Implementada | Base de Datos | Alta |
| **RN-38** | El estado computado (`computedStatus`) se calcula en frontend: `cumple`, `advertencia`, `critico` | ✅ Implementada | DynamicRecordsView.jsx | Alta |
| **RN-39** | Un registro con cualquier booleano `false` se marca como `advertencia` | ✅ Implementada | DynamicRecordsView.jsx | Media |
| **RN-40** | Un registro con cualquier número fuera de rango se marca como `critico` | ✅ Implementada | DynamicRecordsView.jsx | Alta |
| **RN-41** | Si un registro es `critico` y `advertencia` simultáneamente, prevalece `critico` | ✅ Implementada | DynamicRecordsView.jsx | Media |
| **RN-42** | La verificación masiva de registros críticos requiere confirmación explícita del usuario | ✅ Implementada | DynamicRecordsView.jsx | Media |

### 3.3 Auditoría y Trazabilidad

| ID | Regla | Estado | Componente | Severidad |
|----|-------|--------|-----------|-----------|
| **RN-43** | Toda creación de registro genera un `sgc_audit_logs` con `action_type='create'` | ✅ Implementada | dynamicService.js | Alta |
| **RN-44** | Toda verificación de registro genera un `sgc_audit_logs` con `action_type='verify'` | ✅ Implementada | dynamicService.js | Alta |
| **RN-45** | Los logs de auditoría incluyen: quién (`modified_by`), qué (`action_type`), cuándo (`created_at`), por qué (`reason`) | ✅ Implementada | dynamicService.js | Alta |
| **RN-46** | Los logs de creación incluyen `new_data` con los valores completos del formulario | ✅ Implementada | dynamicService.js | Alta |
| **RN-47** | Los logs de verificación incluyen `new_data` con el estado y comentario | ✅ Implementada | dynamicService.js | Alta |
| **RN-48** | La auditoría es de solo lectura (nadie puede modificar/eliminar logs) | ✅ Implementada | RLS | Alta |
| **RN-49** | Los logs de auditoría se muestran en orden cronológico descendente | ✅ Implementada | DynamicRecordsView.jsx | Media |

### 3.4 Navegación y Enrutamiento

| ID | Regla | Estado | Componente | Severidad |
|----|-------|--------|-----------|-----------|
| **RN-50** | La ruta `/modulo/:moduleSlug/:formSlug` resuelve el formulario dinámico | ✅ Implementada | App.jsx (Router) | Alta |
| **RN-51** | La ruta `/:moduleSlug` resuelve el módulo dinámico | ✅ Implementada | App.jsx (Router) | Alta |
| **RN-52** | El módulo `trazabilidad` redirige a ruta legacy (no dinámica) | ✅ Implementada | DynamicModule.jsx | Alta |
| **RN-53** | Tras guardar un registro exitosamente, se redirige al módulo en 2 segundos | ✅ Implementada | DynamicForm.jsx | Baja |

### 3.5 Persistencia y Transaccionalidad

| ID | Regla | Estado | Componente | Severidad |
|----|-------|--------|-----------|-----------|
| **RN-54** | El submit ejecuta 4 INSERTs secuenciales (no transaccionales) | ✅ Implementada | dynamicService.js | Alta |
| **RN-55** | Si falla cualquier paso del submit, se lanza error y se detiene el flujo | ✅ Implementada | dynamicService.js | Alta |
| **RN-56** | No hay rollback automático si falla un paso intermedio | ⚠️ Riesgo conocido | dynamicService.js | Alta |
| **RN-57** | Las claves foráneas usan ON DELETE CASCADE en todas las relaciones | ✅ Implementada | Base de Datos | Alta |

---

## 4. REGLAS DE NEGOCIO AUDITABLES

### 4.1 Cumplimiento Normativo

| ID | Regla | Estado | Marco Normativo |
|----|-------|--------|-----------------|
| **RN-58** | Todo registro debe tener trazabilidad completa del operario que lo creó | ✅ Implementada | INVIMA, ISO 9001, BPM |
| **RN-59** | Todo registro debe tener registro de verificación con separación de funciones | ✅ Implementada | INVIMA, ISO 9001 |
| **RN-60** | Las evidencias fotográficas deben estar vinculadas inmutables al registro | ✅ Implementada | INVIMA, BPM |
| **RN-61** | Las firmas digitales deben estar vinculadas al registro y al operario | ✅ Implementada | INVIMA, ISO 9001 |
| **RN-62** | Los registros históricos no pueden ser modificados ni eliminados (solo su estado de verificación) | ✅ Implementada | ISO 9001, BPM |
| **RN-63** | Los logs de auditoría son inmutables (solo INSERT, nunca UPDATE/DELETE) | ✅ Implementada | INVIMA, ISO 9001 |
| **RN-64** | Los rangos de tolerancia (min/max) deben estar definidos y visibles al operario | ✅ Implementada | BPM, HACCP |
| **RN-65** | Los valores fuera de rango deben generar alerta automática y requerir acción correctiva | ✅ Implementada | BPM, HACCP |

### 4.2 Segregación de Funciones

| ID | Regla | Estado | Marco Normativo |
|----|-------|--------|-----------------|
| **RN-66** | La persona que crea un registro no puede verificarlo | ✅ Implementada | INVIMA, ISO 9001 |
| **RN-67** | Solo roles autorizados (calidad, administrador) pueden realizar verificaciones | ✅ Implementada | INVIMA, ISO 9001 |
| **RN-68** | La verificación requiere un comentario obligatorio | ✅ Implementada | INVIMA, ISO 9001 |
| **RN-69** | La verificación masiva requiere comentario si es rechazo | ✅ Implementada | INVIMA, ISO 9001 |

### 4.3 Reglas Auditables Planificadas

| ID | Regla | Estado | Marco Normativo |
|----|-------|--------|-----------------|
| **RN-70** | Los registros archivados deben preservar todos los metadatos de auditoría | 📋 Planificada | ISO 9001, INVIMA |
| **RN-71** | Las modificaciones a registros existentes deben preservar el historial completo (old_data + new_data) | 📋 Planificada | ISO 9001 |
| **RN-72** | Los documentos obsoletos deben mantener el historial de versiones anteriores | 📋 Planificada | ISO 9001, INVIMA |
| **RN-73** | Los informes de auditoría deben ser generables automáticamente con filtros por período, módulo, estado | 📋 Planificada | INVIMA, ISO 9001 |

---

## 5. REGLAS DE NEGOCIO IA-READY (PLANIFICADAS)

### 5.1 Preparación de Datos

| ID | Regla | Descripción | Prioridad |
|----|-------|-------------|-----------|
| **RN-74** | Los metadatos de formularios y campos deben ser exportables en formato semántico (JSON-LD) | 📋 Planificada | Alta |
| **RN-75** | Las respuestas deben poder generar embeddings para búsqueda semántica | 📋 Planificada | Alta |
| **RN-76** | Los textos de observaciones y hallazgos deben estar normalizados (sin caracteres especiales, UTF-8) | 📋 Planificada | Media |
| **RN-77** | Las evidencias fotográficas deben tener metadatos EXIF preservados para análisis de contexto | 📋 Planificada | Media |
| **RN-78** | Las taxonomías de campos (field_type, options) deben ser consistentes y estandarizadas | 📋 Planificada | Alta |
| **RN-79** | Los datos históricos deben estar disponibles en formato plano para entrenamiento de modelos | 📋 Planificada | Alta |
| **RN-80** | Las firmas digitales deben tener metadatos de timestamp y dispositivo de origen | 📋 Planificada | Media |

### 5.2 Reglas de Clasificación y Scoring

| ID | Regla | Descripción | Prioridad |
|----|-------|-------------|-----------|
| **RN-81** | Los registros deben poder clasificarse automáticamente por severidad usando IA | 📋 Planificada | Alta |
| **RN-82** | Los patrones de incumplimiento deben detectarse automáticamente (anomalías) | 📋 Planificada | Alta |
| **RN-83** | Las tendencias de parámetros deben analizarse para predicción de desviaciones | 📋 Planificada | Alta |
| **RN-84** | Los operarios deben recibir scoring de cumplimiento basado en su historial | 📋 Planificada | Media |
| **RN-85** | Los hallazgos críticos deben correlacionarse automáticamente con registros similares | 📋 Planificada | Media |

### 5.3 Reglas de Automatización

| ID | Regla | Descripción | Prioridad |
|----|-------|-------------|-----------|
| **RN-86** | Los formularios deben poder auto-completarse con datos históricos usando predicción | 📋 Planificada | Media |
| **RN-87** | Las evidencias deben poder analizarse mediante visión computacional (OCR, detección de objetos) | 📋 Planificada | Alta |
| **RN-88** | Las alertas deben generarse proactivamente basadas en predicción de riesgo | 📋 Planificada | Alta |
| **RN-89** | Los informes ejecutivos deben poder generarse en lenguaje natural con IA generativa | 📋 Planificada | Media |

---

## 6. REGLAS DE NEGOCIO FUTURAS (PLANIFICADAS)

### 6.1 Mantenimiento (BaseMantenimiento)

| ID | Regla | Descripción | Componente Futuro |
|----|-------|-------------|-------------------|
| **RN-90** | Cada equipo debe tener una frecuencia de mantenimiento en días | 📋 Planificada | BaseMantenimiento |
| **RN-91** | El sistema debe calcular automáticamente la próxima fecha de mantenimiento | 📋 Planificada | BaseMantenimiento |
| **RN-92** | Si la fecha de mantenimiento está vencida, se debe generar una alerta | 📋 Planificada | BaseMantenimiento |
| **RN-93** | Los repuestos utilizados deben registrarse con cantidad y costo | 📋 Planificada | BaseMantenimiento |
| **RN-94** | El mantenimiento requiere firma del técnico y del supervisor | 📋 Planificada | BaseMantenimiento |
| **RN-95** | Las evidencias fotográficas son obligatorias en mantenimientos correctivos | 📋 Planificada | BaseMantenimiento |

### 6.2 Calidad y CAPA (BaseCalidad)

| ID | Regla | Descripción | Componente Futuro |
|----|-------|-------------|-------------------|
| **RN-96** | Los hallazgos se clasifican como: PQR, NC (No Conformidad), Observación, Recall | 📋 Planificada | BaseCalidad |
| **RN-97** | La severidad del hallazgo determina el plazo de cierre: Crítica (<48h), Mayor (<7d), Menor (<30d) | 📋 Planificada | BaseCalidad |
| **RN-98** | Todo hallazgo crítico debe tener análisis de causa raíz (5 Whys) | 📋 Planificada | BaseCalidad |
| **RN-99** | El CAPA debe tener seguimiento de eficacia verificable | 📋 Planificada | BaseCalidad |
| **RN-100** | El workflow de aprobación CAPA requiere: responsable → calidad → administrador | 📋 Planificada | BaseCalidad |
| **RN-101** | Si un CAPA no se cierra en la fecha compromiso, escala automáticamente al siguiente nivel | 📋 Planificada | BaseCalidad |

### 6.3 Gestión Documental (BaseDocumental)

| ID | Regla | Descripción | Componente Futuro |
|----|-------|-------------|-------------------|
| **RN-102** | Todo documento debe tener un código único de documento | 📋 Planificada | BaseDocumental |
| **RN-103** | Los documentos tienen ciclo de vida: borrador → revisión → aprobado → vigente → obsoleto | 📋 Planificada | BaseDocumental |
| **RN-104** | La aprobación requiere firma de: elaborador, revisor, aprobador | 📋 Planificada | BaseDocumental |
| **RN-105** | Los documentos tienen fecha de revisión programada; al vencer, generan alerta | 📋 Planificada | BaseDocumental |
| **RN-106** | Cada cambio de versión debe preservar el documento anterior como histórico | 📋 Planificada | BaseDocumental |
| **RN-107** | Solo el documento vigente debe estar accesible para los operarios | 📋 Planificada | BaseDocumental |

### 6.4 Workflows Avanzados

| ID | Regla | Descripción | Componente Futuro |
|----|-------|-------------|-------------------|
| **RN-108** | Los registros rechazados deben poder reinspeccionarse (nuevo ciclo de verificación) | 📋 Planificada | DynamicRecordsView |
| **RN-109** | La edición de registros debe preservar el historial completo de cambios | 📋 Planificada | dynamicService.js |
| **RN-110** | Las alertas automáticas deben configurarse por módulo y tipo de evento | 📋 Planificada | Sistema de Alertas |
| **RN-111** | Los cronogramas de mantenimiento deben generar tareas automáticas | 📋 Planificada | BaseMantenimiento |
| **RN-112** | La verificación multinivel debe soportar: operativo → calidad → administrador | 📋 Planificada | DynamicRecordsView |
| **RN-113** | Los bloqueos operativos deben impedir crear nuevos registros si hay pendientes críticos | 📋 Planificada | DynamicForm |

---

## 7. MATRIZ DE COBERTURA POR COMPONENTE

```
REGLAS POR COMPONENTE
├── DynamicForm.jsx                 → RN-01 a RN-12, RN-54, RN-113
├── DynamicModule.jsx               → RN-06, RN-07, RN-32, RN-52
├── DynamicRecordsView.jsx          → RN-30, RN-31, RN-38 a RN-42, RN-108, RN-112
├── dynamicService.js               → RN-13 a RN-17, RN-36, RN-43 a RN-47, RN-54, RN-55
├── EvidenceUploader.jsx            → RN-18 a RN-23
├── SignaturePad.jsx                → RN-24 a RN-28
├── Motores (BaseChecklist, etc.)   → RN-03, RN-64
├── Base de Datos (DDL + RLS)       → RN-33 a RN-35, RN-37, RN-48, RN-57
├── BaseMantenimiento (Futuro)      → RN-90 a RN-95, RN-111
├── BaseCalidad (Futuro)            → RN-96 a RN-101
├── BaseDocumental (Futuro)         → RN-102 a RN-107
└── IA (Futuro)                     → RN-74 a RN-89
```

**Cobertura actual:** 69 reglas implementadas (RN-01 a RN-69)  
**Cobertura planificada:** 44 reglas futuras (RN-70 a RN-113)  
**Total del sistema:** 113 reglas de negocio documentadas

---

## 8. REGLAS POR TIPO

### 8.1 Distribución Actual

```
OPERATIVAS:   28 reglas (RN-01 a RN-28)
TÉCNICAS:     29 reglas (RN-29 a RN-57)
AUDITABLES:   12 reglas (RN-58 a RN-69)
IA-READY:     16 reglas (RN-74 a RN-89)
FUTURAS:      24 reglas (RN-90 a RN-113)
```

### 8.2 Distribución por Severidad

```
ALTA:    47 reglas (42%)
MEDIA:   42 reglas (37%)
BAJA:    24 reglas (21%)
```

---

## 9. IMPACTO DE REGLAS EN ARQUITECTURA

### 9.1 Reglas con Mayor Impacto Arquitectónico

| ID | Regla | Impacto | Riesgo si no se cumple |
|----|-------|---------|------------------------|
| **RN-10** | Evidencias obligatorias en críticos | Condiciona flujo de submit | Pérdida de trazabilidad en hallazgos |
| **RN-31** | No auto-verificación | Segregación de funciones | Incumplimiento normativo INVIMA |
| **RN-43** | Auditoría en cada creación | Integridad del sistema | Sin trazabilidad, no certificable |
| **RN-54** | 4 INSERTs no transaccionales | Consistencia de datos | Datos huérfanos, inconsistencia |
| **RN-56** | Sin rollback automático | Recuperación de errores | Estado inconsistente tras fallo |
| **RN-58** | Trazabilidad completa del operario | Auditoría INVIMA/ISO | No certificable |
| **RN-65** | Valores fuera de rango requieren acción | Seguridad del producto | Riesgo de calidad |

### 9.2 Reglas que Requieren Evolución Arquitectónica

| ID | Regla | Cambio Arquitectónico Necesario | Fase |
|----|-------|-------------------------------|------|
| **RN-56** | Transaccionalidad real en submit | Edge Function con BEGIN/COMMIT/ROLLBACK | Fase A |
| **RN-70** | Archivado con metadatos de auditoría | Tablas de cold storage + políticas de retención | Fase B |
| **RN-74** | Exportación semántica de metadatos | Serializador JSON-LD + endpoints de exportación | Fase D |
| **RN-75** | Embeddings para búsqueda semántica | Columna vector(1536) + índice ivfflat | Fase D |
| **RN-90-95** | Mantenimiento con equipos y frecuencias | Tablas satélite sgc_equipos + sgc_mantenimiento_repuestos | Fase B |
| **RN-96-101** | CAPA con workflow de aprobación | Tabla sgc_capa + motor BaseCalidad | Fase C |
| **RN-102-107** | Control documental con versiones | Tabla sgc_documentos_control + motor BaseDocumental | Fase C |

---

## 10. VALIDACIÓN DE REGLAS

### 10.1 Dónde se Validan las Reglas

```
CAPA FRONTEND (DynamicForm.jsx)
├── RN-04: Campos requeridos (validación en submit)
├── RN-08: Booleano false → crítico
├── RN-09: Número fuera de rango → crítico
├── RN-10: Evidencias obligatorias
├── RN-11: Observaciones obligatorias
└── RN-12: Recalcular en cada cambio

CAPA FRONTEND (DynamicRecordsView.jsx)
├── RN-30: Solo admin/calidad verifican
├── RN-31: No auto-verificación
├── RN-38-41: Estado computado
└── RN-42: Confirmación en verificación masiva

CAPA SERVICIOS (dynamicService.js)
├── RN-13-17: Tipado de valores
├── RN-36: Status por defecto
├── RN-43-47: Auditoría automática
└── RN-54-55: Secuencia de INSERTs

CAPA BASE DE DATOS (PostgreSQL + RLS)
├── RN-33: RLS habilitado
├── RN-34: Políticas de lectura
├── RN-35: Políticas de escritura
└── RN-57: ON DELETE CASCADE
```

### 10.2 Reglas sin Validación Actual

| ID | Regla | Riesgo | Solución Propuesta |
|----|-------|--------|-------------------|
| **RN-23** | Sin límite de tamaño de evidencias | Storage flooding | Validar tamaño en EvidenceUploader + Supabase bucket policy |
| **RN-56** | Sin transaccionalidad real | Datos huérfanos | Edge Function con transacción PostgreSQL |
| **RN-62** | Registros históricos modificables vía API directa | Pérdida de integridad auditiva | RLS policy que impida UPDATE/DELETE después de creado |

---

**Documento mantenido por:** Arquitectura de Software  
**Última actualización:** Mayo 2026  
**Próxima revisión:** Julio 2026