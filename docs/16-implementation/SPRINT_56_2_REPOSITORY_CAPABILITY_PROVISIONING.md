# SPRINT 56.2 — Repository Capability Provisioning (Data Configuration)

> **Tipo:** Data Configuration / Capability Enablement
>
> **Nivel esperado:** LEVEL 3 — OPERATIONAL CONFIGURATION
>
> **Estado esperado:** REPOSITORY CAPABILITY PROVISIONED

---

## 1. Objetivo

Provisionar correctamente la **capacidad Document Repository** para los módulos que, tras el Sprint 56.1, carecen de configuración documental en la fuente oficial:

- `sgc_document_repositories`
- `sgc_document_repository_categories`

El objetivo es que la disponibilidad documental vuelva a estar gobernada exclusivamente por datos:

Module
   |
   ↓
Repository Configuration
   |
   ↓
Categories
   |
   ↓
Documents

**Restricción:** no introducir hardcodes ni lógica condicional por módulo en frontend.

---

## 2. Diagnóstico (evidencia de Sprint 56.1)

Sprint 56.1 confirmó la ausencia de filas en `sgc_document_repositories` para los siguientes módulos:

- `calidad`
- `medicion-control`
- `gestion-documental`
- `configuracion`
- `trazabilidad`

Y que sí existen repositorios para:

- `mantenimiento`
- `operaciones`

Además:
- `documentsService.getRecords()` utiliza **`sgc_records`** como tabla fuente de “documents”.

---

## 3. Alcance

Este Sprint **NO** modifica:

- React
- `DynamicModule.jsx`
- `DynamicForm.jsx`
- `Traceability.jsx`
- `CapabilityDiscovery`
- `CapabilityRegistry`
- Resolver/Composition/Runtime/Contracts
- Services (código)
- UX

Este Sprint **SOLO** provisiona datos en:

- `sgc_document_repositories`
- `sgc_document_repository_categories`

---

## 4. Modelo de datos utilizado (tablas existentes)

### 4.1 `sgc_document_repositories`

- `id`
- `slug`
- `name`
- `description`
- `module_slug`
- `icon_key`
- `is_active` (boolean)

### 4.2 `sgc_document_repository_categories`

- `id`
- `repository_id`
- `category_key`
- `name`
- `description`
- `icon_key`
- `sort_order`
- `is_active`

---

## 5. Lista de repositorios a provisionar

Slugs (exactos) `module_slug` a crear (is_active=true):

1) `calidad`
2) `medicion-control`
3) `gestion-documental`
4) `configuracion`
5) `trazabilidad`

---

## 6. Estrategia SQL (idempotente y FK-friendly)

- Se usa `INSERT ... WHERE NOT EXISTS` para evitar duplicados.
- Las categorías se crean después, resolviendo `repository_id` por `module_slug`.
- Se asume que no hay constraints adicionales fuera de FK existentes (si existen triggers/not null estrictos, ajustar icon_key/description/category_key).

> Importante: en caso de que `category_key` tenga restricción única por repository, este SQL usa claves determinísticas por módulo para mantener idempotencia.

---

## 7. SQL de provisioning (listo para ejecutar manualmente en Supabase)

> Ejecútalo en este orden.

### 7.1 Repositorios

```sql
-- SPRINT 56.2: provision repositories (idempotent)

-- 1) calidad
INSERT INTO sgc_document_repositories (
  slug, name, description, module_slug, icon_key, is_active
)
SELECT
  'repos-calidad',
  'Repositorio Documental Calidad',
  'Repositorio documental para módulo Calidad.',
  'calidad',
  'file-text',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM sgc_document_repositories r WHERE r.module_slug = 'calidad'
);

-- 2) medicion-control
INSERT INTO sgc_document_repositories (
  slug, name, description, module_slug, icon_key, is_active
)
SELECT
  'repos-medicion-control',
  'Repositorio Documental Medición y Control',
  'Repositorio documental para módulo Medición y Control.',
  'medicion-control',
  'file-text',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM sgc_document_repositories r WHERE r.module_slug = 'medicion-control'
);

-- 3) gestion-documental
INSERT INTO sgc_document_repositories (
  slug, name, description, module_slug, icon_key, is_active
)
SELECT
  'repos-gestion-documental',
  'Repositorio Documental Gestión Documental',
  'Repositorio documental para módulo Gestión Documental.',
  'gestion-documental',
  'file-text',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM sgc_document_repositories r WHERE r.module_slug = 'gestion-documental'
);

-- 4) configuracion
INSERT INTO sgc_document_repositories (
  slug, name, description, module_slug, icon_key, is_active
)
SELECT
  'repos-configuracion',
  'Repositorio Documental Configuración',
  'Repositorio documental para módulo Configuración.',
  'configuracion',
  'file-text',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM sgc_document_repositories r WHERE r.module_slug = 'configuracion'
);

-- 5) trazabilidad
INSERT INTO sgc_document_repositories (
  slug, name, description, module_slug, icon_key, is_active
)
SELECT
  'repos-trazabilidad',
  'Repositorio Documental Trazabilidad',
  'Repositorio documental para módulo Trazabilidad.',
  'trazabilidad',
  'file-text',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM sgc_document_repositories r WHERE r.module_slug = 'trazabilidad'
);
```

### 7.2 Categorías iniciales (determinísticas)

```sql
-- SPRINT 56.2: provision categories for each repository (idempotent)

-- Helper: se asume category_key única por repository.

-- calidad
INSERT INTO sgc_document_repository_categories (
  repository_id, category_key, name, description, icon_key, sort_order, is_active
)
SELECT
  r.id,
  c.category_key,
  c.name,
  c.description,
  'file-text',
  c.sort_order,
  true
FROM sgc_document_repositories r
JOIN (
  VALUES
    ('procedimientos', 'Procedimientos', 'Documentación de procedimientos', 1),
    ('formatos', 'Formatos', 'Formatos y plantillas', 2),
    ('registros', 'Registros', 'Registros del sistema', 3),
    ('evidencias', 'Evidencias', 'Evidencias y soportes', 4),
    ('certificados', 'Certificados', 'Certificados y cumplimiento', 5)
) AS c(category_key, name, description, sort_order)
  ON r.module_slug = 'calidad'
WHERE NOT EXISTS (
  SELECT 1
  FROM sgc_document_repository_categories cat
  WHERE cat.repository_id = r.id
    AND cat.category_key = c.category_key
);

-- medicion-control
INSERT INTO sgc_document_repository_categories (
  repository_id, category_key, name, description, icon_key, sort_order, is_active
)
SELECT
  r.id,
  c.category_key,
  c.name,
  c.description,
  'file-text',
  c.sort_order,
  true
FROM sgc_document_repositories r
JOIN (
  VALUES
    ('indicadores', 'Indicadores', 'Indicadores de medición', 1),
    ('auditorias', 'Auditorías', 'Auditorías e inspecciones', 2),
    ('mediciones', 'Mediciones', 'Resultados de medición', 3),
    ('reportes', 'Reportes', 'Reportes y análisis', 4)
) AS c(category_key, name, description, sort_order)
  ON r.module_slug = 'medicion-control'
WHERE NOT EXISTS (
  SELECT 1
  FROM sgc_document_repository_categories cat
  WHERE cat.repository_id = r.id
    AND cat.category_key = c.category_key
);

-- gestion-documental
INSERT INTO sgc_document_repository_categories (
  repository_id, category_key, name, description, icon_key, sort_order, is_active
)
SELECT
  r.id,
  c.category_key,
  c.name,
  c.description,
  'file-text',
  c.sort_order,
  true
FROM sgc_document_repositories r
JOIN (
  VALUES
    ('manuales', 'Manuales', 'Manuales y directrices', 1),
    ('procedimientos', 'Procedimientos', 'Procedimientos documentados', 2),
    ('formatos', 'Formatos', 'Formatos y formularios', 3),
    ('versiones', 'Versiones', 'Control de versiones', 4)
) AS c(category_key, name, description, sort_order)
  ON r.module_slug = 'gestion-documental'
WHERE NOT EXISTS (
  SELECT 1
  FROM sgc_document_repository_categories cat
  WHERE cat.repository_id = r.id
    AND cat.category_key = c.category_key
);

-- configuracion
INSERT INTO sgc_document_repository_categories (
  repository_id, category_key, name, description, icon_key, sort_order, is_active
)
SELECT
  r.id,
  c.category_key,
  c.name,
  c.description,
  'file-text',
  c.sort_order,
  true
FROM sgc_document_repositories r
JOIN (
  VALUES
    ('parametros', 'Parámetros', 'Parámetros de configuración', 1),
    ('catalogos', 'Catálogos', 'Catálogos y referencias', 2),
    ('plantillas', 'Plantillas', 'Plantillas y documentos base', 3)
) AS c(category_key, name, description, sort_order)
  ON r.module_slug = 'configuracion'
WHERE NOT EXISTS (
  SELECT 1
  FROM sgc_document_repository_categories cat
  WHERE cat.repository_id = r.id
    AND cat.category_key = c.category_key
);

-- trazabilidad
INSERT INTO sgc_document_repository_categories (
  repository_id, category_key, name, description, icon_key, sort_order, is_active
)
SELECT
  r.id,
  c.category_key,
  c.name,
  c.description,
  'file-text',
  c.sort_order,
  true
FROM sgc_document_repositories r
JOIN (
  VALUES
    ('certificados', 'Certificados', 'Certificados asociados a trazabilidad', 1),
    ('evidencias', 'Evidencias', 'Evidencias y soportes de despacho', 2),
    ('soportes', 'Soportes', 'Soportes documentales de trazabilidad', 3)
) AS c(category_key, name, description, sort_order)
  ON r.module_slug = 'trazabilidad'
WHERE NOT EXISTS (
  SELECT 1
  FROM sgc_document_repository_categories cat
  WHERE cat.repository_id = r.id
    AND cat.category_key = c.category_key
);
```

---

## 8. Repositorios creados (esperado)

Se espera crear (si no existían previamente) **5** repositorios con `is_active=true`:

- repos-calidad (calidad)
- repos-medicion-control (medicion-control)
- repos-gestion-documental (gestion-documental)
- repos-configuracion (configuracion)
- repos-trazabilidad (trazabilidad)

---

## 9. Categorías iniciales creadas (esperado)

- calidad: 5 categorías
- medicion-control: 4 categorías
- gestion-documental: 4 categorías
- configuracion: 3 categorías
- trazabilidad: 3 categorías

---

## 10. Evidencia esperada después de la ejecución

Después de ejecutar el SQL, la evidencia mínima requerida:

1) Repositorios:
- `sgc_document_repositories` contiene `module_slug` de los 5 módulos
- `is_active = true`

2) Categorías:
- `sgc_document_repository_categories.repository_id` existe para cada repositorio
- `category_key` coincide con el set determinístico del SQL
- `is_active = true`

3) Integridad con la UI:
- `documentRepositoriesService.getRepositories({ moduleSlug })` retorna filas
- `ModuleDocumentViewer` muestra panel de repositorios y carga categorías
- `documentsService.getRecords(moduleSlug, category_key)` no falla (aunque puede iniciar en 0 documentos)

---

## 11. Validación funcional

Validar manualmente (UI administrativa existente):

### Caso 1 — Calidad
- DynamicModule (módulo `calidad`)
  → pestaña/área Repositorio Documental
  → ModuleDocumentViewer muestra repositorio
  → categorías visibles

### Caso 2 — Medición y Control
- repositorio habilitado
- categorías visibles

### Caso 3 — Gestión Documental
- repositorio habilitado
- categorías visibles

> Para Configuración y Trazabilidad:
- repetir validación mínima (repositorio habilitado y categorías visibles).

---

## 12. Criterios de aceptación (obligatorios)

Sprint cerrado cuando:

✅ Los módulos definidos tienen repositorio configurado en `sgc_document_repositories`.

✅ `documentRepositoriesService.getRepositories()` retorna datos para esos slugs.

✅ `ModuleDocumentViewer` funciona sin cambios.

✅ La capacidad documental depende exclusivamente de configuración (datos).

✅ No existe regresión en la capa Capability (Discovery/Registry/Resolver) por este provisioning.

---

## 13. Fecha de provisioning

- **Pendiente de completar** (registrar fecha real de ejecución del SQL en Supabase).

---

# FIN

