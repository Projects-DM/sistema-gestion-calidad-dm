# DOCUMENTACIÓN MAESTRA TÉCNICA - SISTEMA DE GESTIÓN DE CALIDAD (SGC) EMPRESARIAL
**Cliente:** DM Distribuciones
**Versión:** 1.0 (Consolidación Fase 4.3)
**Tecnologías:** React, Vite, Tailwind CSS, Supabase (PostgreSQL, Storage, Auth)

---

## 1. RESUMEN EJECUTIVO
El SGC de DM Distribuciones es una plataforma empresarial híbrida que digitaliza los procesos normativos y operativos (BPM, INVIMA, ISO). Evolucionó de una estructura inicial estática a una **arquitectura dinámica basada en motores de renderizado**. Permite crear, modificar y auditar formularios operativos desde la base de datos sin requerir redespliegues de código. La plataforma asegura el principio de segregación de funciones, cuenta con aprobación masiva, gestión de evidencias fotográficas, RLS estricto y trazabilidad histórica a prueba de manipulaciones.

## 2. ESTADO ACTUAL DEL PROYECTO
El proyecto se encuentra en una etapa de **madurez alta (Producción/Estable)** en su Fase 4.3.
- Autenticación y roles operativos funcionales.
- Arquitectura dinámica completamente conectada y libre de errores críticos.
- Flujos de verificación y aprobación masiva implementados con reglas de negocio estrictas.
- El módulo de "Trazabilidad Despachos" legacy sigue operando en paralelo sin interferencias.

## 3. ARQUITECTURA GENERAL
El sistema emplea un patrón de arquitectura **Client-Side Rendering (CSR)** conectado directamente a un Backend-as-a-Service (Supabase).
*   **Frontend:** Funciona como un orquestador de componentes dinámicos. En lugar de tener una vista hardcodeada por cada formulario, un componente maestro lee un JSON relacional y decide qué "Motor" (Engine) renderizar.
*   **Backend / DB:** Estructura relacional hiper-normalizada tipo EAV (Entity-Attribute-Value) modificada para performance.
*   **Seguridad:** Basada en JWT pasados a Row Level Security (RLS) en PostgreSQL, garantizando que el Frontend no pueda burlar las reglas de acceso.

## 4. FLUJO COMPLETO DEL SISTEMA
1.  **Auth:** El usuario ingresa; el sistema obtiene su JWT y perfil (rol).
2.  **Layout & Routing:** `DashboardLayout` filtra el Sidebar según el rol del usuario.
3.  **Módulos Dinámicos:** Al entrar a `/m/operaciones`, `DynamicModule` consulta `sgc_modules` y `sgc_forms` para construir la vista.
4.  **Operación:** El usuario interactúa con `DynamicForm` (ingreso de datos) o con `DynamicRecordsView` (historial/auditoría).

## 5. FLUJO DE FORMULARIOS
1.  `DynamicForm` solicita a `dynamicService.getFormWithFields(slug)`.
2.  El JSON recibido contiene los campos, su orden y validaciones (`min`, `max`, `unit`).
3.  Según el `engine_type` de la tabla `sgc_forms`, se inyecta `BaseChecklist`, `BaseMediciones` o el correspondiente.
4.  El usuario diligencia; si hay valores críticos, el Frontend da feedback visual inmediato.
5.  Al guardar, se ejecuta `submitFormResponse`, que escribe en 4 tablas de forma secuencial: `sgc_form_responses` -> `sgc_response_values` -> `sgc_evidences` -> `sgc_audit_logs`.

## 6. FLUJO DE EVIDENCIAS
1.  Integrado en `DynamicForm` a través del componente `EvidenceUploader`.
2.  Soporta Drag & Drop en PC y captura directa de cámara en Móviles.
3.  Los archivos se suben a Supabase Storage (`documentos-sgc/evidencias`).
4.  Las URLs públicas se guardan en la tabla `sgc_evidences` atadas al `response_id`.
5.  En la auditoría, se visualizan mediante un grid visual en el modal de detalles.

## 7. FLUJO DE APROBACIONES
1.  Los registros nacen con status `pendiente_revision`.
2.  Usuarios con rol `administrador` o `calidad` acceden a `DynamicRecordsView`.
3.  Pueden hacer selección múltiple (checkboxes).
4.  **Regla de Negocio (Segregación de funciones):** Un usuario no puede verificar registros creados por sí mismo.
5.  **Regla de Negocio (Críticos):** Si un registro tiene anomalías detectadas automáticamente, el sistema advierte si se intenta aprobar masivamente.
6.  Se requiere un comentario obligatorio si se rechaza.

## 8. FLUJO DE AUDITORÍA
Cualquier cambio de estado (Creación, Verificación, Rechazo) impacta inmutablemente la tabla `sgc_audit_logs`.
- Guarda `old_data` y `new_data`.
- Registra el `modified_by` automáticamente basado en el usuario autenticado (Auth JWT).
- Expuesto visualmente en el modal de detalles de cada registro bajo la pestaña "Auditoría y Trazabilidad".

## 9. FLUJO DE MÓDULOS
Los módulos ya no son carpetas en el código. Son registros en la tabla `sgc_modules` (`Operaciones`, `Medición y Control`, `Mantenimiento`, `Calidad`). Todos estos renderizan utilizando un único componente de enrutamiento dinámico que lee su configuración (icono, color, descripción) desde PostgreSQL.

## 10. ESTRUCTURA FRONTEND
- `/src/components/engines/`: Motores de renderizado (`BaseChecklist`, `BaseMediciones`).
- `/src/components/`: Componentes universales (`DynamicRecordsView`, `EvidenceUploader`, `RoleGate`, `ProtectedRoute`).
- `/src/pages/`: Vistas ruteables (`DynamicModule`, `DynamicForm`, `Dashboard`, `Traceability`).
- `/src/services/`: Capa de abstracción de datos (`dynamicService.js`).
- `/src/hooks/`: Custom hooks (`useAuth.jsx`).

## 11. ESTRUCTURA BACKEND
El backend es Supabase (PostgreSQL 15+). No existe un API Node.js intermediario; el acceso es directo y seguro mediante PostgREST y RLS. La lógica transaccional compleja (si llegara a requerirse) se manejaría vía RPC (Stored Procedures), aunque actualmente está manejada por promesas secuenciales en el frontend.

## 12. ESTRUCTURA SUPABASE (TABLAS)

*   **`profiles`**: Extiende `auth.users`. Propósito: Centralizar información comercial del usuario (nombre, rol). Dependencia crítica para RLS y mostrar nombres en historiales.
*   **`sgc_modules`**: Define las grandes categorías del sistema.
*   **`sgc_forms`**: Define las plantillas/formatos. Relación 1:N con módulos. Indica qué `engine_type` usar y qué roles tienen permiso de llenarlo.
*   **`sgc_form_fields`**: Define las preguntas/campos. Relación 1:N con forms. Contiene lógica JSONB de metadatos (`min`, `max`, `unit`).
*   **`sgc_form_responses`**: Tabla cabecera transaccional. Registra CADA VEZ que alguien diligencia un formulario. Guarda `status`, autor, verificador y timestamps.
*   **`sgc_response_values`**: Arquitectura EAV. Guarda cada respuesta individual a un `field_id`. Tiene columnas tipadas (`value_number`, `value_text`, `value_boolean`) para facilitar reportería y BI.
*   **`sgc_evidences`**: Guarda rutas de Storage asociadas a un `response_id`.
*   **`sgc_audit_logs`**: Tabla apéndice de inmutabilidad (Log de auditoría).
*   **Tablas Legacy (`despachos`, `sgc_programs`, `sgc_records`)**: Permanecen intactas para no romper Trazabilidad y Gestión Documental antigua.

## 13. ESTRUCTURA STORAGE
- Bucket principal: `documentos-sgc`.
- Carpetas: `/pdfs` (legacy manuales) y `/evidencias` (fotografías operativas).
- Políticas de Storage alineadas con Auth JWT (públicas para lectura autenticada).

## 14. RELACIÓN ENTRE TABLAS (ERD Resumido)
`sgc_modules` -> (1:N) -> `sgc_forms`
`sgc_forms` -> (1:N) -> `sgc_form_fields`
`sgc_forms` -> (1:N) -> `sgc_form_responses`
`sgc_form_responses` -> (1:N) -> `sgc_response_values`
`sgc_form_responses` -> (1:N) -> `sgc_evidences`
`sgc_form_responses` -> (1:N) -> `sgc_audit_logs`

*Nota: `created_by` y `verified_by` referencian a `profiles(id)`.*

## 15. ROLES Y PERMISOS
*   **`administrador`**: Acceso total. Puede crear/editar configuraciones, aprobar masivamente (excepto sus propios registros).
*   **`calidad`**: Acceso analítico y verificador. Revisa hallazgos, aprueba/rechaza.
*   **`operativo`**: Solo puede ver formularios asignados, diligenciar, e insertar evidencias. No verifica.
*   **`consulta`**: Modo Read-Only para auditorías externas.
*   **`conductor`**: Rol cerrado, acceso exclusivo a Trazabilidad (firma y entrega).

## 16. COMPONENTES PRINCIPALES
*   **`DynamicRecordsView.jsx`**: El cerebro del análisis. Agrupa, filtra, permite aprobar, muestra detalles y auditoría.
*   **`BaseMediciones.jsx`**: Renderiza inputs numéricos, cruza contra JSONB options para determinar estado crítico en vivo.
*   **`DynamicModule.jsx`**: Maneja el Tab-Switching entre vista de tarjetas operativas y vista de tablas de historial.

## 17. SERVICIOS PRINCIPALES (`dynamicService.js`)
Centraliza las promesas hacia Supabase.
Funciones clave:
- `submitFormResponse()`: Promesa estructurada para persistir respuestas de campos dinámicos.
- `verifyMultipleFormResponses()`: Aprobación en bloque (UPDATE e INSERT en logs).
- `getModuleResponses()`: Query compleja haciendo un JOIN (`.select('..., sgc_forms!inner(...), profiles(...)')`) vital para el historial.

## 18. RIESGOS TÉCNICOS
- **Complejidad de consultas (N+1)**: Si los formularios crecen a 100+ campos, las inserciones en `sgc_response_values` podrían tardar.
- **Acoplamiento de vistas**: Al ser EAV, exportar a Excel requiere "pivotear" filas a columnas en JS o mediante Vistas SQL.

## 19. RIESGOS OPERATIVOS
- Operarios subiendo imágenes gigantes (10MB+) saturando almacenamiento de Supabase. (Implementar compresión en frontend).
- Errores de tipeo en los SLAs/Rangos (`min`, `max`) en el panel de configuración pueden disparar falsos críticos.

## 20. ESCALABILIDAD
Altísima. El sistema ya no necesita tocar código React para sumar el "Formato #45 de Limpieza de Vehículos". Todo se inyecta en Base de Datos. La arquitectura EAV soporta millones de registros siempre y cuando se indexen correctamente las tablas (`field_id`, `response_id`).

## 21. ROADMAP RECOMENDADO (Próximos Pasos)
1.  **Módulo de Reportes / BI**: Un dashboard que pívotee `sgc_response_values` para generar gráficos de tendencias (ej: Temperatura promedio del mes).
2.  **Exportación a Excel/PDF**: En `DynamicRecordsView`, implementar librería (ej: jsPDF / SheetJS) para descargar el historial filtrado.
3.  **Compresión de Imágenes**: Implementar `browser-image-compression` en `EvidenceUploader` antes de subir a Storage.
4.  **Notificaciones Push/Email**: Usar Supabase Edge Functions + Resend para notificar a `calidad` cuando se inserte un registro `Crítico`.

## 22. ARQUITECTURA RECOMENDADA FUTURA
Migrar lógica de validación pesada hacia **Supabase Edge Functions** o **Database Triggers** para automatizar el cálculo de estatus sin depender del mapeo JS del frontend.

## 23. PREPARACIÓN PARA IA FUTURA
El sistema actual es perfecto para IA porque los datos están atomizados en `sgc_response_values`:
- **Análisis Predictivo**: Un modelo puede leer tendencias de `value_number` para predecir fallas en mantenimiento antes de que los rangos crucen el umbral crítico.
- **RAG (Retrieval-Augmented Generation)**: Los `value_text` de observaciones, al estar separados, pueden vectorizarse para un bot que responda: *"¿Cuáles fueron los hallazgos de plagas en mayo?"*
- **OCR Autónomo**: Las imágenes en `sgc_evidences` se pueden pasar por Vision AI (ej. Claude/GPT-4V) en Edge Functions para verificar si una foto de una firma coincide o si hay suciedad en la evidencia.

## 24. BUENAS PRÁCTICAS IMPLEMENTADAS
- **UI/UX Consistente**: Uso estricto de utilidades Tailwind (Glassmorphism, Focus rings, Badges semánticos).
- **Early Returns & Error Boundaries**: Manejo de `loading` y estados de error asíncronos.
- **Segregación de Funciones**: Bloqueo duro (`disabled`, UI hiding) basado en `user.id !== record.created_by`.

## 25. ESTADO DE MADUREZ DEL SOFTWARE
**Fase 4.3 completada.** El software ya trascendió de "MVP Estático" a "Plataforma Empresarial Core".

## 26. QUÉ PARTES SON CRÍTICAS (No tocar)
- **Lógica de Auth (`useAuth.jsx`, `ProtectedRoute.jsx`)**: Cualquier alteración puede quebrar el control de roles.
- **`dynamicService.js` (joins complejos)**: La sintaxis de PostgREST `sgc_forms!inner` es frágil si se alteran las llaves foráneas.

## 27. QUÉ PARTES NO DEBEN ROMPERSE
- El motor EAV de parseo en `DynamicForm.jsx` que transforma el objeto `{ [fieldId]: valor }` al array de `sgc_response_values`.

## 28. QUÉ MÓDULOS SIGUEN ESTÁTICOS
- **Trazabilidad (Despachos)** (`/src/pages/Traceability.jsx` y su componente `ModuleTrazabilidad`).
- **Gestión Documental Legacy** (`sgc_programs`, `sgc_records`).

## 29. QUÉ MÓDULOS YA SON DINÁMICOS
- Operaciones
- Medición y Control
- Mantenimiento
- Calidad
- Configuración (Gestor de las tablas dinámicas)

## 30. DEPENDENCIAS IMPORTANTES
- `react-router-dom`: Enrutamiento y protección.
- `lucide-react`: Iconografía integral del sistema.
- `@supabase/supabase-js`: Cliente transaccional y de auth.
- `tailwindcss`: Sistema de diseño.
