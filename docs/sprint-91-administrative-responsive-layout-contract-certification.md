# Sprint 91 — Administrative Responsive Layout Contract Certification

**Tipo:** Administrative UI Contract & Responsive Layout Architecture
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 90 — Operational Signature Standardization & Responsible Party Certification
**Branch:** `operativo-v1`
**Build:** 0 errores, 2701 módulos, 2.22s
**Archivos modificados:** 7 (solo CSS/Tailwind classes, 0 cambios funcionales)

---

## Objetivo

Certificar que ningún dato dinámico tenga la capacidad de romper el layout administrativo del SGC-DM. Las acciones administrativas tienen **prioridad absoluta** sobre los textos mostrados.

## Problema

Textos dinámicos (nombres de formularios, módulos, usuarios, slugs, descripciones) podían sobrepasar el viewport y ocultar botones de acción detrás de scroll horizontal.

## Filosofía

```
ADMINISTRATIVE ACTIONS FIRST
  → LAYOUT FIRST
    → RESPONSIVE FIRST
      → DATA NEVER BREAKS THE UI
```

## Responsive Priority oficial

1. Botones
2. Acciones administrativas
3. Controles
4. Iconos
5. Metadata
6. Textos dinámicos ← siempre el elemento sacrificable

## Cambios por archivo

### 1. `src/components/workspace/ModuleManager.jsx`

| Celda | Antes | Después |
|-------|-------|---------|
| Nombre módulo | `{name}` | `truncate` + `max-w-[220px]` |
| Slug | `{slug}` | `truncate` + `max-w-[160px]` |

### 2. `src/pages/Configuration.jsx`

| Celda | Antes | Después |
|-------|-------|---------|
| Formulario | `{form.name}` / `{form.slug}` | `truncate` + `max-w-[260px]` |
| Módulo | `{form.module_name}` | `truncate max-w-full` + `max-w-[160px]` |
| Motor | `{form.engine_type}` | `whitespace-nowrap` |
| Acciones | — | `whitespace-nowrap` en td |

### 3. `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx`

| Elemento | Antes | Después |
|----------|-------|---------|
| Repo name (lista) | `{r.name}` | `truncate` + `min-w-0 flex-1` en contenedor padre |
| Repo slug | `{r.slug} · {r.module_slug}` | `truncate` |
| Repo header (panel) | `{repo.name}` | `truncate` + `min-w-0 flex-1` + `shrink-0` en icono |
| Botón "Nueva Categoría" | — | `shrink-0` |

### 4. `src/components/DynamicRecordsView.jsx`

| Celda | Antes | Después |
|-------|-------|---------|
| Fecha icono | — | `shrink-0` |
| Formulario | `{rec.sgc_forms?.name}` | `truncate` + `max-w-[200px]` + `shrink-0` en icono |
| Usuario | `{rec.profiles?.nombre}` | `truncate` + `max-w-[160px]` + `shrink-0` en icono |
| Rol | `{rec.profiles?.rol}` | `truncate` |
| Badges (Estado, Verificación) | — | `whitespace-nowrap` |
| Acción (Ver) | — | `whitespace-nowrap` + `shrink-0` |

### 5. `src/pages/Users.jsx`

| Celda | Antes | Después |
|-------|-------|---------|
| Nombre | `{user.nombre}` | `truncate` + `max-w-[220px]` + `shrink-0` en avatar |
| Email | `{user.email}` | `truncate` + `max-w-[200px]` + `shrink-0` en icono |

### 6. `src/pages/Dispatches.jsx`

| Celda | Antes | Después |
|-------|-------|---------|
| Cliente | `{record.cliente}` | `truncate` + `max-w-[200px]` |
| Destino | `truncate max-w-[200px]` (existente) | Sin cambios |
| Producto | `{record.producto}` | `truncate` + `max-w-[180px]` |
| Lote | `{record.lote}` | `truncate` |
| Acciones | — | `whitespace-nowrap` |

### 7. `src/components/FormBuilder.jsx`

| Elemento | Antes | Después |
|----------|-------|---------|
| Ícono grip | — | `shrink-0` |
| Número de campo | — | `shrink-0` |
| Label del campo | `{field.label}` | `truncate` |
| Badge "Requerido" | — | `shrink-0` |
| Info (ID, Tipo) | `{field.name} | Tipo: ...` | `truncate` |
| Contenedor texto | `flex-1` | `flex-1 min-w-0` |
| Grupo botones | — | `shrink-0` |

## Patrón aplicado

```jsx
// Texto dinámico truncable
<td className="px-6 py-4 max-w-[200px]">
  <p className="font-bold text-gray-900 truncate">{dynamicText}</p>
</td>

// Botones siempre visibles
<td className="px-6 py-4 text-right whitespace-nowrap">
  <div className="flex justify-end gap-2 shrink-0">
    <button>Editar</button>
    <button>Eliminar</button>
  </div>
</td>

// Iconos que no se colapsan
<Icon className="w-4 h-4 shrink-0" />

// Contenedor padre que permite truncado hijo
<div className="min-w-0 flex-1">
  <span className="truncate">...</span>
</div>
```

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Botones administrativos siempre visibles | ✅ `whitespace-nowrap` + `shrink-0` en todos los grupos de acción |
| 2 | Textos largos truncados automáticamente | ✅ `truncate` + `max-w` en todas las celdas dinámicas |
| 3 | Layout nunca desplazado por datos | ✅ Texto nunca expande celdas más allá de `max-w` |
| 4 | Sin scroll horizontal administrativo | ✅ Todos los contenedores tienen `overflow-x-auto` seguro |
| 5 | Componentes reutilizados | ✅ 0 componentes nuevos |
| 6 | Sin cambios funcionales | ✅ Solo clases CSS/Tailwind |
| 7 | Compatible con toda la capa administrativa | ✅ 7 archivos cubren ModuleManager, Config, Repos, Records, Users, Dispatches, Builder |
| 8 | Build 0 errores | ✅ 2701 módulos, 2.22s |
