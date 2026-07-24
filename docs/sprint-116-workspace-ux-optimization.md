# Sprint 116 — Operational Workspace UX Optimization (SSOT)

**Tipo:** Production UX Hardening Sprint
**Estado:** LEVEL 3 — PRODUCTION READY
**Branch:** `operativo-v1`
**Build:** 0 errores, 2712 módulos
**Archivos nuevos:** 0
**Archivos modificados:** 1

---

## Objetivo

Optimizar la experiencia visual del Workspace Operacional eliminando la sobrecarga de las 13 vistas operacionales en horizontal, manteniendo el 100% de la funcionalidad existente y mejorando la experiencia en dispositivos móviles.

## Problema

Antes el usuario veía:

```
KPIs
──────────────────────────────────────────────────────────
Todos (145) | Pendientes (10) | En proceso (5) | Completados (100)
Borradores (3) | Por completar (8) | Inconsistentes (2)
Duplicados (1) | Listos (12) | Aprobados (10) | Cerrados (80)
Con observaciones (7) | Importados hoy (15)
──────────────────────────────────────────────────────────
Filtros → Bulk Actions → Summary Cards → Tabla
```

Demasiado scroll antes de llegar a los registros.

## Solución

Selector único desplegable que reemplaza las 13 pestañas horizontales:

```
KPIs
──────────────────────────────────────────────────────────
Vista operacional
[ Todos (145)              ▼ ]
──────────────────────────────────────────────────────────
Filtros → Bulk Actions → Summary Cards → Tabla
```

Al abrir el selector se listan todas las vistas con su count:

```
┌─────────────────────────────────────┐
│  Todos (145)                        │
│  Pendientes (10)                    │
│  En proceso (5)                     │
│  Completados (100)                  │
│  Borradores (3)                     │
│  Por completar (8)                  │
│  Inconsistentes (2)                 │
│  Duplicados (1)                     │
│  Listos (12)                        │
│  Aprobados (10)                     │
│  Cerrados (80)                      │
│  Con observaciones (7)              │
│  Importados hoy (15)                │
└─────────────────────────────────────┘
```

## Comportamiento

| Aspecto | Detalle |
|---------|---------|
| Visualización | Select nativo `<select>` con ícono de chevron |
| Ancho | `w-full sm:w-72` — responsive, ocupa todo el ancho en mobile |
| Cada opción | `{label} ({count})` — nombre + contador de registros |
| Al seleccionar | Cambia activeView, resetea filtros y selección (misma lógica) |
| Reset | `setFilters({})` + `setSelectedIds(new Set())` — igual que antes |
| Etiqueta | "Vista operacional" en uppercase tracking-wider |

## Pipeline visual final

```
KPIs
    ↓
Workspace View Selector (1 línea)
    ↓
Filtros
    ↓
Bulk Actions
    ↓
Completion Summary Cards
    ↓
Tabla de registros
    ↓
Timeline (modal)
```

## Restricciones verificadas

| Prohibición | Estado |
|-------------|--------|
| `OperationalWorkspaceV2` | ❌ |
| `OperationalViewEngine` | ❌ |
| `OperationalViewManager` | ❌ |
| `OperationalFilterEngine` | ❌ |
| `OperationalMobileWorkspace` | ❌ |
| `DispatchWorkspace` | ❌ |
| `DispatchViewSelector` | ❌ |

## Reglas arquitectónicas

| Regla | Cumplimiento |
|-------|-------------|
| No eliminar ninguna vista | ✅ — las 13 vistas intactas |
| No modificar lógica de filtros | ✅ — misma lógica en onChange |
| No modificar badges ni contadores | ✅ — counts preservados en las options |
| No modificar lógica de KPIs | ✅ — sin cambios |
| No crear nuevas capas universales | ✅ — 0 archivos nuevos |
| No crear componentes de dominio | ✅ — solo edit en el Runtime existente |

## Resultado esperado

1. **Menos scroll vertical** — el selector ocupa 2 líneas vs 3-4 líneas de botones
2. **Navegación más rápida** — un clic/tap, el menú nativo del SO se despliega
3. **Totalmente responsive** — funciona idéntico en mobile, tablet y desktop
4. **Escalable** — nuevas vistas solo agregan una opción al select
5. **100% funcionalidad preservada** — misma lógica, mismos filtros, mismos counts
