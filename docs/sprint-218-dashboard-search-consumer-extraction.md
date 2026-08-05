# Sprint 218 — Dashboard Search Consumer Extraction · React Context Compliance

## Objetivo
Aplicar la corrección documentada en el Sprint 217 (Opcion B) y eliminar la
excepción en runtime `useDashboardSearch must be used within a
DashboardSearchProvider`: extraer el consumidor del estado de búsqueda fuera del
cuerpo de `DashboardLayout` hacia un componente descendiente dedicado.

## Causa raíz (heredada de Sprint 217)
`DashboardLayout` desempeñaba doble rol: montaba `<DashboardSearchProvider>` como
hijo **y** llamaba `useDashboardSearch()` en su propio cuerpo. El hook se
ejecutaba en el cuerpo del componente (donde el `Provider` aún no es ancestro),
rompiendo la jerarquía `Provider → Consumer`.

## Corrección aplicada (Opcion B)
1. **Nuevo componente** `src/shared/components/HeaderSearchInput.jsx`
   (capa de presentación, sin lógica):
   - Importa `useDashboardSearch` y `Search` (lucide).
   - Input controlado: `value={query}` / `onChange={(e) => setQuery(e.target.value)}`.
   - Reemplaza el input inline que antes vivía en el `DashboardLayout`.
2. **`src/layouts/DashboardLayout.jsx`**:
   - Elimina el consumo de `useDashboardSearch` del cuerpo (fuente del throw).
   - Sustituye el bloque `.search` inline por `<HeaderSearchInput />`.
   - Elimina el import lucide `Search` (hoy sin uso en el Layout).
   - El `<DashboardSearchProvider>` sigue montado solo como host (infraestructura):
     envuelve header + `<Outlet />`.

## Jerarquía resultante (validada)
```
DashboardLayout (host)
 └─ DashboardSearchProvider
     ├─ HeaderSearchInput   → useDashboardSearch()   (consumidor válido)
     └─ <Outlet/>
         └─ Dashboard       → useDashboardSearch()   (consumidor válido)
```
Todos los consumidores están bajo un ancestro `Provider` → la excepción
desaparece sin tocar lógica/runtime/servicios.

## Ownership (inalterado)
- `DashboardSearchContext.jsx` (216): transporte-only `{ query, setQuery }`.
- `HeaderSearchInput.jsx` (218): dueño del input; escribe `setQuery`.
- `Dashboard.jsx` (216): dueño del índice; lee `query`, emite `data-search-query`.

## Cambios a suites de regresión (baseline certificado)
- `sprint-215` **DS1**: el elemento de búsqueda ahora vive en `HeaderSearchInput`
  (extraído por 218), controlado vía contexto.
- `sprint-216` **OB1/OB2**: `Layout` ya no consume el hook; `HeaderSearchInput` es
  el consumidor bajo el `Provider`.
- `sprint-217` **PA3/PA5/PA6/PA7/PA9**: audit registra la corrección aplicada —
  `Layout` host-only, excepción resuelta, causa histórica preservada en el doc.

## Certificación
`C:\tmp\test\sprint-218-dashboard-search-consumer-extraction-certification.mjs`
→ **CE1–CE12 PASS** (12/12), incluye Build PASS y regresión 213→217.

### Alcance
- Capa de presentación únicamente. Cero cambios en Runtime, servicios,
  consumidores/adaptadores certificados o arquitectura funcional.