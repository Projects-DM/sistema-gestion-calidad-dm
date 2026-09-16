# SPRINT 56.1 — Repository Data Evidence Collection & Root Cause Determination

> **Tipo:** Auditoría funcional (solo lectura / evidencia)
>
> **Estado esperado:** ROOT CAUSE IDENTIFIED

---

## 1) Alcance y cadena verificada

Cadena funcional usada por la UI Documental (sin cambios de código):

- **Módulo** (`moduleSlug`) 
- → `ModuleDocumentViewer` 
- → `documentRepositoriesService.getRepositories({ moduleSlug })`
- → `repositoriesForUI` (filtro `r.is_active !== false`)
- → `documentRepositoriesService.getCategories(activeRepositoryId)`
- → `documentsService.getRecords(moduleSlug, c.category_key)`

---

## 2) Fuente oficial de “documents”

Evidencia (servicio): `src/services/documentsService.js`

- `documentsService.getRecords(module, type)` consulta:
  - tabla: **`sgc_records`**
  - filtro por:
    - `.eq('module', module)`
    - opcionalmente `.eq('type', type)`

**Conclusión:** en esta auditoría, “Documentos” = registros en **`sgc_records`**.

---

## 3) Evidencia real recolectada (Supabase SQL Editor)

### 3.1 `sgc_modules`

Evidencia (slugs):

- Calidad → `calidad`
- Configuración → `configuracion`
- Gestión Documental → `gestion-documental`
- Mantenimiento → `mantenimiento`
- Medición y Control → `medicion-control`
- Operaciones → `operaciones`
- Trazabilidad → `trazabilidad`

---

### 3.2 `sgc_document_repositories`

Evidencia observada:

- Existen repositorios **solo** para:
  - `mantenimiento`
  - `operaciones`
- Para los módulos restantes **no se encontraron repositorios** en la evidencia compartida:
  - `calidad`
  - `medicion-control`
  - `gestion-documental`
  - `configuracion`
  - `trazabilidad`

Estado `is_active`:
- Todos los repositorios observados tienen `is_active = true`.

---

### 3.3 `sgc_document_repository_categories`

Evidencia observada:
- Repositorios de:
  - `mantenimiento` con categorías activas:
    - `productos_quimicos`
    - `materia_prima`
    - `material_empaque`
    - `insumos`

---

## 4) Verificación de integridad de `module_slug` (resultado)

Comparación requerida:

- Origen: `sgc_modules.slug`
- Contra: `sgc_document_repositories.module_slug`

Resultado (con la evidencia compartida):
- Para los módulos con repositorio, el `module_slug` coincide exactamente.
- Para los módulos sin repositorio, **no hay coincidencia porque no existe fila en `sgc_document_repositories`**.

---

## 5) Matriz final (derivada de evidencia disponible)

> Nota: “Categorías” y “Documentos” no fueron contados para todos los módulos porque el hallazgo principal es la inexistencia del repositorio para esos módulos.

| Módulo | slug módulo | Repository existe | module_slug correcto | Activo | Categorías | Documentos | Estado |
|---|---|---|---|---|---|---|---|
| Configuración | configuracion | No | — | — | 0/pendiente | 0/pendiente | Sin repositorio |
| Calidad | calidad | No | — | — | 0/pendiente | 0/pendiente | Sin repositorio |
| Medición y Control | medicion-control | No | — | — | 0/pendiente | 0/pendiente | Sin repositorio |
| Gestión Documental | gestion-documental | No | — | — | 0/pendiente | 0/pendiente | Sin repositorio |
| Operaciones | operaciones | Sí | operaciones | true | >0 (observado) | 0/pendiente | OK (según evidencia) |
| Mantenimiento | mantenimiento | Sí | mantenimiento | true | >0 (observado) | 0/pendiente | OK (según evidencia) |
| Trazabilidad | trazabilidad | No | — | — | 0/pendiente | 0/pendiente | Sin repositorio |

---

## 6) Dictamen final (obligatorio)

### **ROOT CAUSE FOUND** ✅

**Causa raíz identificada:**

Los módulos donde falla la visualización del Repositorio Documental (según el criterio del equipo) **no tienen repositorio documental configurado** en **`sgc_document_repositories`**.

Por tanto:
- `ModuleDocumentViewer` al ejecutar `getRepositories({ moduleSlug })` retorna lista vacía.
- `repositoriesForUI` queda vacía (no hay filas que filtrar por `is_active`).
- No existe `activeRepositoryId`, por lo que no se cargan categorías ni documentos desde `sgc_records`.

**No es un problema introducido por Sprint 56 (Capability Discovery)** porque esa migración no afecta:
- `moduleSlug`
- `documentRepositoriesService.getRepositories`
- consultas de repositorios/categorías/documentos

---

## 7) Caminos posteriores (no implementados)

- **Corrección de datos** (administrativa): crear/activar repositorios documentales faltantes para los módulos.
- Si tras configurar repositorios persiste discrepancia en UI, entonces se abriría un sprint correctivo de capa funcional (pero el root cause actual ya es de datos).

---

# FIN

