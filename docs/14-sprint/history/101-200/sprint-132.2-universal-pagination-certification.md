# Sprint 132.2 — Universal Operational Runtime Pagination & Large Dataset Governance (SSOT)

**Status**: LEVEL 3 — CERTIFIED
**Type**: Core Runtime Scalability Sprint
**Branch**: operativo-v1
**Dependencies**: Sprint 132.1D

---

## Resumen

Implementación de paginación cliente-side en el Universal Operational Runtime. Solo se renderizan 20 registros visibles por página, manteniendo el dataset completo en memoria para filtros, búsqueda y operaciones masivas.

## Pipeline certificado

```
Fetch Records (todos)
  ↓
Apply Search (dataset completo)
  ↓
Apply Operational Filters (dataset completo)
  ↓
Apply View Filters (dataset completo)
  ↓
Apply Sorting (dataset completo)
  ↓
Apply Pagination (slice 20 registros)
  ↓
Render Current Page (solo 20 filas DOM)
```

**Nunca** se pagina antes de filtrar. La búsqueda y los filtros operan sobre el dataset completo.

## Archivos modificados/creados

| Archivo | Cambio |
|---------|--------|
| `src/components/Pagination.jsx` | **Nuevo** — componente reutilizable de paginación con navegación completa y selector de page size |
| `src/modules/experiences/UniversalOperationalRuntime.jsx` | Agregado estado `page`/`pageSize`, derived values `totalPages`/`paginatedRecords`, reset de página en filtros, renderizado solo de página actual, integración del componente Pagination |

## Detalle de implementación

### `Pagination.jsx` — Componente reutilizable

Props:
- `page`, `totalPages`, `totalRecords`, `pageSize`
- `onPageChange`, `onPageSizeChange`
- `pageSizeOptions` (default `[20, 50, 100]`)

UX:
- "X–Y de Z registros"
- Selector de page size (20/50/100)
- Navegación: `[<<] [<] [1] [...] [4] [5] [6] [...] [N] [>] [>>]`
- Auto-oculta si `totalRecords <= pageSize`
- Responsive (flex column en mobile, row en desktop)

### `UniversalOperationalRuntime.jsx` — Cambios

**Estado nuevo:**
```js
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20);
```

**Derivados nuevos:**
```js
const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredRecords.length / pageSize)), [filteredRecords, pageSize]);

const paginatedRecords = useMemo(() => {
  const start = (page - 1) * pageSize;
  return filteredRecords.slice(start, start + pageSize);
}, [filteredRecords, page, pageSize]);
```

**Reset de página:**
```js
useEffect(() => { setPage(1); }, [searchTerm, filters, activeView]);
```
Cada vez que cambia la búsqueda, los filtros del panel o la vista operacional, se vuelve a página 1.

**Renderizado:** La tabla itera `paginatedRecords` en lugar de `filteredRecords`:
```jsx
paginatedRecords.map((record) => (
  <tr key={record.id}>...
))}
```

**Paginación UI:** Debajo de la tabla, antes de las completion cards:
```jsx
<Pagination page={page} totalPages={totalPages} totalRecords={filteredRecords.length}
  pageSize={pageSize} onPageChange={setPage}
  onPageSizeChange={v => { setPageSize(v); setPage(1); }} />
```

**Contador de registros:** Actualizado de `<strong>{filteredRecords.length}</strong> de <strong>{records.length}</strong>` a `<strong>{start}–{end}</strong> de <strong>{filteredRecords.length}</strong>`.

## Compatibilidad preservada

| Feature | Funciona con | Motivo |
|---------|-------------|--------|
| Search | Dataset completo | Filtra antes de paginar |
| View filters | Dataset completo | viewFilters se aplica antes de paginar |
| Panel filters | Dataset completo | Se aplican antes de paginar |
| Select all | Filtered set completo | `allFilteredSelected` usa `filteredRecords`, no `paginatedRecords` |
| Bulk actions | SelectedIds (global) | Sin cambios |
| Completion scores | Records completo | Sin cambios |
| Readiness states | Records completo | Sin cambios |
| View counts | Records completo | Sin cambios |
| Duplicate detection | Records completo | Sin cambios |
| Export | Records/selected | Sin cambios |
| Timeline | Individual | Sin cambios |
| Import | Flujo separado | Sin cambios |
| Dashboard | Flujo separado | Sin cambios |

## Performance

| Dataset | Filas DOM (antes) | Filas DOM (después) | Mejora |
|---------|-------------------|---------------------|--------|
| 100 | 100 | 20 | 5x |
| 500 | 500 | 20 | 25x |
| 1000 | 1000 | 20 | 50x |
| 5000 | 5000 | 20 | 250x |
| 10000 | 10000 | 20 | 500x |

El VDOM de React solo diffea 20 filas visibles + header + pagination, independientemente del tamaño del dataset.

## Arquitectura

**Client-side pagination** (según recomendación del Sprint):
- Fetch completo del dataset
- Filtrado completo en memoria
- Paginación en memoria
- Renderizado solo de 20-50 registros

Adecuado para el tamaño actual del SGC-DM (cientos/pocos miles de registros por módulo). Server-side pagination reservado para Sprint futuro con decenas de miles de registros.

## Restricciones cumplidas

- ✅ Sin crear Runtime alternativo
- ✅ Sin duplicar lógica
- ✅ Sin modificar filtros existentes
- ✅ Sin romper búsqueda universal
- ✅ Sin soluciones específicas para despachos
- ✅ Componente reutilizable (`Pagination.jsx`)
- ✅ Sin paginación server-side (prematura para el volumen actual)

## Certificación

**Architecture Status**: LEVEL 3 — UNIVERSAL OPERATIONAL RUNTIME PAGINATION & LARGE DATASET GOVERNANCE CERTIFIED (SSOT)
