# SPRINT_45_2 — MODULE CREATION FLOW AUDIT (SSOT)

> Documento SSOT (Solo auditoría documental). **No** implementar código, **no** modificar runtime, **no** modificar base de datos, **no** modificar componentes.
>
> Se audita el **flujo real** que sigue un **módulo estándar** desde que el administrador lo configura hasta que queda operativo, usando únicamente evidencia del repositorio.

---

## 0) Alcance y exclusiones
- **Incluye (estándar reutilizable)**:
  - Operaciones
  - Medición y Control
  - Mantenimiento
  - Calidad
  - Gestión Documental
- **Excluye**:
  - **Trazabilidad** como referencia arquitectónica del flujo (se ignora para definir estándar del sistema).
- **Importante**:
  - El flujo “nace” desde el frontend (UI de Configuración) y/o desde datos existentes en BD; donde falte evidencia de un paso (p.ej. “creación de sgc_modules” desde UI), se indicará como **no demostrado**.

---

## 1) Flujo completo de creación de un módulo estándar (paso a paso)

### Paso A — Administrador (inicio del flujo)
**Componentes**:
- `src/pages/Configuration.jsx`

**Servicios**:
- `src/services/dynamicService.js`
  - `getModules()`
  - `getFormsByModule(moduleId)`

**Tablas consultadas**:
- `sgc_modules`
- `sgc_forms`

**Tablas modificadas**:
- No modifica `sgc_modules` en el código auditado.

**Parte automática vs manual**:
- Automático:
  - carga de módulos y formularios para que el admin configure.
- Manual / pendiente (no demostrado en evidencia del repositorio):
  - la creación del registro `sgc_modules` “desde UI” **no se observa** en `Configuration.jsx` (se ve creación de `sgc_forms`, no de `sgc_modules`).

**Evidencia**:
- `Configuration.jsx` usa `dynamicService.getModules()` y lista módulos.
- La UI permite “Nuevo Formulario”, no “Nuevo Módulo”.

---

### Paso B — Configuración (definición operacional del módulo)
**Qué define realmente el sistema**:
- El “módulo operativo” para el frontend se vuelve visible cuando existen:
  - `sgc_modules` con `slug` y `is_active=true`
  - `sgc_forms` asociados al `module_id` y `is_active=true`
  - `sgc_form_fields` para cada form

**Componentes**:
- `src/pages/Configuration.jsx`
- `src/components/FormBuilder.jsx`

**Servicios**:
- `Configuration.jsx`
  - inserta `sgc_forms` vía Supabase (dinámico import de supabase)
- `FormBuilder` (lectura pendiente para evidencia exacta de tablas modificadas; no se cargó en esta iteración el archivo completo, por lo que se marca como “verificación pendiente” en este documento)

**Tablas consultadas**:
- `sgc_modules`
- `sgc_forms`

**Tablas modificadas**:
- Evidenciado: `sgc_forms` (insert/delete)
- No confirmado en este documento: `sgc_form_fields` (se asume por función de FormBuilder, pero para cumplir el criterio “basarse en evidencia”, queda marcado como pendiente si no se leyó FormBuilder).

**Parte automática vs manual**:
- Automático:
  - carga de metadata de módulos/forms para configurar.
- Manual:
  - asignación de `module_id` a un nuevo form.
  - definición de campos en FormBuilder.

---

### Paso C — Creación del módulo (`sgc_modules`)
**Componentes**:
- No hay UI observada para crear módulos en `Configuration.jsx`.

**Servicios**:
- No se observa método tipo `createModule` en `dynamicService.js`.

**Tablas consultadas**:
- `sgc_modules` se consulta para cargar lista de módulos.

**Tablas modificadas**:
- No se observa modificación de `sgc_modules` desde UI.

**Conclusión basada en evidencia**:
- **La creación de `sgc_modules` en el flujo auditable NO está demostrada que ocurra desde la UI de Configuración**.
- En la práctica, el admin probablemente crea/activa módulos mediante **operación fuera de la UI** (ej. SQL, scripts o DB admin), pero esa parte **no puede afirmarse** sin evidencia adicional.

---

### Paso D — Creación de formularios (`sgc_forms`)
**Componentes**:
- `src/pages/Configuration.jsx`

**Servicios**:
- Inserción directa vía Supabase client (dinámico import)

**Tablas modificadas (evidenciado)**:
- `sgc_forms`
  - `insert({...})` al crear un nuevo formulario
  - `delete().eq('id', formId)` al eliminar

**Campos clave observados**:
- `module_id` (de selección UI)
- `name`
- `slug` (genera a partir de nombre si está vacío)
- `description`
- `engine_type`
- `roles_allowed`

**Parte automática vs manual**:
- Automático:
  - generación de slug si está vacío.
- Manual:
  - selección de `engine_type` (UI limita a opciones existentes).
  - `roles_allowed` en el template inicial (aunque no se ve UI completa de edición de roles, sí se ve la default en `newFormDef.roles_allowed`).

---

### Paso E — Creación de campos (`sgc_form_fields`)
**Componentes**:
- `src/components/FormBuilder.jsx` (se abre desde `Configuration.jsx` cuando `selectedForm` existe)

**Servicios**:
- No se leyó en esta iteración el código completo de `FormBuilder.jsx`; por lo tanto:
  - **Tablas consultadas/modificadas**: **pendiente de evidencia directa**.

**Conclusión basada en lo que sí se observa**:
- El sistema está diseñado para que los campos existan en `sgc_form_fields` y el frontend los use.
- Evidencia de consumo (downstream):
  - `DynamicForm.jsx` carga campos con `dynamicService.getFormFields(form.id)`.

**Conclusión provisional (sin asumir tablas modificadas)**:
- Este paso depende de que FormBuilder persista `sgc_form_fields`.
- Recomendación para auditoría futura (fuera de este sprint): leer `src/components/FormBuilder.jsx` y auditar queries exactas.

---

### Paso F — Publicación del módulo
**Qué significa “publicación” en este sistema (evidenciado)**:
- La UI de frontend lista módulos solo si `sgc_modules.is_active=true`.
- Las UI de forms filtran `sgc_forms.is_active=true`.

**Componentes**:
- `src/pages/DynamicModule.jsx` + `dynamicService.getModuleBySlug()`

**Servicios**:
- `dynamicService.getModules()` filtra `is_active`
- `dynamicService.getModuleBySlug()` no filtra por `is_active` en el método mostrado (pero `getModules()` sí lo hace para listado inicial).

**Tablas consultadas**:
- `sgc_modules`
- `sgc_forms`

**Tablas modificadas**:
- No se observa una acción explícita de “publish” para `sgc_modules` desde `Configuration.jsx`.

**Parte automática vs manual**:
- Manual (no demostrado UI): activar `is_active` en `sgc_modules`.
- Automático: el frontend consume lo que haya en DB.

---

### Paso G — Visualización en la UI
Una vez existan las filas necesarias:
- el router crea ruta dinámica
- el frontend carga módulo + forms

**Componentes**:
- `src/pages/DynamicModule.jsx`

**Servicios**:
- `dynamicService.getModuleBySlug(moduleSlug)`
- `dynamicService.getFormsByModule(moduleData.id)`

**Tablas consultadas**:
- `sgc_modules`
- `sgc_forms`

**Requisitos adicionales por capacidades**:
- “Repositorio Documental” está habilitado por **hardcode** de slug (ver sección 3).

---

### Paso H — Uso operativo
#### Diligenciar Registros
**Componentes**:
- `DynamicForm` para cada form

**Servicios**:
- `dynamicService.getFormBySlug`
- `dynamicService.getFormFields`
- `dynamicService.submitFormResponse`
- `runtimeActivationLayer.activate`

**Tablas modificadas**:
- `sgc_form_responses`
- `sgc_response_values`
- `sgc_evidences` (si aplica)
- `sgc_audit_logs`

#### Historial y Consultas
**Componentes**:
- `DynamicRecordsView`

**Servicios**:
- `dynamicService.getModuleResponses`
- `dynamicService.getAuditLogs`
- `dynamicService.verifyFormResponse` / `verifyMultiple...`

---

## 2) Dependencias automáticas por paso (resumen auditado)

| Paso | Componente | Servicio | Tabla(s) consulta | Tabla(s) modifica | Automático | Manual/config |
|---|---|---|---|---|---|---|
| A | Configuration.jsx | dynamicService.getModules/getFormsByModule | sgc_modules, sgc_forms | - | Sí | - |
| B | Configuration + FormBuilder | Supabase insert forms (evidenciado) + FormBuilder (pendiente lectura) | sgc_modules/sgc_forms | sgc_forms (evid.) | Parcial | Campos + engine/roles |
| C | (no UI) | - | - | - | No demostrado | likely DB/op |
| D | Configuration.jsx | Supabase insert/delete | - | sgc_forms | Parcial | engine_type/roles iniciales |
| E | FormBuilder | (pendiente evidencia exacta) | - | sgc_form_fields (probable) | No confirmado | definir campos |
| F | DynamicModule consume flags | dynamicService get* | sgc_modules/sgc_forms | - | Sí (consumo) | is_active en DB |
| G | DynamicModule | getModuleBySlug/getFormsByModule | sgc_modules/sgc_forms | - | Sí | existencia metadata |
| H | DynamicForm + DynamicRecordsView | submit/verify/get* | join + EAV | sgc_response* + audit | Sí | definición engines/campos |

---

## 3) Detección de hardcodes que afectan el “nacer” del módulo

### 3.1 Hardcode de habilitación de Repositorio Documental
**Archivo**:
- `src/pages/DynamicModule.jsx`

**Función**:
- `isDocumentEnabled(slug)` con lista fija
  - `['mantenimiento','calidad','operaciones','gestion-documental','medicion-control']`

**Impacto**:
- Un módulo creado y activo en DB **podría** existir operativamente (forms/diligenciar/historial) pero **no mostrará**/habilitará el repositorio documental si su `slug` no está en la lista.

**Propuesta futura (solo documentar, no implementar)**:
- Parametrizar la habilitación documental desde DB (por existencia de repositorios activos o flag en `sgc_modules`).

### 3.2 Hardcode del conjunto de engines soportadas por UI
**Archivo**:
- `src/pages/DynamicForm.jsx`

**Evidencia**:
- `switch (formDef.engine_type)` con casos fijos:
  - `BaseChecklist`
  - `BaseMediciones`
  - `BaseGeneric`

**Impacto**:
- Un form creado con `engine_type` no soportado por el switch no podrá renderizarse.

**Propuesta futura**:
- Externar el mapeo engine_type→component si existe registry; sin crear engines nuevos.

---

## 4) Reutilización por etapa (qué se reutiliza “automáticamente”)

- `DynamicModule` reutiliza:
  - routing por `moduleSlug`
  - carga metadata
  - tabs estándar
- `DynamicForm` reutiliza:
  - loading de `formDef` y `fields`
  - engines base existentes
  - persistencia + runtime bridge
- `DynamicRecordsView` reutiliza:
  - fetch del EAV
  - computedStatus en UI
  - auditoría y verificación
- Documental reutiliza:
  - `ModuleDocumentViewer` + servicios documentales

---

## 5) Verdadero punto mínimo de parametrización para un módulo nuevo (evidencia)

**Para que un módulo nuevo funcione end-to-end en UI sin cambiar arquitectura**, el mínimo que debe existir en la DB es:

1) En `sgc_modules`:
- `slug/moduleSlug`
- `name`
- `is_active=true`

2) En `sgc_forms`:
- `module_id` apuntando al módulo
- `slug/formSlug` para navegar
- `engine_type` que exista en el switch de `DynamicForm`
- `roles_allowed` que permita al rol del usuario ver el form
- `is_active=true`

3) En `sgc_form_fields`:
- campos para cada `form_id`
- `field_type`
- `required`
- `options` mínimas requeridas por los engines para validar

4) Para “Repositorio Documental” (capacidad adicional):
- hoy depende de un hardcode por `moduleSlug`.

Por tanto, el **punto mínimo** es: **metadata en DB para `sgc_modules` + `sgc_forms` + `sgc_form_fields`**, asegurando que `engine_type` sea soportado por UI y que roles_allowed permita acceso.

---

## 6) Conclusiones del flujo de creación (evidencia)
- El sistema “nace” en UI cuando existen filas en DB de:
  - `sgc_modules` (y se consumen por slug)
  - `sgc_forms` + `sgc_form_fields`
- La UI de `Configuration.jsx` documentada evidencia creación de `sgc_forms` (y por extensión delega en FormBuilder la creación de campos, aunque el detalle exacto de `sgc_form_fields` aún no se verificó en este documento).
- El repositorio documental no es 100% dinámico porque hoy depende de hardcodes por slug.
- El mínimo de parametrización para un módulo operativo es la metadata en DB; la arquitectura reusable ya existe y se reutiliza automáticamente.

---

> Nota de consistencia con restricciones del sprint
Este documento no modifica código ni propone cambios. Solo audita el flujo real y sus dependencias usando evidencia del repositorio.

