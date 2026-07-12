# SPRINT 56.2R — Repository Capability Provisioning Review & Architectural Refinement

> **Tipo:** Refinamiento arquitectónico (solo revisión documental)
>
> **Restricción:** NO ejecutar cambios; NO ejecutar SQL; NO modificar código.

---

## 0) Diagnóstico de entrada (evidencia Sprint 56.1)

Sprint 56.1 identificó **ausencia de repositorios** en `sgc_document_repositories` para los módulos:

- `calidad`
- `medicion-control`
- `gestion-documental`
- `configuracion`
- `trazabilidad`

Mientras que existen repositorios para:

- `mantenimiento`
- `operaciones`

---

## 1) Validación del modelo actual de repositorios (confirmación requerida)

### 1.1 Limitación de evidencia en este entorno
En esta sesión no dispongo de un “schema introspection” real (DESCRIBE / information_schema) para validar:
- columnas reales exactas
- NOT NULL
- FK
- índices
- unicidad

Por tanto, esta revisión se fundamenta en evidencia ya presente en el código del frontend/servicios y en los nombres de columnas usados por los servicios.

### 1.2 Evidencia de columnas por uso en servicios
Evidencia de `src/services/documentRepositoriesService.js`:

- `sgc_document_repositories` usa al menos:
  - `slug`
  - `name`
  - `description`
  - `module_slug`
  - `icon_key`
  - `is_active`

- `sgc_document_repository_categories` usa al menos:
  - `repository_id`
  - `category_key`
  - `name`
  - `description`
  - `icon_key`
  - `sort_order`
  - `is_active`

**Convención de significado (derivada del código):**
- `module_slug` es el “join key” entre el módulo y el repositorio documental.
- `slug` identifica el repositorio (uso UI) y `icon_key` alimenta la visualización.

> Requisito operacional para el siguiente paso (antes del provisioning real): ejecutar `SELECT` en `pg_catalog`/`information_schema` o “table schema” en Supabase para confirmar constraints.

---

## 2) Cardinalidad del modelo

### Evidencia funcional
`src/modules/documentViewer/ModuleDocumentViewer.jsx` (loadRepositories):

- Llama `documentRepositoriesService.getRepositories({ moduleSlug })`
- Luego hace:
  - `const first = repos?.[0]?.id ?? null;`
  - `setActiveRepositoryId(first)`

**Conclusión (contrato temporal):**
- Opción A no está garantizada por el código; la UI soporta potencialmente múltiples repositorios, pero **selecciona el primero** como activo.

Formalmente:
- **Soporte UI:** `1 módulo → N repositorios (N>=0)`, con UX que activa `repos[0]`.

Por ello, el provisioning debe mantener la convención:
- si hoy el objetivo es solo habilitar UI, se debe crear **al menos 1** repositorio por módulo.
- evitar crear múltiples repositorios por módulo sin control, para no introducir ambigüedad de cuál será `repos[0]`.

---

## 3) Matriz de decisión por módulo (revisión de Sprint 56.2)

> La regla: “No crear repositorios solamente para que aparezcan en UI”.
>
> Basado en el contrato funcional esperado del sistema (repositorio documental es parte del estándar de gestión documental para esos dominios) y en el alcance de la UI existente.

| Módulo | slug | ¿Debe tener repositorio? | Justificación |
|---|---|---|---|
| Calidad | calidad | **PROVISIONAR** | El dominio Calidad requiere gestión documental para procedimientos, formatos, registros, evidencias y certificados. Sin repositorio, el flujo documental estándar del módulo queda vacío. |
| Medición y Control | medicion-control | **PROVISIONAR** | El dominio maneja evidencia de mediciones/auditorías y reportes; el repositorio documental provee el contenedor estándar para estos artefactos. |
| Gestión Documental | gestion-documental | **PROVISIONAR** | Este módulo es dueño natural del ciclo documental (manuales, procedimientos, formatos, versiones). Un repositorio es coherente con su responsabilidad. |
| Trazabilidad | trazabilidad | **PROVISIONAR** | Trazabilidad requiere soportes/certificados asociados al rastreo (coherente con la UI y con el patrón documental). |
| Configuración | configuracion | **POSTERGAR** (recomendación) | `configuracion` administra metadata/capacidades/parámetros internos. **No está confirmado** que el repositorio documental sea un contenedor de valor de negocio para este módulo (riesgo de llenar UI con documentos “no naturales”). |

---

## 4) Revisión especial: Configuración (`configuracion`)

### Decisión recomendada
- **NO PROVISIONAR (POSTERGAR)** en este sprint.

### Justificación
1) Riesgo de crear “capacidad documental” para un dominio que podría no requerir contenedor documental (posible drift de ownership Core/Business).
2) Sin evidencia de negocio (p.ej. documentos reales que deban gestionarse desde el repositorio) el provisioning podría generar deuda operacional.

### Criterio para reintento posterior
Provisionar `configuracion` únicamente si:
- existe requerimiento explícito de documentos/plantillas/soportes gestionados allí,
- o si los repositorios de `gestion-documental` y/o `calidad` no cubren el caso de uso y se requiere contenedor separado.

---

## 5) Revisión de categorías iniciales

### Regla de coherencia
Las categorías propuestas deben corresponder al set de documentos esperados en `documentsService.getRecords(module, type)`.

Evidencia: el UI de repositorio renderiza categorías y usa `category_key` para consultar `sgc_records.type`.

### Calidad (coherente)
- `procedimientos`
- `formatos`
- `registros`
- `evidencias`
- `certificados`

### Medición y Control (coherente)
- `indicadores`
- `auditorias`
- `mediciones`
- `reportes`

### Gestión Documental (coherente)
- `manuales`
- `procedimientos`
- `formatos`
- `versiones`

### Trazabilidad (coherente)
- `certificados`
- `evidencias`
- `soportes`

### Configuración
- Si se postergara, sus categorías no aplican.

---

## 6) Modelo definitivo para provisioning (resultado refinado)

### Repositorios a crear en el provisioning real posterior

- `calidad`
- `medicion-control`
- `gestion-documental`
- `trazabilidad`

### Repositorio a postergar

- `configuracion`

---

## 7) Riesgos

1) **Ambigüedad por cardinalidad**
- Si se crean múltiples repositorios por módulo, el UI usa `repos[0]` como repositorio activo.

2) **Constraints no validadas**
- Sin introspección del schema, el SQL debe ajustarse si existen NOT NULL/FK/unique constraints adicionales.

3) **Category_key vs tipo en documentos**
- Si `sgc_records.type` no usa exactamente esos valores, puede existir repositorio/categorías pero 0 documentos.

Mitigación:
- ejecutar inmediatamente validaciones `SELECT` sobre `sgc_records` para confirmar que `type` coincide con `category_key` (cuando existan documentos).

---

## 8) Criterios de aceptación (para cerrar Sprint 56.2.R)

SPRINT 56.2.R queda cerrado cuando:

- Se define explícitamente qué módulos se provisionan y cuáles se postergan.
- Se fija la cardinalidad soportada por la UI (N repos por módulo pero activa repos[0]).
- Se deja listo un SQL de provisioning que sea idempotente y no introduzca hardcodes.
- Se documenta el riesgo de `configuracion` y el motivo de su postergación.

---

## 9) SQL esperado (solo diseño)

Se mantiene el SQL idempotente propuesto, con el ajuste:

- **Excluir** el bloque de repositorio/categorías para `module_slug='configuracion'`.
- Mantener el resto determinístico e idempotente.

---

## 10) Evidencia necesaria para el cierre de Sprint 56.2 (posterior)

Para los módulos provisionados en el sprint de ejecución:

1) `sgc_document_repositories` contiene una fila por módulo con `is_active=true`.
2) `sgc_document_repository_categories` contiene categorías con `category_key` esperado.
3) UI `ModuleDocumentViewer` muestra repositorio/categorías sin error.

---

# FIN

