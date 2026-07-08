# SPRINT_45_1 — STANDARD MODULE SPECIFICATION (SSOT)

## 0) Objetivo Final del Sprint 45
El **Sprint 45** no implementa un nuevo motor de módulos ni introduce un runtime alternativo.

El objetivo final es que, al terminar este sprint, un administrador pueda **crear nuevos módulos reutilizando completamente la infraestructura existente**.

A partir de este punto, el estándar reutilizable será compartido por todos los módulos y se apoya en:
- `DynamicModule`
- `DynamicForm`
- `DynamicRecordsView`
- `ModuleDocumentViewer`
- `dynamicService`
- el **runtime actual**
- **auditoría**
- **evidencias**
- la **base de datos existente**

La única diferencia entre módulos será su **metadata** y las **capacidades habilitadas**.

## 0.1) Principio arquitectónico rector del Sprint 45
**Todo desarrollo futuro debe reutilizar la infraestructura existente**.
- No se crearán runtimes paralelos.
- No se crearán servicios duplicados.
- No se crearán motores nuevos para funcionalidades que ya existen.
- Toda nueva funcionalidad deberá consumir la arquitectura actual.

Este es el principio rector que rige la implementación posterior.

## 0.2) Objetivo del Standard Module
Este documento convierte el conocimiento del sistema actual en la **especificación oficial (SSOT)** del **Módulo Estándar**.


- **No** se diseña un motor nuevo.
- **No** se crea un runtime nuevo.
- **No** se modifica la arquitectura existente.
- **No** se modifica código, runtime o base de datos en este sprint.

El objetivo es documentar el estándar reutilizable existente para permitir que futuros módulos se creen usando **toda la infraestructura actual**.

> **Exclusión obligatoria**: **Trazabilidad NO** se usa como referencia arquitectónica del estándar. Trazabilidad se audita como funcionamiento, pero el estándar se deriva exclusivamente de los módulos reutilizables del stack:
> **Operaciones, Medición y Control, Mantenimiento, Calidad, Gestión Documental**.

---

## 1) Arquitectura General (flujo conceptual existente)

```text
Administrador
   ↓
Configuración (definición de módulos/formularios/campos)
   ↓
Módulo (DynamicModule por moduleSlug)
   ↓
Formularios (sgc_forms del módulo)
   ↓
Campos (sgc_form_fields del formulario)
   ↓
Registros (sgc_form_responses + sgc_response_values + sgc_evidences)
   ↓
Historial y Consultas (DynamicRecordsView)
   ↓
Repositorio Documental (ModuleDocumentViewer)
```

---


## 1) Definición oficial de un Módulo Estándar

### 1.1 En qué consiste (concepto)
Un **Módulo Estándar** es una unidad administrada por metadata que:
- se identifica por un `moduleSlug` (ruta)
- agrupa una lista de formularios (`sgc_forms`) asociada a ese módulo (`module_id`)
- habilita en UI capacidades estándar como:
  - **Diligenciar Registros** (catálogo y navegación a formularios)
  - **Historial y Consultas** (listado + modal + auditoría y verificación)
  - **Repositorio Documental** (gestión documental por repositorio/categoría)

### 1.2 Atributos oficiales (mínimos con evidencia)
Los siguientes atributos componen la definición estándar del módulo y se derivan del comportamiento observado en el código que hoy orquesta módulos por slug:

| Atributo | Evidencia en código/flujo | Tipo de fuente |
|---|---|---|
| `name` | `DynamicModule.jsx` muestra `modInfo.name` | `sgc_modules` (DB) |
| `description` | `DynamicModule.jsx` usa `modInfo.description || ...` | `sgc_modules` (DB) |
| `slug` / `moduleSlug` | `App.jsx` rutea por `/:moduleSlug` y `dynamicService.getModuleBySlug(slug)` | `sgc_modules.slug` (DB) |
| `is_active` | `dynamicService.getModules()` filtra `eq('is_active', true)` | `sgc_modules.is_active` (DB) |
| `id` | `DynamicModule.jsx` usa `moduleData.id` para consultar forms | `sgc_modules.id` (DB) |

> Nota: el documento solicitado menciona icono/color/orden/estado. En el repositorio, **la evidencia directa disponible en el estándar reutilizable** para esos campos no está demostrada aún en los componentes auditados (DynamicModule/DynamicForm). Por lo tanto, para cumplir el criterio “no asumir campos sin evidencia”, **estos atributos se declaran como NO confirmados por evidencia en el SSOT** y se tratan como opcionales/no estandarizados en esta fase.

---

## 2) Funcionalidades reutilizables (habilitar / deshabilitar)

### 2.1 Funcionalidades estándar del Módulo Estándar
En `src/pages/DynamicModule.jsx` el módulo estándar presenta una UI con pestañas fijas, donde la habilitación real (especialmente Repositorio Documental) depende de condiciones:

1) **Diligenciar Registros**
- Siempre existe como tab funcional.
- Evidencia:
  - UI tab “Diligenciar Registros” en `DynamicModule.jsx`
  - catálogo de formularios `forms` recuperados por `dynamicService.getFormsByModule(moduleData.id)`

2) **Historial y Consultas**
- Siempre existe como tab funcional.
- Evidencia:
  - UI tab “Historial y Consultas”
  - renderiza `DynamicRecordsView moduleId={modInfo.id}`

3) **Repositorio Documental**
- Existe como tab, pero **solo se habilita para un conjunto de módulos hoy hardcodeado**.
- Evidencia (hardcode):
  - `DynamicModule.jsx` define `isDocumentEnabled = (slug) => ['mantenimiento','calidad','operaciones','gestion-documental','medicion-control'].includes(slug)`
  - el botón está `disabled={!isDocumentEnabled(moduleSlug)}`

### 2.2 Otras funcionalidades comunes
Con evidencia directa en el estándar reutilizable del módulo:
- **Render de formulario dinámico por engine**: `DynamicForm.jsx`
- **Persistencia y auditoría de respuestas**: `dynamicService.js`
- **Verificación/estados en historial**: `DynamicRecordsView.jsx` + `dynamicService.verify*`

> No se documentan funcionalidades adicionales como “estándar” si no se observan en la orquestación común.

---

## 3) Componentes reutilizados (estándar de UI)

Los módulos estándar se implementan hoy combinando contenedores + servicios + engines.

### 3.1 Componentes principales
- **`src/pages/DynamicModule.jsx`**
  - Orquestación por `moduleSlug`
  - carga metadata de módulo y `forms`
  - tabs: diligenciar / historial / repositorio

- **`src/pages/DynamicForm.jsx`**
  - Carga `formDef` y `fields`
  - render engine según `formDef.engine_type`
  - valida y persiste con `dynamicService.submitFormResponse`
  - dispara puente runtime con `runtimeActivationLayer.activate(...)`

- **`src/components/DynamicRecordsView.jsx`**
  - carga respuestas por `moduleId`
  - presenta historial/consultas
  - permite verificación y consulta auditoría

- **Repositorio Documental**
  - **`src/modules/documentViewer/ModuleDocumentViewer.jsx`**
  - **`src/components/DocumentModule.jsx`** (botón/estado de programa PDF del módulo)

### 3.2 Servicios comunes
- `src/services/dynamicService.js` (CRUD de metadata, persistencia de respuestas, auditoría, verificación)
- Servicios de documental:
  - `src/services/documentRepositoriesService.js`
  - `src/services/documentsService.js`

### 3.3 Hooks/Providers comunes
- Auth:
  - `src/context/AuthContext.jsx`
  - `src/hooks/useAuth.js`
- Gate / roles:
  - `src/components/ProtectedRoute.jsx`
  - `src/components/RoleGate.jsx`

---

## 4) Dependencias compartidas (por qué un módulo estándar funciona)

Un módulo estándar depende de lo siguiente (reutilizable):

### 4.1 Base de datos
Tablas consultadas por el flujo estándar (evidencia directa en `dynamicService.js` y UI):
- `sgc_modules`
- `sgc_forms`
- `sgc_form_fields`
- `sgc_form_responses`
- `sgc_response_values` (EAV)
- `sgc_evidences`
- `sgc_audit_logs`
- `profiles` (para roles y auditoría)

### 4.2 Formularios dinámicos
- Se modelan por metadata en DB y se renderizan por engines.

### 4.3 Evidencias
- Flujo soportado por `EvidenceUploader` y persistido en `sgc_evidences`.

### 4.4 Auditoría
- Se inserta en `dynamicService.submitFormResponse` (action `create`).
- Se inserta en `dynamicService.verifyFormResponse` / `verifyMultiple...` (action `verify`).

### 4.5 Runtime existente (solo para completar el flujo)
- `runtimeActivationLayer.activate(...)` usa:
  - `BusinessEventTranslationLayer`
  - un router de persistencia de runtime interno

> No se propone ni se diseña runtime nuevo; el runtime actual se considera “existente y reutilizable”.

---

## 5) Qué NO debe volver a implementarse (infra existente)

Con evidencia en el sistema actual, el **módulo estándar** debe reutilizar, sin reimplementación:
- Runtime existente:
  - `runtimeActivationLayer.activate`
- Persistencia y auditoría:
  - `dynamicService.submitFormResponse`
  - `dynamicService.verifyFormResponse`
  - tablas `sgc_*` correspondientes
- Formularios:
  - `DynamicForm.jsx`
  - engines existentes `BaseChecklist`, `BaseMediciones`, `BaseGeneric`
- Historial/consultas:
  - `DynamicRecordsView.jsx`
- Repositorio documental:
  - `ModuleDocumentViewer.jsx` + servicios documentales

---

## 6) Configuración mínima requerida para crear un Módulo Estándar

> Restricción: “validar contra el código existente”. Por evidencia directa, lo mínimo necesario para que el estándar funcione es la metadata del módulo y su relación con forms/campos.

### 6.1 Conjunto mínimo parametrizable (evidenciable)
**Módulo** (`sgc_modules`):
- `slug` (`moduleSlug`): para ruteo y carga
- `name`
- `description` (opcional; UI tiene fallback)
- `is_active` (para estar disponible)

**Relación con formularios** (`sgc_forms`):
- `module_id` (FK lógica)
- `slug` (`formSlug`)
- `name`, `description`
- `engine_type`
- `roles_allowed`
- `is_active`

**Esquema de campos** (`sgc_form_fields`):
- `form_id`
- `field_type`
- `required`
- `options` (ej. min/max/unit si aplica)
- `order_index`

### 6.2 Capacidades estándar del módulo (en UI)
El SSOT define capacidades como flags **conceptuales** para el módulo estándar:
- `mostrar_diligenciar_registros` → **hoy siempre ON** (tab existe y orquesta por forms DB)
- `mostrar_historial_consultas` → **hoy siempre ON**
- `mostrar_repositorio_documental` → **hoy condicionado** (hardcode por `moduleSlug`)

En esta fase SSOT, el atributo `mostrar_repositorio_documental` **no está parametrizado vía DB**; está hardcodeado en `DynamicModule.jsx`.

---

## 7) Inventario de hardcodes que afectan el SSOT (para que futuros módulos cumplan estándar)

> Este SSOT documenta los hardcodes que impiden que la configuración “active” capacidades sin tocar código.

> Los hardcodes actuales son evidencia de dónde el sistema **todavía no es 100% parametrizable**.


| Elemento hardcodeado | Archivo | Qué rompe | Qué debería parametrizarse |
|---|---|---|---|
| lista fija de slugs habilitados para Repositorio Documental | `src/pages/DynamicModule.jsx` | nuevos módulos no activan repositorio documental aunque exista DB | flag/condición desde DB (`sgc_modules` o existencia de repositorios activos) |
| mapping/dispathcer de engines desde `switch (formDef.engine_type)` | `src/pages/DynamicForm.jsx` | engines no listados no se renderizan | registro/mapeo de engines o selección parametrizable |

---

## Especificación Oficial del Módulo Estándar (SSOT)

Un **Módulo Estándar** en este sistema es:
- una entidad DB identificada por `sgc_modules.slug` y activada por `is_active`
- que contiene formularios configurados por metadata (`sgc_forms` + `sgc_form_fields`)
- que en UI se opera siempre con el mismo flujo estándar:
  - `DynamicModule` (orquestación + tabs)
  - `DynamicForm` (render por engine + persistencia/auditoría)
  - `DynamicRecordsView` (historial, verificación y auditoría)
  - y para documental: `ModuleDocumentViewer` (repositorios/categorías/documentos)

La creación de módulos nuevos hoy requiere que existan y estén activos en DB los módulos/forms/fields; adicionalmente, para habilitar el **Repositorio Documental** existe un hardcode por slug que debe reemplazarse por una condición parametrizada (fuera del alcance de implementación en este sprint).

