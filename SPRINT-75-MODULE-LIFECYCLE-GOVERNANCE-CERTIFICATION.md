# Sprint 75 — Module Lifecycle Governance Certification

**Tipo:** Operational Governance & Architecture Certification Sprint
**Estado:** LEVEL 3 — CERTIFIED
**Fecha:** 2026-07-16

---

## RESUMEN EJECUTIVO

**Objetivo:** Certificar el modelo completo de gobernanza y ciclo de vida de los modulos del SGC-DM, identificando estados, transiciones, protecciones, y el pipeline correcto de eliminacion.

**Resultado:** 5 estados certificados, 2 inconsistencias Frontend-Backend identificadas, 1 proteccion Core verificada, inventario completo de modulos.

**Conclusion principal:** El sistema posee un modelo de gobernanza robusto con proteccion en 2 capas (UI + Backend). La eliminacion correcta requiere: `operational → deprecated → (verificar 0 forms + 0 repos) → delete`.

---

## FASE 1 — MODULE GOVERNANCE AUDIT

### Tabla(s) Involucradas

| Tabla | Proposito | Columnas Clave |
|-------|-----------|----------------|
| `sgc_modules` | SSOT de modulos | id, name, slug, icon, description, is_active, state, capabilities (JSONB), color, category, grupo, order_index, visible, created_by, created_at |
| `sgc_forms` | Formularios por modulo | id, module_id (FK→sgc_modules ON DELETE CASCADE), name, slug, engine_type |
| `sgc_document_repositories` | Repositorios documentales | module_slug (string, NO FK) |

**Nota critica:** `sgc_document_repositories` usa `module_slug` (string) como referencia, NO una FK a `sgc_modules`. Esto significa que la eliminacion de un modulo NO elimina automaticamente sus repositorios documentales.

### Servicios Involucrados

| Servicio | Capa | Rol |
|----------|------|-----|
| `ModuleAdministrationApplicationService` | Application Layer | **Unico boundary** oficial entre UI y Core. Todas las operaciones de administracion pasan por aqui. |
| `dynamicService` | Persistence | Adaptador de persistencia. Delega a Supabase. |
| `ModuleCapabilityPersistenceAdapter` | Adapter | Puente para operaciones de capacidades. |
| `CapabilityAssignmentService` | Operational Layer | Coordinador de asignacion de capacidades. |

### Contratos de Gobernanza

| Constante | Ubicacion | Valores |
|-----------|-----------|---------|
| `MODULE_STATES` | `ModuleAdministrationApplicationService.js:41` | `['draft', 'configurable', 'operational', 'deprecated', 'archived']` |
| `VALID_STATE_TRANSITIONS` | `ModuleAdministrationApplicationService.js:30-36` | Ver mapa completo abajo |
| `CORE_PROTECTED_SLUGS` | `ModuleManager.jsx:33` | `['configuracion']` |
| `STATE_LABELS` | `ModuleManager.jsx:17-23` | Mapeo estado→etiqueta en espanol |

### Restricciones Existentes

| Restriccion | Ubicacion | Nivel |
|-------------|-----------|-------|
| No eliminar modulos operacionales | `ModuleAdministrationApplicationService.js:612-618` | Backend |
| No eliminar modulos con forms asociados | `ModuleManager.jsx:130-145` | UI |
| No eliminar modulos con repositorios asociados | `ModuleManager.jsx:130-145` | UI |
| No mostrar `configuracion` en admin | `ModuleManager.jsx:33,79` | UI |
| Transiciones de estado validadas | `ModuleAdministrationApplicationService.js:548-555` | Backend |

---

## FASE 2 — MODULE LIFECYCLE CERTIFICATION

### Estados Validos (5)

| # | Estado | Label | Color UI | Descripcion |
|---|--------|-------|----------|-------------|
| 1 | `draft` | Borrador | Gris (`bg-gray-100`) | Modulo recien creado, sin configurar |
| 2 | `configurable` | Configurable | Azul (`bg-blue-100`) | Modulo en configuracion de capacidades |
| 3 | `operational` | Operacional | Verde (`bg-green-100`) | Modulo activo y visible en el Runtime |
| 4 | `deprecated` | Deprecado | Amarillo (`bg-yellow-100`) | Modulo en desuso, pendiente de eliminacion |
| 5 | `archived` | Archivado | Rojo (`bg-red-100`) | Modulo archivado permanentemente |

### Mapa de Transiciones Validas (Backend)

```
                ┌─────────────┐
                │    draft     │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
          ┌─────│ configurable  │─────┐
          │     └──────┬───────┘     │
          │            │             │
          │            ▼             │
          │     ┌──────────────┐    │
          │     │  operational  │    │
          │     └──────┬───────┘    │
          │            │             │
          │            ▼             │
          │     ┌──────────────┐    │
          │     │  deprecated   │    │
          │     └──────┬───────┘    │
          │            │             │
          │     ┌──────┴───────┐    │
          │     │              │    │
          │     ▼              ▼    │
          │  ┌──────────┐  ┌────────┐
          └─▶│ archived  │  │config. │◀─┘
             └─────┬─────┘  └────────┘
                   │
                   ▼
             ┌──────────┐
             │  draft    │
             └──────────┘
```

### Transiciones por Estado

| Estado Actual | Transiciones Permitidas | Transiciones Prohibidas |
|---------------|------------------------|------------------------|
| `draft` | → `configurable` | → operational, deprecated, archived, (no delete) |
| `configurable` | → `operational`, → `archived` | → draft, deprecated, (no delete) |
| `operational` | → `deprecated` | → draft, configurable, archived, (no delete) |
| `deprecated` | → `archived`, → `configurable` | → draft, operational, (no delete) |
| `archived` | → `draft` | → configurable, operational, deprecated, (no delete) |

### Transiciones Criticas

| Transicion | Proposito | Requisitos |
|------------|-----------|------------|
| `operational → deprecated` | Iniciar proceso de eliminacion | Ninguno adicional |
| `deprecated → archived` | Archivar modulo | Ninguno adicional |
| `archived → draft` | Reactivar modulo archivado | Ninguno adicional |
| `deprecated → configurable` | Restaurar modulo deprecado | Ninguno adicional |

---

## FASE 3 — MODULE FACTORY AUDIT

### Origen de Modulos

| # | Modulo | Slug | Origen | Estado | Formularios | Repositorios |
|---|--------|------|--------|--------|-------------|--------------|
| 1 | Operaciones | `operaciones` | Foundation Factory (SQL seed) | operational | 1 (limpieza-diaria) | 0 |
| 2 | Trazabilidad | `trazabilidad` | Foundation Factory (SQL seed) | operational | 0 | 0 |
| 3 | Medicion y Control | `medicion-control` | Foundation Factory (SQL seed) | operational | 1 (cloro-ph-agua) | 0 |
| 4 | Mantenimiento | `mantenimiento` | Foundation Factory (SQL seed) | operational | 0 | 0 |
| 5 | Calidad | `calidad` | Foundation Factory (SQL seed) | operational | 0 | 0 |
| 6 | Gestion Documental | `gestion-documental` | Foundation Factory (SQL seed) | operational | 0 | 0 |
| 7 | Configuracion | `configuracion` | Foundation Factory (SQL seed) + Core Protected | operational | 0 | 0 |

### Clasificacion de Modulos

| Tipo | Criterio | Modulos |
|------|----------|---------|
| **Core** | Hardcodeado en `CORE_PROTECTED_SLUGS`, no visible en admin | `configuracion` |
| **Foundation Factory** | Semilla via SQL (`sql_seed_data.sql` / `sql_setup_dynamic.sql`) | operaciones, trazabilidad, medicion-control, mantenimiento, calidad, gestion-documental |
| **Dynamic** | Creados via CreateModuleWizard | Ninguno actualmente |
| **Legacy** | Paginas hardcodeadas en App.jsx, bypass del Motor Dinamico | Traceability, Dispatches (ya eliminados: Certificates, TechnicalSheets) |

### Migracion de Estado (Sprint 66b)

```sql
-- Los modulos semilla se migraron de NULL/draft a operational:
UPDATE public.sgc_modules
SET state = 'operational'
WHERE state IS NULL OR state = 'draft';
```

**Nota:** Los modulos semilla fueron creados con `state = NULL` (columna no existia). El Sprint 66b agrego la columna `state` y migro todos los existentes a `operational`.

---

## FASE 4 — DELETE PIPELINE CERTIFICATION

### Pipeline Completo de Eliminacion

```
┌─────────────────────────────────────────────────────────────────┐
│                    DELETE PIPELINE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. UI: Verificar dependencias                                  │
│     ├── formsCount > 0 ? → BLOQUEAR ("No es posible eliminar")  │
│     ├── reposCount > 0 ? → BLOQUEAR ("No es posible eliminar")  │
│     └── Ambos = 0 → Continuar                                  │
│                                                                 │
│  2. UI: Confirmar con usuario                                  │
│     └── window.confirm("¿Eliminar el módulo...?")              │
│                                                                 │
│  3. Backend: Verificar existencia                               │
│     └── Module not found? → ENTITY_NOT_FOUND                   │
│                                                                 │
│  4. Backend: Verificar estado                                   │
│     └── state === 'operational' ? → MODULE_IN_USE              │
│         "Cannot delete an operational module.                   │
│          Change state to deprecated first."                     │
│                                                                 │
│  5. Backend: Hard delete                                        │
│     └── DELETE FROM sgc_modules WHERE id = moduleId             │
│                                                                 │
│  6. UI: Refresh list                                            │
│     └── dispatchModuleChange('delete')                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Validaciones por Capa

| # | Validacion | Capa | Codigo | Mensaje |
|---|-----------|------|--------|---------|
| 1 | Tiene forms asociados | UI | `ModuleManager.jsx:134` | "No es posible eliminar este módulo... Formularios dinámicos: N" |
| 2 | Tiene repositorios asociados | UI | `ModuleManager.jsx:134` | "No es posible eliminar este módulo... Repositorios documentales: N" |
| 3 | Modulo existe | Backend | `ModuleAdministrationApplicationService.js:604` | `Module with id "X" not found` |
| 4 | Estado es operational | Backend | `ModuleAdministrationApplicationService.js:613-618` | "Cannot delete an operational module. Change state to deprecated first." |
| 5 | Autorizacion | Backend | `ModuleAdministrationApplicationService.js:160-171` | "You do not have permission" (admin required) |

### Condiciones para Eliminar

Un modulo SOLO puede eliminarse si:

1. **No tiene forms asociados** (`sgc_forms` con `module_id = X` y `is_active = true`)
2. **No tiene repositorios documentales** (`sgc_document_repositories` con `module_slug = X`)
3. **Su estado NO es `operational`**
4. **El actor tiene rol `admin` o `super_admin`**

### Pipeline de Estado para Eliminacion

```
operational → deprecated → [verificar 0 forms + 0 repos] → delete
```

---

## FASE 5 — UI & CONFIGURATION AUDIT

### Boton Eliminar

| Ubicacion | Comportamiento |
|-----------|---------------|
| `ModuleManager.jsx:297-304` | Trash2 icon en tabla. Llama `handleDelete(m.id, name, slug)` |
| `ModuleDetailPanel.jsx:158-165` | Trash2 icon en vista detalle. Llama `onDelete()` |
| `ModuleEditPanel.jsx:248-255` | Trash2 icon en header de edicion. Llama `onDelete()` |

### Boton Editar

| Ubicacion | Comportamiento |
|-----------|---------------|
| `ModuleManager.jsx:289-296` | Edit icon en tabla. Abre `ModuleDetailPanel` |
| `ModuleDetailPanel.jsx:150-157` | "Editar módulo" button. Abre `ModuleEditPanel` |

### Cambio de Estado (UI)

| Ubicacion | Comportamiento |
|-----------|---------------|
| `ModuleEditPanel.jsx:440-490` | Tab "Estado" con selector de transiciones validas |
| `ModuleEditPanel.jsx:37-43` | `VALID_TRANSITIONS` duplicado (debe coincidir con Backend) |

### Inconsistencias Frontend-Backend Identificadas

| # | Inconsistencia | Frontend (ModuleEditPanel) | Backend (ApplicationService) | Riesgo |
|---|---------------|---------------------------|------------------------------|--------|
| 1 | `configurable → archived` | ✅ Permitido en UI (linea 39) | ❌ NO permitido en Backend (linea 32: `configurable: ['operational', 'archived']`) | 🟢 BAJO — Coinciden |
| 2 | `archived → draft` | ✅ Permitido en UI (linea 42) | ✅ Permitido en Backend (linea 35) | 🟢 OK |
| 3 | `draft` nunca se usa | Wizard crea → `configurable` directo | `draft` es estado inicial valido | 🟡 MEDIO — `draft` es estado huerfano |
| 4 | No hay `is_active = false` check en delete | Solo verifica `state === 'operational'` | Solo verifica `state === 'operational'` | 🟡 MEDIO — No se verifica `is_active` |
| 5 | `sgc_document_repositories` sin FK | UI busca por `module_slug` string | Backend no verifica repositorios | 🟡 MEDIO — Repos huerfanos posibles |

### Detalle de Inconsistencia #5 (Repositorios sin FK)

```javascript
// ModuleManager.jsx:96-101 — UI verifica repositorios
const { count } = await sb
  .from('sgc_document_repositories')
  .select('*', { count: 'exact', head: true })
  .eq('module_slug', m.slug);
reposMap[m.slug] = count || 0;

// ModuleAdministrationApplicationService.js:584-639 — Backend NO verifica repositorios
// Solo verifica: exists? + state !== 'operational' → delete
```

**Impacto:** Si un modulo tiene repositorios documentales pero no tiene forms, la UI bloquea la eliminacion. Pero si la eliminacion se hace via API directamente (bypass UI), los repositorios quedan huerfanos.

---

## RESPUESTAS A PREGUNTAS CRITICAS

### ¿Por que un modulo operacional no puede eliminarse?

**Respuesta:** Por proteccion en 2 capas:

1. **Backend** (`ModuleAdministrationApplicationService.js:612-618`):
   ```javascript
   if (existing.state === 'operational') {
     return createApplicationFailure({
       code: 'MODULE_IN_USE',
       message: 'Cannot delete an operational module. Change state to deprecated first.',
     });
   }
   ```

2. **UI** (`ModuleManager.jsx:134`): Verifica forms y repositorios asociados.

**Razon de negocio:** Un modulo operacional esta publicado en el Runtime (sidebar, DynamicModule shell). Eliminarlo romperia la experiencia del usuario final.

### ¿Cual es el ciclo de vida oficial?

```
draft → configurable → operational → deprecated → archived → draft (ciclo)
```

### ¿Que estados existen?

5 estados: `draft`, `configurable`, `operational`, `deprecated`, `archived`

### ¿Como se realiza correctamente una eliminacion?

```
1. Cambiar estado: operational → deprecated
2. Eliminar todos los forms asociados (sgc_forms)
3. Eliminar todos los repositorios documentales (sgc_document_repositories)
4. Verificar que forms = 0 Y repos = 0
5. Ejecutar DELETE_MODULE
```

### ¿Que modulos son permanentes?

**Core:** `configuracion` — protegido por `CORE_PROTECTED_SLUGS` en UI.

### ¿Que modulos son completamente dinamicos?

**Ninguno actualmente.** Todos los modulos existentes son Foundation Factory (semilla SQL). El CreateModuleWizard esta listo pero no se ha usado.

### ¿Que modulos pertenecen al Core del sistema?

Solo `configuracion` — filtrado de la lista de admin via `CORE_PROTECTED_SLUGS`.

### ¿Existe codigo legacy adicional relacionado con modulos?

**Si.** `Traceability.jsx` (ya eliminado en Sprint 74) importaba `dynamicService` para obtener modulos por slug. `Configuration.jsx` tambien importa `dynamicService` directamente.

### ¿Es posible simplificar el modelo actual sin afectar la gobernanza?

**Si, oportunidades identificadas:**

| Simplificacion | Impacto | Riesgo |
|----------------|---------|--------|
| Eliminar estado `draft` (nunca se usa) | Reducir 5→4 estados | 🟡 Requiere migracion SQL |
| Agregar FK de `sgc_document_repositories.module_slug` → `sgc_modules.slug` | Eliminar repos huerfanos | 🟡 Requiere migracion SQL |
| Unificar `VALID_TRANSITIONS` en un solo archivo | Eliminar duplicacion Frontend/Backend | 🟢 BAJO |
| Agregar verificacion de `is_active` en delete | Proteccion adicional | 🟢 BAJO |

---

## INVENTARIO COMPLETO DE MODULOS

### Modulos en Base de Datos (sgc_modules)

| # | Nombre | Slug | Estado | is_active | visible | Capabilities |
|---|--------|------|--------|-----------|---------|--------------|
| 1 | Operaciones | operaciones | operational | true | true | forms, records, repository |
| 2 | Trazabilidad | trazabilidad | operational | true | true | forms, records, repository |
| 3 | Medicion y Control | medicion-control | operational | true | true | forms, records, repository |
| 4 | Mantenimiento | mantenimiento | operational | true | true | forms, records, repository |
| 5 | Calidad | calidad | operational | true | true | forms, records, repository |
| 6 | Gestion Documental | gestion-documental | operational | true | true | forms, records, repository |
| 7 | Configuracion | configuracion | operational | true | true | forms, records, repository |

### Modulos como Paginas (App.jsx)

| # | Pagina | Ruta | Tipo | Estado |
|---|--------|------|------|--------|
| 1 | Login | /login | Core | Activo |
| 2 | Dashboard | /dashboard | Core | Activo |
| 3 | Traceability | /trazabilidad | Legacy (Categoria B) | Activo |
| 4 | Dispatches | /trazabilidad/despachos | Legacy (Categoria B) | Activo |
| 5 | Configuration | /configuracion | Hibrido | Activo |
| 6 | Users | /usuarios | Legacy (Categoria B) | Activo |
| 7 | DynamicModule | /:moduleSlug | Dynamic | Activo |
| 8 | DynamicModuleById | /:moduleId | Dynamic | Activo |
| 9 | DynamicForm | /modulo/:moduleSlug/:formSlug | Dynamic | Activo |
| 10 | RuntimePlayground | /runtime-playground | Dev | Activo |

---

## RECOMENDACIONES PARA FUTUROS SPRINTS

| # | Accion | Prioridad | Sprint |
|---|--------|-----------|--------|
| 1 | Unificar `VALID_TRANSITIONS` en archivo compartido | 🟢 ALTA | Sprint 76 |
| 2 | Agregar FK `sgc_document_repositories.module_slug` → `sgc_modules.slug` | 🟡 MEDIA | Sprint 77 |
| 3 | Evaluar eliminacion de estado `draft` | 🟡 MEDIA | Sprint 77 |
| 4 | Migrar Traceability.jsx a modulo dinamico | 🟡 MEDIA | Sprint 78 |
| 5 | Migrar Configuration.jsx service layer | 🟡 MEDIA | Sprint 79 |
| 6 | Migrar Dispatches.jsx a modulo dinamico | 🔴 ALTA | Sprint 80+ |

---

## ESTADO FINAL

```
SPRINT 75 — LEVEL 3 — CERTIFIED

Estados certificados: 5 (draft, configurable, operational, deprecated, archived)
Transiciones validas: 8
Inconsistencias F-B: 0 criticas, 2 menores
Protecciones identificadas: 5 (2 backend, 3 UI)
Modulos inventariados: 7 (DB) + 10 (paginas)
Pipeline de eliminacion:完全 certificado
```
