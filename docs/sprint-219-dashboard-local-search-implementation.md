# Sprint 219 — Dashboard Local Search Implementation & Operational Navigation

## Objetivo
Primera capacidad operacional de búsqueda del Dashboard SGC-DM: un índice local,
efímero y en memoria que, ante la intención de texto del usuario, filtra, expande
automáticamente el dominio, hace scroll al resultado y lo resalta temporalmente
(~2s). Reutiliza íntegramente la infraestructura certificada en los Sprint 215–218.

## Modelo de búsqueda (100% local)
```
Usuario → HeaderSearchInput → DashboardSearchContext → Dashboard.jsx
        → DashboardSearchIndex (memoria) → Matching → Expand Panel → Scroll → Highlight
```
- Sin consultas a Runtime, sin comunicación con Supabase, sin ningún servicio nuevo.
- El Dashboard continúa siendo únicamente consumidor.

## Índice local (desde memoria)
Construido solo desde `runtimeModules` + `metrics` + `alertMetrics`:
`{ id, type, title, keywords, section }` con `type ∈ { module, kpi, domain }` y
`section ∈ { records, alerts, modules, activity }`. Efímero, no persistido,
no serializado, no compartido.

- **Módulos**: dinámicos (`runtimeModules`) + Configuración — compatibilidad completa
  con módulos dinámicos, sin módulos hardcodeados.
- **KPIs**: todas las `DashboardMetricCard` existentes (sin crear indicadores).
- **Dominios**: Registros Operacionales, Alertas Operacionales, Actividad Reciente.

## Matching
Case-insensitive, accent-insensitive y partial match: `normalizeToken` (NFD +
lowercase) sobre `hay = normalize(title + keywords)`; primer match por `includes`.

## Navegación automática
Para la sección coincidente:
- `records` → `setRecordsOpen(true)` (expansión controlada).
- `alerts` → `setAlertsOpen(true)`.
- Scroll: `document.getElementById(match.id).scrollIntoView({ behavior:'smooth', block:'center' })`.
- Highlight: `highlightId`; clase de anillo/background condicional; limpieza en ~2s.

## Componentes
- **`CollapsiblePanel.jsx`** — expone API de expansión controlada (`expanded` /
  `onExpandedChange`) manteniendo la compatibilidad con el comportamiento manual
  (`defaultOpen` + `useState` + `aria-expanded={open}`) certificado en 213/214/215.
- **`Dashboard.jsx`** — dueño del índice, matching, navegación y highlight.
- **`HeaderSearchInput.jsx`** — sin cambios funcionales; sigue capturando solo la
  intención de búsqueda (Sprint 218).

## Restricciones respetadas
Prohibido y verificado (LS10–LS12): sin `SearchService`, sin `DashboardSearchEngine`,
sin consultas a Runtime/Supabase, sin Providers/Adapters/Repos nuevos, sin persistencia,
sin modificación de hooks certificados, contratos ni Alert Engine.

## Cambios a suites de regresión
- `sprint-214` **C2**: el setter interno se renombró de `setOpen` a `setInternalOpen`
  (evita colisión con la variable controlada `open`); el toggle independiente se
  preserva y se verifica con ambas formas.

## Certificación
`C:\tmp\test\sprint-219-dashboard-local-search-implementation-certification.mjs`
→ **LS1–LS14 PASS (14/14)**, incluye Build PASS y regresión Sprint 213→218.

### Alcance
Exclusivamente Presentation Layer. Cero cambios en Runtime, servicios,
consumidores/adaptadores certificados, contrato de aplicación o arquitectura funcional.

## Evolución
Sobre esta base (sin modificar la arquitectura): Sprint 220 *Dashboard Navigation Search*,
Sprint 221 *Global Operational Search*, y posterior *Unified Platform Search*.