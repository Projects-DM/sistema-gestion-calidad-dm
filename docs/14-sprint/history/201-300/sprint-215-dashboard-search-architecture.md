# SPRINT 215 — Dashboard Search Architecture Audit & Local Search Model (MASTER SSOT LEVEL 5)

- **Architecture Status:** LEVEL 5 — DASHBOARD SEARCH · LOCAL SEARCH MODEL · PRESENTATION LAYER CERTIFICATION
- **Type:** Architecture Audit · UX Search Consolidation · Local Search Certification
- **Impact:** Exclusivamente Presentation Layer. NO modifica Runtime, Dynamic Forms, Dynamic Records, Alert Engine, Notification Engine, Lifecycle, Operational Actions, Providers, Contracts, Evaluation Engine, Persistence ni modelos certificados.
- **Branch:** `release/stable-sprint79`
- **Date:** 2026-08-04
- **Estado:** **SEARCH ARCHITECTURE AUDITED · LOCAL SEARCH MODEL CERTIFIED · READY FOR IMPLEMENTATION (SPRINT 216)**

---

## 1. Resumen ejecutivo

Sprint de **auditoria y certificacion** (cero cambios de produccion) que establece oficialmente el modelo **Dashboard Local Search**. El buscador deja de ser un elemento visual sin comportamiento y pasa a formar parte de la Presentation Layer como **consumidor de informacion ya cargada** por el Dashboard. No implementa ninguna busqueda, no modifica servicios, no crea contratos ni realiza consultas adicionales. Prepara el **Sprint 216 — Dashboard Local Search (Implementation)**.

## 2. Principio arquitectonico certificado

El buscador del Dashboard **NO es un motor de busqueda global**:

```
Consumir -> Indexar informacion ya cargada -> Filtrar localmente -> Presentar resultados
```

Nunca: `Buscar -> Consultar BD -> Consultar Runtime -> Consultar Supabase -> Consultar modulos`.
Toda la busqueda es **completamente local**.

## 3. A1 — Auditoria del SearchBar

| Elemento | Estado | Detalle |
|---|---|---|
| Ubicacion fisica | Certificada | `src/layouts/DashboardLayout.jsx:234-241` (topbar, dentro de `<header>`) |
| Componente propietario | Certificado | `DashboardLayout` (Layout/Header). **No** es componente compartido ni especifico del Dashboard |
| Estructura | Inventariada | Input **inline** (`<Search>` ic lucide + `<input type="text">`), NO un componente `SearchBar` dedicado |
| Props disponibles | Inventariadas | **Ninguna** (input sin props) |
| Estado interno | Inventariado | **Ninguno** (input no controlado: sin `value`, sin `onChange`) |
| Eventos disponibles | Inventariados | **Ninguno** (sin handlers) |
| Dependencias | Documentadas | Solo `Search` de `lucide-react` |

**Hallazgo:** el buscador superior es actualmente un elemento puramente visual: recibe texto, permite escribir, no genera resultados ni interactua con ningun componente (coherente con Sprint 213/214). Para Sprint 216 se activara/extraera este elemento.

## 4. A2 — Fuentes de informacion certificadas (unicas autorizadas)

| Fuente | Propietario | Estado |
|---|---|---|
| `runtimeModules` | `ModuleAdministrationApplicationService` (`GET_RUNTIME_MODULES`) | Certificada |
| `metrics` | `useDashboardMetrics` | Certificada |
| `alertMetrics` | `useAlertRuntime` (facade `dashboard`) | Certificada |

**No se autoriza ninguna fuente adicional.**

## 5. A3 — Inventario de elementos buscables

- **Dominios Operacionales** (Registros Operacionales, Alertas Operacionales) - **intitulos de paneles**.
- **KPIs**: todos los renderizados via `DashboardMetricCard` son indexables. No se crean nuevos indicadores.
- **Modulos**: todos los provenientes de `runtimeModules` son automaticamente indexables (compatible con modulos dinamicos del administrador). No existiran modulos codificados manualmente.

## 6. A4 — Modelo oficial de indexacion

Indice temporal construido exclusivamente con informacion en memoria:

```
Dashboard
  -> runtimeModules
  -> metrics
  -> alertMetrics
  -> Dashboard Search Index   (nunca persistido/almacenado/enviado)
```

El indice se reconstruye automaticamente cada vez que el Dashboard actualiza sus datos. **Nunca** es persistido ni enviado al servidor.

## 7. A5 — Modelo de resultados

Cada entrada del indice contiene solo lo necesario para localizar un elemento visual:

```json
{ "id": "...", "type": "module|kpi|domain", "title": "...", "keywords": [...], "target": "...", "section": "registros|alertas|modulos" }
```

- `type` = tipo de resultado; `title` = nombre visible; `keywords` = terminos indexables; `target` = componente visual asociado; `section` = dominio operacional. **No contiene datos funcionales.**

## 8. Arquitectura oficial

```
SearchBar -> Dashboard Search Controller -> Dashboard Search Index -> Dashboard Components -> Usuario
```

Sin dependencias hacia Runtime ni Providers. Sin consultas nuevas.

## 9. Politica de reutilizacion (S1–S8)

| Codigo | Politica | Estado |
|---|---|---|
| S1 | Reutilizar SearchBar existente | Obligatorio |
| S2 | Reutilizar `runtimeModules` existentes | Obligatorio |
| S3 | Reutilizar `metrics` existentes | Obligatorio |
| S4 | Reutilizar `alertMetrics` existentes | Obligatorio |
| S5 | No crear servicios nuevos | Obligatorio |
| S6 | No crear consultas nuevas | Obligatorio |
| S7 | Toda busqueda sera local | Obligatorio |
| S8 | El Dashboard continua siendo consumidor | Obligatorio |

## 10. Politica de navegacion (certificada)

Al seleccionar un resultado:

```
Resultado -> Expandir panel (si colapsado) -> Desplazar Dashboard -> Resaltar componente -> Finalizar
```

No se implementa navegacion entre paginas, no se abren modulos, no se modifican rutas.

## 11. Politica de evolucion (incremental)

| Nivel | Sprint |
|---|---|
| Dashboard Local Search | **Sprint 216** |
| Dashboard Navigation Search | Sprint futuro |
| Global Operational Search | Sprint futuro |
| Full Platform Search | Sprint futuro |

## 12. Componentes reutilizables identificados

`SearchBar` (elemento inline a activar), `DashboardMetricCard`, `CollapsiblePanel`, `useDashboardMetrics`, `useAlertRuntime`, `ModuleAdministrationApplicationService`, `runtimeModules`. **No se autoriza duplicar ninguno.**

## 13. Fuera del alcance (este Sprint no implementa)

Busqueda global, de registros, documental, por lotes, de formularios, de usuarios, Runtime, IA; indexacion persistente; historial; autocompletado inteligente.

## 14. Definition of Done (verificado)

- [x] SearchBar auditado (A1).
- [x] Arquitectura documentada.
- [x] Fuentes certificadas (A2).
- [x] Indice local definido (A4).
- [x] Alcance funcional certificado.
- [x] Politica de reutilizacion definida (S1–S8).
- [x] Arquitectura desacoplada.
- [x] Politica de navegacion certificada.
- [x] Politica de evolucion documentada.
- [x] Cero cambios funcionales realizados.
- [x] SSOT preservado.

## 15. Certificacion — `sprint-215-dashboard-search-architecture-certification.mjs`

Resultado esperado: **DS1–DS10 = 10/10 PASS** (ver suite).

## 16. Plan de implementacion certificado — Sprint 216

### 16.1 Objetivo
Primera version funcional del Dashboard Search usando exclusivamente el modelo certificado.

### 16.2 Alcance
- Activar el SearchBar existente.
- Construir el indice local desde `runtimeModules`, `metrics`, `alertMetrics`.
- Filtrar resultados en memoria.
- Expandir automaticamente el `CollapsiblePanel` correspondiente cuando un resultado pertenezca a un panel colapsado.
- Desplazar el Dashboard hasta el elemento encontrado.
- Resaltar temporalmente el resultado.

### 16.3 Restricciones
No modificar Runtime, no crear servicios, no crear consultas, no modificar Providers, no modificar Hooks certificados, no modificar contratos. Mutener el buscador como consumidor local.

**Nota arquitectonica:** el SearchBar reside en `DashboardLayout` (Layout/Header) mientras que `runtimeModules`/`metrics`/`alertMetrics` viven en la pagina `Dashboard.jsx` (Outlet). Sprint 216 debera resolver este limite de ownership (e.g. elevando el contexto del indice al Layout o conectando el controlador a la pagina) **sin violar S1–S8 ni tocar capas certificadas**.

## 17. FINAL CERTIFICATION

**LEVEL 5 — DASHBOARD SEARCH · LOCAL SEARCH MODEL CERTIFIED · PRESENTATION LAYER AUDITED · LOCAL INDEX ARCHITECTURE CERTIFIED · COMPONENT REUSE CERTIFIED · ZERO NEW QUERIES · ZERO NEW SERVICES · DASHBOARD SEARCH READY FOR IMPLEMENTATION (SPRINT 216)**