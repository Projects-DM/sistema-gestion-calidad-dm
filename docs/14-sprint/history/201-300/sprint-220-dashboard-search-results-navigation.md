# Sprint 220 — Dashboard Search Results & Navigation Refinement

## Objetivo
Evolucionar la búsqueda local del Dashboard hacia un modelo multi-coincidencia:
`matches[]` + `selectedIndex` + `currentMatch`, con contador visible (n/N) y
controles de navegación anterior/siguiente. Cada navegación dispara la cadena
certificada: expansión de dominio → scroll suave → highlight temporal (~2s).
Reutiliza el índice local certificado en el Sprint 219 sin modificarlo.

## Modelo de resultados
```
Usuario → HeaderSearchInput → DashboardSearchContext → Dashboard.jsx
        → Local Index (219) → Matching (filter) → matches[] → currentMatch
        → Expand Panel → Scroll → Highlight
```
- La búsqueda sigue 100% local y el Dashboard sigue siendo consumidor.
- Mismo índice efímero: `{ id, type, title, keywords, section }`.

## Experiencia de usuario
- Barra de resultados solo visible cuando `matches.length > 0`:
  - `N resultados encontrados · pos/N`
  - `◀ Anterior` / `Siguiente ▶` (cíclicos, deshabilitados con 1 resultado).
- Cada cambio de `selectedIndex` re-ejecuta expand + scroll + highlight sobre
  el `currentMatch`.

## Implementación (solo `src/pages/Dashboard.jsx`)
- Estado: `matches`, `selectedIndex`; derivado `currentMatch = matches[selectedIndex] ?? null`.
- Matching: `searchIndex.filter((e) => e.hay.includes(q))` recolecta todas las
  coincidencias y resetea `selectedIndex` a 0.
- Navegación: `goPrev`/`goNext` cíclicos.
- Efecto de navegación sobre `[selectedIndex, matches]`: expanden el dominio
  (`records`/`alerts`), hacen `scrollIntoView({ behavior:'smooth', block:'center' })`
  y aplican highlight limpio a los ~2s.
- `HeaderSearchInput` / `DashboardSearchContext` intactos (Sprint 216/218).

## Restricciones respetadas
Sin `SearchService`, sin `SearchEngine`, sin nuevo `Provider`, sin consultas
(`supabase`/`fetch`/`.select`), sin persistencia. Runtime, Alert Engine,
contratos y hooks certificados intactos.

## Cambios a suites de regresión (baseline certificado)
- `sprint-219` **LS3**: matching pasó de `.find(` (primer match) a `.filter(`
  (multi-match) — verifica la recolección de todas las coincidencias.
- `sprint-219` **LS8**: el destino de scroll/referencia pasó de `match.id` a
  `currentMatch.id` (coincide con el modelo de resultados de Sprint 220).

## Certificación
`C:\tmp\test\sprint-220-dashboard-search-results-navigation-certification.mjs`
→ **SR1–SR12 PASS (12/12)**, incluye Build PASS y regresión Sprint 213→219.

### Alcance
Exclusivamente Presentation Layer (Dashboard.jsx). Cero cambios en Runtime,
servicios, consumidores/adaptadores certificados, contratos o arquitectura funcional.