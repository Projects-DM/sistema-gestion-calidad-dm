# SPRINT 217 — Dashboard Search Provider Integration Audit & Ownership Validation (MASTER SSOT LEVEL 5)

- **Architecture Status:** LEVEL 5 — DASHBOARD SEARCH · PROVIDER INTEGRATION AUDIT · OWNERSHIP VALIDATION
- **Type:** Architecture Audit · React Tree Validation · Presentation Infrastructure Certification
- **Impact:** Ningun cambio funcional. Exclusivamente auditoria arquitectonica. NO modifica Runtime, Dynamic Forms, Dynamic Records, Alert Engine, Notification Engine, Lifecycle, Operational Actions, Providers de negocio, Contracts, Evaluation Engine, Persistence ni modelos certificados.
- **Branch:** `release/stable-sprint79`
- **Date:** 2026-08-04
- **Estado:** **PROVIDER OWNERSHIP CERTIFIED · REACT TREE VALIDATED · READY FOR CORRECTION**

---

## 1. Resumen ejecutivo

Auditoria completa (cero cambios de codigo) del arbol React para identificar el punto exacto que provoca la excepcion `useDashboardSearch must be used within a DashboardSearchProvider`. La aplicacion compila (build PASS) pero falla en runtime por una violacion del orden React Context: el `DashboardSearchProvider` es renderizado por el mismo componente que lo consume. Se documenta la causa raiz con evidencia y se propone la correccion arquitectonica para el proximo Sprint. **No se implementa ninguna correccion.**

## 2. Arbol React auditado (evidencia: `src/main.jsx`, `src/App.jsx`)

```
main.jsx
  <StrictMode>
    <AuthProvider>                                   // src/context/AuthContext
      <App />                                        // src/App.jsx
        <Router basename="/sistema-gestion-calidad-dm">
          <Routes>
            <Route path="/">
              <ProtectedRoute>
                <DashboardLayout />                  // src/layouts/DashboardLayout.jsx
                  <DashboardSearchProvider>          // montado por DashboardLayout (SU PROPIO output)
                    <main>
                      <Outlet />
                        <Route path="dashboard"><Dashboard /></Route>
                        <Route path="configuracion"><Configuration /></Route>
                        <Route path="usuarios"><Users /></Route>
                        <Route path="runtime-playground">...</Route>
                        <Route path=":moduleSlug">...</Route>
                        ...
```

`DashboardSearchProvider` NO esta presente en `main.jsx` ni en `App.jsx` (A5: retiene ser montado por DashboardLayout).

## 3. A2 — Ownership validado

| Elemento | Propietario esperado | Estado |
|---|---|---|
| Search Input | `DashboardLayout` | Correcto |
| `query` / `setQuery` | `DashboardSearchProvider` | Correcto |
| Search Index / `runtimeModules` / `metrics` / `alertMetrics` | `Dashboard.jsx` | Correcto |

## 4. A3 — Auditoria de consumo

Consumidores de `useDashboardSearch()`:

| Componente | Ubicacion | Jerarquia | Estado |
|---|---|---|---|
| `DashboardLayout` | `src/layouts/DashboardLayout.jsx` (cuerpo del componente) | ANCESTRO del Provider (iiiiINVALIDO) | **ROMPE** |
| `Dashboard` | `src/pages/Dashboard.jsx` (rendered en Outlet) | DESCENDIENTE del Provider | Correcto |

## 5. A4 — Auditoria del Provider

- **Ubicacion fisica:** `src/shared/components/DashboardSearchContext.jsx` (Presentation Layer).
- **Exportaciones:** `DashboardSearchProvider`, `useDashboardSearch`, `DashboardSearchContext` (default = `DashboardSearchProvider`).
- **Imports:** solo `react` (`createContext`, `useContext`, `useMemo`, `useState`). Sin servicios/Runtime/logica de negocio.
- **Arbol de render:** `Provider → Children` (correcto dentro de si mismo).
- **Orden de inicializacion:** `useState('')` → `useMemo({query, setQuery})` → `<Provider value=...>`.

## 6. A5 — Auditoria del Router (quien monta el Provider)

El Provider **no** pertenece a `main.jsx` ni a `App.jsx`. Lo monta `DashboardLayout` (envuelve el header con el Search Input y el `<Outlet/>`). DashboardLayout TAMBIEN consume el hook en su propio cuerpo -> contradiccion.

## 7. A6 — Auditoria del Context

- `const DashboardSearchContext = createContext(null)` — default `null`.
- `DashboardSearchProvider`: `value = useMemo(() => ({ query, setQuery }), [query])`.
- `useDashboardSearch`: `useContext(DashboardSearchContext)`; **lanza error cuando `ctx` es `null`** (no hay Provider ancestro). Ese es el mensaje observado.

## 8. PUNTO EXACTO DE LA EXCEPCION (I/...)

`src/layouts/DashboardLayout.jsx` — linea del cuerpo del componente:
`const { query, setQuery } = useDashboardSearch();`

Al renderizar `DashboardLayout`, sus ancestros (Router -> ProtectedRoute -> App -> AuthProvider -> StrictMode) NO incluyen ningun `DashboardSearchProvider`. El `DashboardSearchProvider` que DashboardLayout renderiza pertenece a su **propio output (children)**, por lo que NO es un ancestro de DashboardLayout. Por tanto el `useDashboardSearch()` de DashboardLayout no encuentra Provider y lanza la excepcion.

## 9. Causa raiz documentada

**Causa:** el componente `DashboardLayout` es, simultaneamente, **productor** (renderiza el Provider en su output) y **consumidor** (invoca `useDashboardSearch()` en su cuerpo). Un Provider nunca puede envolver al componente que lo renderiza. Esto viola la regla React Context:

```
Provider -> Consumer   (requerido)
Consumer -> Provider   (violado en DashboardLayout)
```

**Confirmado:** con la implementacion actual, `Dashboard.jsx` (Outlet) consume correctamente porque SÍ es descendiente del Provider. La unica falla es el consumo top-level en `DashboardLayout`.

## 10. Correccion arquitectonica propuesta (Sprint siguiente — NO aplicada en este Sprint)

**Opcion A (recomendada) — montar el Provider por encima del consumidor:**
Mover el `DashboardSearchProvider` de `DashboardLayout` a `App.jsx`, envolviendo el `<DashboardLayout />` (dentro de `<ProtectedRoute>`):
```
App.jsx: <ProtectedRoute><DashboardSearchProvider><DashboardLayout/></DashboardSearchProvider></ProtectedRoute>
```
`DashboardLayout` deja de renderizar el Provider y conserva `useDashboardSearch()` en su cuerpo (ahora valido, porque el Provider es ancestro). `Dashboard.jsx` (Outlet) continua consumiendo. Quitar el envoltorio `<DashboardSearchProvider>` del return de `DashboardLayout`.

**Opcion B — extraer el Search Input:**
Mantener el Provider en `DashboardLayout` (envuelve children), pero mover el consumo (`{query,setQuery}`) fuera del cuerpo de `DashboardLayout` a un componente hijo (e.g. `TopbarSearch`) renderizado bajo el Provider. `DashboardLayout` deja de invocar el hook directamente.

Ambas preservan: Layout dueño del Input, Provider dueño de `query/setQuery`, Dashboard dueño del indice; sin logica de negocio en el Context; SSOT intacto.

## 11. Restricciones respetadas (este Sprint)

No se movieron componentes sin evidencia; no se modifico Runtime/Dashboard/Providers funcionales; no se creo ni elimino Context; no se aplico correccion sin identificar la causa raiz.

## 12. Definition of Done (verificado)

- [x] Arbol React completamente auditado.
- [x] Router completamente auditado.
- [x] Provider completamente auditado.
- [x] Todos los consumidores inventariados.
- [x] Ownership validado.
- [x] Punto exacto del error identificado (`DashboardLayout.jsx` — body `useDashboardSearch()`).
- [x] Causa raiz documentada (Provider renderizado por su propio consumidor).
- [x] Correccion arquitectonica propuesta (Opcion A / Opcion B).
- [x] Sin cambios funcionales realizados.
- [x] SSOT preservado.

## 13. Certificacion — `sprint-217-dashboard-provider-integration-audit-certification.mjs`

Resultado esperado: **PA1–PA12 = 12/12 PASS** (ver suite).

## 14. FINAL CERTIFICATION

**LEVEL 5 — DASHBOARD SEARCH · PROVIDER INTEGRATION AUDITED · REACT TREE VALIDATED · ROOT CAUSE IDENTIFIED · OWNERSHIP CERTIFIED · SSOT PRESERVED · READY FOR CORRECTION (SPRINT 218)**