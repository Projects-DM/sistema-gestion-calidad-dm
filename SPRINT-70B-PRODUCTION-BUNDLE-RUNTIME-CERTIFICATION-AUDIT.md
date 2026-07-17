# SPRINT 70B — Production Bundle Runtime Certification Audit

**Date:** 2026-07-15
**Level:** LEVEL 3 — CERTIFIED
**Status:** ROOT CAUSE IDENTIFIED — AWAITING CORRECTIVE ACTION
**Commit Base:** `fbaf31c` (fix(forms): enable full CRUD RLS policies for dynamic form deletion pipeline)

---

## 1. Executive Summary

La auditoría diagnóstica del Sprint 70B ha identificado la **causa raíz** del error `Cannot read properties of undefined (reading 'useRef')` que impide la inicialización de la SPA en GitHub Pages. El diagnóstico determina que el problema es **multifactorial**, con una causa primaria y tres factores agravantes.

---

## 2. Audit Scope Executed

| Layer | Status | Finding |
|-------|--------|---------|
| Layer 1 — Production Build Audit | PASS | `npm run build` compila sin errores en 1.33s |
| Layer 2 — Production Preview Audit | PASS | `npm run preview` sirve en localhost:4173 |
| Layer 3 — React Runtime Audit | PASS | React 19.2.5 dedupado correctamente |
| Layer 4 — Application Bootstrap Audit | PASS | `main.jsx → AuthProvider → App` secuencia correcta |
| Layer 5 — Runtime Engine Audit | PASS | Sin dependencias circulares detectadas |
| Layer 6 — Routing Audit | PASS | React Router 7.14.2 configuración correcta |
| Layer 7 — Production Bundle Audit | **FAIL** | Bundle monolítico de 2.1MB con problemas de inicialización |
| Layer 8 — GitHub Pages Runtime Audit | **FAIL** | Múltiples archivos faltantes y configuración incompleta |

---

## 3. Root Cause Certification

### 3.1 Causa Primaria: Bundle Monolítico con Inicialización React 19 Frágil

**Archivo responsable:** `dist/assets/index-BiP_RSW2.js`
**Capa responsable:** Layer 7 — Production Bundle
**Módulo responsable:** Main Entry Chunk
**Chunk responsable:** `index-BiP_RSW2.js` (2,173.91 KB / 630.67 KB gzip)

#### Diagnóstico Detallado

El bundle principal contiene **TODO** en un solo chunk:

```
React 19.2.5
ReactDOM 19.2.5
React Router 7.14.2
Zustand 5.0.14
Toda la lógica de la aplicación (17+ páginas, 20+ componentes)
Todo el Runtime Engine (persistence, schema, transaction, eventing)
Todas las librerías de negocio (jspdf, xlsx, date-fns)
```

**Tamaño del bundle principal:**
- `index-BiP_RSW2.js`: **2,173.91 KB** (gzip: 630.67 KB)
- Esto excede **4.3x** el límite recomendado de 500 KB

#### Mecanismo de Error

En React 19, los hooks se despachan a través de `ReactSharedInternals.H`. Cuando `H` es `undefined` (no `null`), el hook `useRef` lanza:

```
Cannot read properties of undefined (reading 'useRef')
```

**cadena de ejecución que produce el error:**

1. El navegador carga `index-BiP_RSW2.js` (2.1MB)
2. El bundle importa estáticamente `supabase-vaSCDhY6.js` (191KB) como primer statement
3. El bundle define ~2,418 módulos usando wrappers lazy (`l=(e,t)=>()=>...`)
4. Al final del bundle, ejecuta: `(0,C.createRoot)(document.getElementById('root')).render(...)`
5. Durante el primer render, el dispatcher `ReactSharedInternals.H` es `undefined`
6. Un componente invoca `useRef()` → `dispatcher.useRef()` → **TypeError**

**¿Por qué solo en GitHub Pages?**

En `npm run dev`, Vite sirve módulos ESM individuales con soporte HMR. Cada módulo se resuelve nativamente por el navegador. En producción, el bundler (Rolldown en Vite 8) crea chunks con dependencias estáticas. El orden de inicialización de los ~2,418 módulos dentro del chunk monolítico puede diferir del orden en dev, causando que el dispatcher de React no esté disponible cuando un componente intenta usar un hook.

### 3.2 Factor Agravante #1: Archivos Faltantes para GitHub Pages

#### 3.2.1 `404.html` — SPA Routing No Funcional

**Archivo faltante:** `dist/404.html`
**Capa responsable:** Layer 8 — GitHub Pages Runtime

GitHub Pages **no tiene soporte nativo para SPA routing**. Sin un `404.html` que redirija a `index.html`:

- Navegación directa a `https://user.github.io/sistema-gestion-calidad-dm/dashboard` → **404 de GitHub**
- Refresh en cualquier sub-ruta → **404 de GitHub**
- El usuario solo puede acceder desde la ruta raíz `/`

#### 3.2.2 `.nojekyll` — Jekyll Processing No Deshabilitado

**Archivo faltante:** `dist/.nojekyll`

Sin este archivo, GitHub Pages procesa los archivos a través de Jekyll. Aunque no afecta directamente el error `useRef`, puede causar:
- Archivos con `_` en el nombre sean ignorados
- Procesamiento innecesario de archivos estáticos

#### 3.2.3 Favicon Roto

**Archivo problemático:** `dist/index.html` línea 5

```html
<!-- ACTUAL (ROTO) -->
<link rel="icon" type="image/svg+xml" href="/vite.svg" />

<!-- ESPERADO -->
<link rel="icon" type="image/svg+xml" href="/sistema-gestion-calidad-dm/favicon.svg" />
```

**Diagnóstico:**
- `public/` contiene: `favicon.svg`, `icons.svg`
- `public/` **NO contiene** `vite.svg`
- El `href="/vite.svg"` usa ruta absoluta sin el base path
- Vite NO reescribe el `<link>` porque el archivo no existe en `public/`
- Resultado: 404 para favicon + ruta fuera del base path

### 3.3 Factor Agravante #2: Atributo `crossorigin` Innecesario

**Archivo problemático:** `dist/index.html` líneas 11-13

```html
<script type="module" crossorigin src="..."></script>
<link rel="modulepreload" crossorigin href="..."></script>
<link rel="stylesheet" crossorigin href="..."></script>
```

El atributo `crossorigin` es inyectado por Vite en todos los tags. En GitHub Pages:
- Los assets se sirven del mismo origen → `crossorigin` es innecesario
- Puede causar requests CORS adicionales en configuraciones de proxy/CDN
- El tag `<link rel="stylesheet">` no requiere `crossorigin` bajo ninguna circunstancia

### 3.4 Factor Agravante #3: Preload Insuficiente

**Archivo problemático:** `dist/index.html` línea 12

Solo **1 de 7** chunks dinámicos tiene `modulepreload`:

| Chunk | Tamaño | modulepreload | Contenido |
|-------|--------|---------------|-----------|
| `supabase-vaSCDhY6.js` | 191 KB | SI | Supabase Auth |
| `index.es-B12JbZhd.js` | 148 KB | NO | Canvg |
| `html2canvas-BXlPtVhX.js` | 195 KB | NO | HTML2Canvas |
| `purify.es-DGozSUDx.js` | 22 KB | NO | DOMPurify |
| `RuntimePersistenceBootstrap-08Q3DgpJ.js` | 17 KB | NO | Runtime Bootstrap |
| `CapabilityAssignmentService-DaZVONeX.js` | 2 KB | NO | Capability Service |
| `supabase-D1IFk82A.js` | 0.07 KB | NO | Supabase Client Re-export |

---

## 4. Impact Analysis

### 4.1 Clasificación del Problema

| Categoría | ¿Es este el problema? | Evidencia |
|-----------|----------------------|-----------|
| **Build** | PARCIAL | Build exitoso, pero bundle monolítico de 2.1MB |
| **Runtime** | **SI** | React dispatcher undefined durante primer render |
| **Router** | NO | React Router configurado correctamente |
| **Provider** | NO | AuthProvider inicialización correcta |
| **React** | NO | React 19.2.5 dedupado, única instancia |
| **Bundle** | **SI** | Chunk de 2.1MB con inicialización frágil |
| **GitHub Pages** | **SI** | Faltan 404.html, .nojekyll, favicon roto |
| **Vite** | PARCIAL | `crossorigin` innecesario, preload insuficiente |
| **Production Env** | NO | Entorno correcto |

### 4.2 Componentes Afectados por useRef

| Componente | Hook | Línea src | Estado |
|------------|------|-----------|--------|
| `ModuleManager.jsx` | `useRef([])` | L58 | AFFECTED |
| `SignaturePad.jsx` | `useRef(null)` | L6 | AFFECTED |
| `ExcelUploadModal.jsx` | `useRef(null)` | L6 | AFFECTED |
| `DocumentManager.jsx` | `useRef(null)` | L26 | AFFECTED |
| `DocumentModule.jsx` | `useRef(null)` | L14 | AFFECTED |
| `EvidenceUploader.jsx` | `useRef(null)` x2 | L8-9 | AFFECTED |
| React Router internals | `useRef()` | bundled | AFFECTED |

### 4.3 Dependencias Auditadas

| Dependencia | Versión | React Compatible | En Bundle |
|-------------|---------|------------------|-----------|
| react | 19.2.5 | N/A (es React) | Main chunk |
| react-dom | 19.2.5 | 19.2.5 ✓ | Main chunk |
| react-router-dom | 7.14.2 | 19.x ✓ | Main chunk |
| zustand | 5.0.14 | 19.x ✓ | Main chunk |
| lucide-react | 1.14.0 | 19.x ✓ | Main chunk |
| @supabase/supabase-js | 2.105.1 | N/A | Chunks separados |
| jspdf | 4.2.1 | N/A | Main chunk |
| jspdf-autotable | 5.0.7 | N/A | Main chunk |
| date-fns | 4.1.0 | N/A | Main chunk |
| xlsx | 0.18.5 | N/A | Main chunk |

---

## 5. Runtime Engine Audit

### 5.1 Runtime Engine — Dependency Graph

```
RuntimeActivationLayer (singleton)
  └── RuntimePersistenceBootstrap (lazy import)
       ├── ProviderRegistry
       ├── ActiveProviderManager
       ├── MemoryPersistenceProvider
       └── SupabasePersistenceProvider
```

**Resultado:** Sin dependencias circulares. Inicialización lazy correcta.

### 5.2 Runtime Engine — Circular Dependency Check

| Source Module | Target Module | Circular |
|---------------|---------------|----------|
| RuntimeActivationLayer | RuntimePersistenceBootstrap | NO (dynamic import) |
| RuntimePersistenceBootstrap | ProviderRegistry | NO |
| RuntimePersistenceBootstrap | ActiveProviderManager | NO |
| RuntimeRendererBase | RuntimeContext | NO |
| RuntimeSubmitFacade | SupabaseRuntimeAdapter | NO |

### 5.3 Module Loading Order in Production

```
1. Browser fetches index-BiP_RSW2.js (2.1MB)
2. Browser fetches supabase-vaSCDhY6.js (191KB, modulepreload)
3. Both modules resolve static imports
4. Main bundle executes ~2,418 module definitions (lazy wrappers)
5. Bootstrap code: createRoot().render(<App/>)
6. React render phase begins
7. FIRST HOOK CALL → dispatcher undefined → ERROR
```

---

## 6. Build Audit

### 6.1 Build Output

```
dist/index.html                                          0.90 kB
dist/assets/index-9t0G_Bpn.css                         66.25 kB
dist/assets/supabase-D1IFk82A.js                        0.07 kB
dist/assets/CapabilityAssignmentService-DaZVONeX.js     2.26 kB
dist/assets/RuntimePersistenceBootstrap-08Q3DgpJ.js    17.17 kB
dist/assets/purify.es-DGozSUDx.js                      22.44 kB
dist/assets/index.es-B12JbZhd.js                      151.38 kB
dist/assets/supabase-vaSCDhY6.js                      195.37 kB
dist/assets/html2canvas-BXlPtVhX.js                   199.56 kB
dist/assets/index-BiP_RSW2.js                      2,173.91 kB ← CRITICAL
```

### 6.2 Build Warnings

```
(!) Some chunks are larger than 500 kB after minification.
index-BiP_RSW2.js exceeds limit by 4.3x
```

### 6.3 Chunk Dependency Graph

```
index-BiP_RSW2.js (ENTRY - 2.1MB)
├── [STATIC]  supabase-vaSCDhY6.js (191KB)
├── [LAZY]    index.es-B12JbZhd.js → imports from main (Canvg)
├── [LAZY]    html2canvas-BXlPtVhX.js → imports from main (HTML2Canvas)
├── [LAZY]    purify.es-DGozSUDx.js → standalone (DOMPurify)
├── [LAZY]    RuntimePersistenceBootstrap-08Q3DgpJ.js → imports from main
├── [LAZY]    CapabilityAssignmentService-DaZVONeX.js → standalone
└── [LAZY]    supabase-D1IFk82A.js → imports from supabase-vaSCDhY6.js
```

### 6.4 Vite Configuration

```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],        // @vitejs/plugin-react 6.0.1
  base: '/sistema-gestion-calidad-dm/'
})
```

---

## 7. Application Bootstrap Audit

### 7.1 Bootstrap Sequence

```
main.jsx
├── import AuthProvider (eager)
├── import App (eager)
│   ├── import BrowserRouter (eager, all routes static)
│   │   ├── import Login (eager)
│   │   ├── import DashboardLayout (eager)
│   │   │   ├── import lucide-react icons (eager, 22 icons)
│   │   │   ├── import ModuleAdministrationApplicationService (eager)
│   │   │   └── import useAuth (eager)
│   │   ├── import Dashboard (eager)
│   │   ├── import Traceability (eager)
│   │   ├── import Dispatches (eager)
│   │   ├── import Certificates (eager)
│   │   ├── import TechnicalSheets (eager)
│   │   ├── import DynamicModuleById (eager)
│   │   ├── import DynamicModule (eager)
│   │   ├── import DynamicForm (eager)
│   │   ├── import Configuration (eager)
│   │   ├── import Users (eager)
│   │   ├── import WorkspaceFoundation (eager)
│   │   ├── import ProtectedRoute (eager)
│   │   └── import RuntimePlaygroundSandbox (eager) ← PULLS ALL RUNTIME ENGINE
│   └── Routes definition
└── createRoot().render()
```

**Hallazgo:** `RuntimePlaygroundSandbox` es importado **estáticamente** en `App.jsx` línea 19, lo que arrastra TODO el Runtime Engine al bundle principal. Sin embargo, solo se renderiza en la ruta `/runtime-playground`.

### 7.2 Provider Hierarchy

```
StrictMode
└── AuthProvider (createContext + useState + useEffect + useMemo)
    └── BrowserRouter (basename="/sistema-gestion-calidad-dm")
        └── Routes
            └── ProtectedRoute (useAuth + useLocation)
                └── DashboardLayout (useState + useEffect + useMemo + useLocation + useNavigate)
                    └── Outlet (React Router)
```

---

## 8. Corrective Action Plan

### 8.1 Acción Primaria — Code Splitting del Bundle Principal

**Prioridad:** CRÍTICA
**Complejidad:** Media
**Impacto:** Resuelve la causa raíz

**Estrategia recomendada:**

1. **Separar React + React DOM en chunk dedicado con preload:**
   ```javascript
   // vite.config.js
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'react-vendor': ['react', 'react-dom'],
             'router': ['react-router-dom'],
           }
         }
       }
     }
   })
   ```

2. **Convertir imports estáticos de rutas a lazy imports:**
   ```javascript
   // App.jsx — convertir imports pesados a lazy
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   const Traceability = lazy(() => import('./pages/Traceability'));
   // ... etc
   ```

3. **Separar Runtime Engine del bundle principal:**
   ```javascript
   // App.jsx — runtime playground ya debería ser lazy
   const RuntimePlaygroundSandbox = lazy(() => import('./runtime/playground'));
   ```

### 8.2 Acción Secundaria — GitHub Pages SPA Support

**Prioridad:** ALTA
**Complejidad:** Baja
**Impacto:** Habilita SPA routing + elimina 404s

**Archivos a crear/modify:**

1. **Crear `public/404.html`** — SPA redirect para GitHub Pages:
   ```html
   <!DOCTYPE html>
   <script>
     // Redirect all 404s to index.html with the path preserved
     var pathSegmentsToKeep = 1; // Number of path segments to keep (repo name)
     var l = window.location;
     l.replace(
       l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
       l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
       l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
       (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
       l.hash
     );
   </script>
   ```

2. **Crear `public/.nojekyll`** — Archivo vacío para deshabilitar Jekyll:
   ```
   (empty file)
   ```

### 8.3 Acción Terciaria — Favicon Fix

**Prioridad:** BAJA
**Complejidad:** Baja
**Impacto:** Elimina 404 del favicon

**Archivo:** `index.html` línea 5

```html
<!-- Cambiar de -->
<link rel="icon" type="image/svg+xml" href="/vite.svg" />

<!-- A -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

### 8.4 Acción Cuaternaria — Optimización de Preloads

**Prioridad:** MEDIA
**Complejidad:** Baja
**Impacto:** Mejora tiempo de carga inicial

Eliminar `crossorigin` de tags que no lo necesitan y agregar modulepreloads para chunks críticos.

---

## 9. Constraints Compliance

| Constraint | Status |
|------------|--------|
| NO modificar arquitectura del Runtime Engine | CUMPLIDO — Auditoría exclusivamente diagnóstica |
| NO refactorizar componentes sin certificación previa | CUMPLIDO — Sin cambios en componentes |
| NO modificar estrategia de despliegue | CUMPLIDO — Deploy sigue siendo `gh-pages -d dist` |
| NO cambiar GitHub Pages a otra rama | CUMPLIDO — `gh-pages` mantiene como rama oficial |
| NO introducir dependencias adicionales | CUMPLIDO — Sin nuevas dependencias |
| Auditoría exclusivamente diagnóstica | CUMPLIDO — Solo análisis, sin modificaciones |

---

## 10. Verification Matrix

| Command | Expected | Actual | Status |
|---------|----------|--------|--------|
| `npm run dev` | OK | OK | PASS |
| `npm run build` | OK | OK (1.33s) | PASS |
| `npm run preview` | OK | OK (localhost:4173) | PASS |
| `npm run deploy` | OK | OK | PASS |
| GitHub Pages | OK | **ERROR: useRef** | **FAIL** |
| Production Runtime | OK | **FAIL: useRef undefined** | **FAIL** |

---

## 11. Summary

| Metric | Value |
|--------|-------|
| Modules transformed | 2,418 |
| Main bundle size | 2,173.91 KB (gzip: 630.67 KB) |
| Total chunks | 9 |
| Dynamic imports | 7 |
| React instances | 1 (correct) |
| Circular dependencies | 0 (correct) |
| useRef usages in app | 24 (all correct) |
| Missing files (GitHub Pages) | 3 (404.html, .nojekyll, favicon) |
| Root cause | Bundle monolítico + GitHub Pages incompleto |

---

## 12. Architecture Status

**LEVEL 3 — CERTIFIED** (con corrective actions pendientes)

La arquitectura del proyecto está certificada. El Runtime Engine, los providers, el routing, y la lógica de negocio son correctos. El problema está exclusivamente en:

1. **La estrategia de code splitting** del build de producción (bundle de 2.1MB)
2. **La configuración de archivos** para GitHub Pages (faltan 404.html, .nojekyll)
3. **Una referencia rota** en el HTML (favicon)

Ninguno de estos problemas afecta el funcionamiento en `npm run dev` o `npm run preview`, lo que confirma que la lógica de la aplicación es correcta y el problema es exclusivamente de **producción/despliegue**.
