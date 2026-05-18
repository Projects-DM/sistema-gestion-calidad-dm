# PLANEACIÓN TÉCNICA - FASE 5.2
## DIGITALIZACIÓN MASIVA DE FORMATOS Y CONSOLIDACIÓN OPERATIVA
**Documento Arquitectónico y Estratégico**

---

## 1. ANÁLISIS DE LA ARQUITECTURA ACTUAL
La plataforma SGC cuenta hoy con un motor EAV (Entity-Attribute-Value) sumamente robusto. Las tablas `sgc_forms`, `sgc_form_fields`, `sgc_form_responses` y `sgc_response_values` están desacopladas y funcionan como un lienzo en blanco. 
Actualmente, el enrutador de motores (`DynamicForm.jsx`) y el visor universal (`DynamicRecordsView.jsx`) pueden procesar plantillas genéricas. Sin embargo, para soportar flujos empresariales complejos (Mantenimiento, Auditorías CAPA, Gestión Documental), se requieren nuevos "Motores Especializados" que se acoplen a esta misma arquitectura sin destruirla.

## 2. ESTRATEGIA TÉCNICA PARA LA FASE 5.2
La estrategia consiste en **extender, no reemplazar**. 
- Mantendremos la estructura EAV intacta para guardar respuestas de formularios.
- **Patrón de Plugins:** Crearemos nuevos motores (`BaseMantenimiento`, `BaseCalidad`) que actúen como "plugins" dentro de `DynamicForm.jsx`.
- **Tablas Satélite:** Crearemos tablas auxiliares (ej: `sgc_equipment`, `sgc_documents`) que se relacionen con `sgc_form_responses` a través de IDs o mediante JSONB en `sgc_response_values`, permitiendo trazabilidad sin alterar el núcleo dinámico.

---

## 3. IDENTIFICACIÓN DE NECESIDADES ARQUITECTÓNICAS

### Nuevas Tablas (Satélites)
1.  **`sgc_equipment`**: Catálogo maestro de equipos (ID, nombre, ubicación, estado, próxima fecha de mantenimiento).
2.  **`sgc_action_plans`**: Planes de acción correctiva derivados de un hallazgo (Status, responsable, fecha_limite). Relacionado a un `response_id`.
3.  **`sgc_documents_v2`** y **`sgc_document_versions`**: Repositorio documental robusto que reemplazará a largo plazo a los estáticos, manejando estados (Vigente, Obsoleto) y relacionando qué documento normativo ampara a qué formato (`sgc_forms`).
4.  **`sgc_signatures`** (Opcional): Para firmas digitales avanzadas, aunque pueden guardarse en Storage e indexarse como `value_text` en la arquitectura EAV actual.

### Nuevos Motores (Engines)
1.  **`BaseAuditoria.jsx`**: Extensión de `BaseChecklist` pero con lógica de condicionales duros (Si es "No Cumple", abre modal obligatorio para plan de acción y foto).
2.  **`BaseMantenimiento.jsx`**: Motor que consume el catálogo de `sgc_equipment`. Tiene flujos de "Pendiente -> En Proceso -> Finalizado".
3.  **`BaseCalidad.jsx`**: Especializado en PQRS y Recalls. Flujos con múltiples aprobadores (Workflow).

### Nuevos Componentes
1.  **`SignaturePad.jsx`**: Componente Canvas para recolección de firmas táctiles en móviles/tablets (Exporta Base64 -> Storage).
2.  **`PDFExporter.jsx`**: Componente headless o botón para transformar la data de `DynamicRecordsView` en un PDF estructurado para presentar al INVIMA.
3.  **`ConditionalFieldManager`**: Lógica dentro del FormBuilder para mostrar/ocultar campos dependiendo de respuestas anteriores.

### Mejoras de Performance y Seguridad
- **Performance:** Añadir Índices SQL (`CREATE INDEX`) en `sgc_response_values` sobre las columnas `field_id` y `response_id`.
- **Seguridad:** Firmas digitales con Timestamp del servidor, no del cliente.
- **Escalabilidad:** Implementar paginación (offset/limit) en `dynamicService.getModuleResponses` ya que el volumen de datos crecerá exponencialmente.

---

## 4. PREPARACIÓN PARA INTELIGENCIA ARTIFICIAL (IA)
Para que los nuevos formularios sean legibles por IA (Análisis Predictivo, RAG, Detección de Anomalías):
1.  **Taxonomías Estrictas:** Reducir campos de texto libre (`value_text`) y priorizar selectores (`value_json` con IDs estándar) para que los modelos estadísticos puedan agrupar.
2.  **Etiquetado Automático (Tags):** Si un mantenimiento falla, marcar la columna con un tag interno `#falla_motor` para entrenar un modelo de predicción.
3.  **OCR Ready:** Las evidencias deben guardarse con metadatos de qué formato y qué hallazgo están documentando, facilitando a un modelo Vision API entender el contexto de la foto.

---

## 5. ROADMAP TÉCNICO (FASES DE IMPLEMENTACIÓN)

Para garantizar riesgo cero de ruptura, propongo el siguiente orden secuencial:

### Fase A: Fundamentos Operativos Avanzados (Riesgo Bajo)
- Desarrollo del componente `SignaturePad.jsx` e integración con Storage.
- Modificación del `FormBuilder` (ya existente) para soportar el nuevo tipo de campo: `signature`.
- Actualización de `BaseChecklist` para soportar lógica condicional (Ej: Si No Cumple -> Exigir Foto).
- *Hito: Operaciones queda 100% digitalizado con BPMs firmados.*

### Fase B: Motor de Mantenimiento y Catálogos (Riesgo Medio)
- Creación de tabla `sgc_equipment` (Catálogo de activos).
- Creación del nuevo motor `BaseMantenimiento.jsx`.
- Integración en `DynamicForm.jsx` para que reconozca el nuevo engine_type.
- *Hito: Módulo Mantenimiento operando con cronogramas y hojas de vida de equipos.*

### Fase C: Motor de Calidad y Flujos CAPA (Riesgo Medio)
- Creación de tabla `sgc_action_plans`.
- Creación del motor `BaseCalidad.jsx` para gestionar flujos multi-estado (PQRS, Auditorías Internas).
- Modificación en `DynamicRecordsView.jsx` para visualizar dependencias (Hallazgo -> Plan de Acción).
- *Hito: Calidad y Mejora Continua digitalizados.*

### Fase D: Gestión Documental Empresarial (Riesgo Alto - Requiere Migración Cuidadosa)
- Diseño de `sgc_documents_v2` con control de versiones.
- Implementación de flujos de aprobación de documentos (Vigente, Obsoleto).
- Relacionamiento de `sgc_forms` con manuales en `sgc_documents_v2`.
- *Hito: Cumplimiento total ISO/INVIMA en control de documentos.*

### Fase E: Exportación, Gráficas y Cierre
- Implementación de reportes PDF y gráficas de control en el Módulo de Medición y Control.
- Paginación e indexación final de la base de datos.

---

## 6. QUÉ DEBEMOS IMPLEMENTAR PRIMERO (Next Step)
Para no romper el sistema y mantener un flujo ágil, el **Paso 1 absoluto** es la **Fase A**: 
1. Implementar el tipo de campo "Firma" (`signature`) en la arquitectura actual.
2. Agregar capacidad de "Campos Condicionales" en `dynamicService` y `DynamicForm` (Ej: Que un campo de "Observación" o "Evidencia" solo sea obligatorio si la respuesta anterior fue "No Cumple").

Esto requiere cero cambios destructivos en las tablas, solo expandir el JSON de opciones en `sgc_form_fields` y añadir el componente React.

¿Estás de acuerdo con este abordaje como Arquitecto de Software para arrancar oficialmente con la Fase 5.2?
