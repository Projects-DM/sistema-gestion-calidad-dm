# SPRINT 43.3 — Configuración Administrativa del Motor Documental Dinámico

> **Tipo:** Auditoría técnica + especificación de implementación (sin ejecutar en este documento cambios en código).
> **Restricciones respetadas:** `DocumentManager.jsx`, `documentsService.js`, `sgc_records`, Supabase Storage, `Certificates.jsx` y `TechnicalSheets.jsx` **no se modifican** en Sprint 43.3.

---

## 1) Objetivo del Sprint
Implementar la **capa administrativa** del nuevo Motor Documental Dinámico en el panel **Configuración del Sistema**, permitiendo a un usuario admin crear y gestionar:

- **Repositorios documentales** (`sgc_document_repositories`)
- **Categorías por repositorio** (`sgc_document_repository_categories`)

Este sprint **NO renderiza** repositorios en módulos operativos; solo prepara la configuración para el Sprint 43.4.

---

## 2) Arquitectura propuesta

### 2.1 Flujo
1. UI “Configuración” carga datos desde un servicio.
2. CRUD de repositorios y categorías opera sobre tablas:
   - `sgc_document_repositories`
   - `sgc_document_repository_categories`
3. No se toca el motor de renderizado operativo (`DocumentManager.jsx`).

### 2.2 Servicios
Se crea la capa dedicada:
- `src/services/documentRepositoriesService.js`

Responsabilidades:
- `getRepositories()`
- `createRepository(payload)`
- `updateRepository(repositoryId, payload)`
- `deleteRepository(repositoryId)`
- `getCategories(repositoryId)`
- `createCategory(repositoryId, payload)`
- `updateCategory(categoryId, payload)`
- `deleteCategory(categoryId)`
- `reorderCategories({ repositoryId, orderedCategoryIds })`

Desacoplamiento:
- Igual enfoque conceptual a `dynamicService.js` (servicio como fachada) para permitir futuro reemplazo de backend.

---

## 3) Integración en UI (Configuration)

### 3.1 Requisito UX
- Integrar como una tab en `src/pages/Configuration.jsx`.
- Mantener estilos y jerarquía visual similar a la tab “Formularios Dinámicos”.

### 3.2 Componentes UI
Se agrega un componente administrativo:
- `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx`

Incluye:
- Vista de repositorios con CRUD.
- Vista de categorías del repositorio seleccionado con CRUD.
- Reordenamiento por **Subir/Bajar** actualizando `sort_order`.
- Validaciones básicas (no vacíos) y restricciones de iconos mediante whitelist.

---

## 4) Compatibilidad con el sistema actual

### 4.1 Sin afectar módulos operativos
- `DocumentManager.jsx` seguirá agrupando por `sgc_records.type`.
- Las nuevas tablas solo alimentan el catálogo de repositorios/categorías.

### 4.2 Contrato obligatorio
- `sgc_document_repositories.module_slug` → `sgc_records.module`
- `sgc_document_repository_categories.category_key` → `sgc_records.type`

---

## 5) Iconos (whitelist)
- Para asegurar estabilidad UI y evitar errores por claves inválidas, se implementa whitelist de iconos permitidos.
- El campo `icon_key` se guarda como string en DB, pero la UI lo limita a claves soportadas.

---

## 6) Reordenar categorías (sort_order)
- Implementación por actualización incremental de `sort_order` según el nuevo orden.
- Mantener la lista ordenada al render de categorías.

---

## 7) Riesgos técnicos

1. **RLS/Permisos**
   - Si RLS no permite CRUD sobre las nuevas tablas, la UI fallará.
2. **Consistencia sort_order**
   - Reordenar por subidas/bajadas debe mantener índices correctos.
3. **Whitelisting de iconos**
   - Si se amplía la whitelist en el futuro, se debe mantener compatibilidad con valores existentes en DB.

---

## 8) Verificación obligatoria (post-implementación)
1. Crear un repositorio de prueba.
2. Crear categorías para ese repositorio.
3. Confirmar persistencia en las 2 tablas.
4. Confirmar que Formularios Dinámicos siguen funcionando.
5. Confirmar que Trazabilidad → Certificados/Fichas siguen funcionando.

---

## 9) Qué se pospone para Sprint 43.4
- Resolver qué repositorio/categorías se renderizan en módulos operativos.
- Integración dinámica real con `DocumentManager.jsx` sin hardcodes.

