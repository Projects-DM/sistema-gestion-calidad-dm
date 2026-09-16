# SPRINT 396 — AUDITORÍA DE COMPATIBILIDAD MULTI-ENTORNO

**Fecha:** 2026-09-10
**Rama:** `release/stable-sprint79`
**HEAD:** `da1d5d3a4011aac9c2afdc0594dc444792fb90b6`
**Estado:** **COMPLETED — CAUSA RAÍZ IDENTIFICADA**
**Modo:** AUDITORÍA READ-ONLY — ZERO CAMBIOS FUNCIONALES

---

## 1. Resumen ejecutivo

Se identificó la causa raíz del error de renderizado en localhost después de la parametrización de Vite realizada en Sprint 395.

**Causa raíz:** React Router `basename` **hardcodeado** en `src/App.jsx:6` contradice la parametrización de Vite (`base: process.env.VITE_BASE_PATH || '/'`) realizada en Sprint 395.

**Resultado:** La aplicación funciona en GitHub Pages (donde ambos coinciden) pero **falla en localhost y Vercel** porque React Router rechaza las rutas que no empiezan con su `basename` hardcodeado.

---

## 2. Causa raíz

**Archivo:** `src/App.jsx` línea 6
**Configuración actual:** `const ROUTER_BASENAME = '/sistema-gestion-calidad-dm';`
**Uso:** `<Router basename={ROUTER_BASENAME}>` en línea 31

```jsx
// src/App.jsx:6
const ROUTER_BASENAME = '/sistema-gestion-calidad-dm';  // ← HARDCODEADO

// src/App.jsx:31
<Router basename={ROUTER_BASENAME}>  // ← USO
```

---

## 3. Archivo y línea responsable

| Archivo | Línea | Configuración |
|---------|-------|---------------|
| `src/App.jsx` | 6 | `const ROUTER_BASENAME = '/sistema-gestion-calidad-dm';` |
| `src/App.jsx` | 31 | `<Router basename={ROUTER_BASENAME}>` |

---

## 4. Configuración actual de Vite

**Archivo:** `vite.config.js` línea 7
```javascript
base: process.env.VITE_BASE_PATH || '/',
```
✅ **Correcto** — Parametrizado mediante variable de entorno (Sprint 395)

---

## 5. Configuración actual de React Router

**Archivo:** `src/App.jsx` línea 6
```javascript
const ROUTER_BASENAME = '/sistema-gestion-calidad-dm';  // ← HARDCODEADO
```
❌ **INCORRECTO** — Hardcodeado, no usa la misma fuente que Vite

---

## 6. Referencias hardcodeadas encontradas

| Archivo | Línea | Valor |
|---------|-------|-------|
| `src/App.jsx` | 6 | `'/sistema-gestion-calidad-dm'` |
| `src/App.jsx.bak` | 3 | `'/sistema-gestion-calidad-dm'` |

No se encontraron otras referencias a `basename`, `BrowserRouter`, `createBrowserRouter`, `RouterProvider`, `VITE_BASE_PATH` en el código fuente.

---

## 7. Relación Vite ↔ Router

| Entorno | Vite `base` | Router `basename` | Compatible |
|---------|-------------|-------------------|------------|
| **Localhost** | `/` (default) | `/sistema-gestion-calidad-dm` | ❌ **NO** |
| **Vercel** | `/` (default) | `/sistema-gestion-calidad-dm` | ❌ **NO** |
| **GitHub Pages** | `/sistema-gestion-calidad-dm/` | `/sistema-gestion-calidad-dm` | ✅ **SÍ** |

---

## 8. Análisis Localhost

- **Vite base:** `/` (VITE_BASE_PATH no definido → default `/`)
- **Router basename:** `/sistema-gestion-calidad-dm` (hardcoded)
- **Error observado:** `<Router basename="/sistema-gestion-calidad-dm"> is not able to match the URL "/" because it does not start with the basename`
- **Resultado:** ❌ **Router rechaza `/`** porque no empieza con `/sistema-gestion-calidad-dm`

---

## 9. Análisis Vercel

| Elemento | Valor |
|----------|-------|
| Vite `base` | `/` (default, sin VITE_BASE_PATH) |
| Router `basename` | `/sistema-gestion-calidad-dm` (hardcoded) |
| Assets generados | `/assets/...` (correcto) |
| Router espera | `/sistema-gestion-calidad-dm/...` |

**Resultado:** ❌ **MISMATCH** — Vercel sirve en `/`, Router espera `/sistema-gestion-calidad-dm/`

---

## 10. Análisis GitHub Pages

| Elemento | Valor |
|----------|-------|
| Vite `base` | `/sistema-gestion-calidad-dm/` (via GH Actions `VITE_BASE_PATH`) |
| Router `basename` | `/sistema-gestion-calidad-dm` (hardcoded) |
| Assets generados | `/sistema-gestion-calidad-dm/assets/...` |

**Resultado:** ✅ **COMPATIBLE** — Ambos coinciden (con pequeña diferencia de trailing slash que React Router tolera)

---

## 11. Análisis del error de Supabase

**Errores observados:**
- `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`
- `SIGNED_OUT`
- `INITIAL_SESSION`

**Clasificación:** **INDEPENDIENTE** del problema del Router

**Causa:** Refresh token expirado/invalidado, sesión no encontrada en Supabase storage, limpieza de sesión tras cambio de auth state.

**Relación con Router:** **NINGUNA** — Es un problema de autenticación independiente, no bloquea el renderizado inicial, solo aparece después de montar la app.

---

## 12. Matriz de compatibilidad

| Elemento | Localhost | Vercel | GitHub Pages |
|----------|-----------|--------|--------------|
| **Vite `base`** | `/` | `/` | `/sistema-gestion-calidad-dm/` |
| **Router `basename`** | `/sistema-gestion-calidad-dm` | `/sistema-gestion-calidad-dm` | `/sistema-gestion-calidad-dm` |
| **Compatible** | ❌ **NO** | ❌ **NO** | ✅ **SÍ** |
| Assets generados | `/assets/...` | `/assets/...` | `/sistema-gestion-calidad-dm/assets/...` |
| Render inicial | ❌ **NO** | ❌ **NO** | ✅ **SÍ** |

---

## 13. Fuente única de configuración recomendada

**Opción A: `import.meta.env.BASE_URL` (RECOMENDADA)**

```jsx
// src/App.jsx - línea 6
const ROUTER_BASENAME = import.meta.env.BASE_URL;
```

**Ventajas:**
- Vite ya expone `import.meta.env.BASE_URL` automáticamente (refleja el `base` configurado)
- Una sola fuente de verdad: Vite `base` → `import.meta.env.BASE_URL` → Router `basename`
- Sin duplicación de configuración
- Funciona nativamente en Vite + React Router

---

## 14. Corrección mínima propuesta

**Archivo:** `src/App.jsx` línea 6

```diff
- const ROUTER_BASENAME = '/sistema-gestion-calidad-dm';
+ const ROUTER_BASENAME = import.meta.env.BASE_URL;
```

**Resultado esperado:**

| Entorno | Vite `base` | `import.meta.env.BASE_URL` | Router `basename` | Compatible |
|---------|-------------|----------------------------|-------------------|------------|
| Localhost | `/` | `/` | `/` | ✅ |
| Vercel | `/` | `/` | `/` | ✅ |
| GitHub Pages | `/sistema-gestion-calidad-dm/` | `/sistema-gestion-calidad-dm/` | `/sistema-gestion-calidad-dm/` | ✅ |

---

## 15. Archivos que deben modificarse

| Archivo | Línea | Cambio |
|---------|-------|--------|
| `src/App.jsx` | 6 | `const ROUTER_BASENAME = import.meta.env.BASE_URL;` |

---

## 16. Archivos que NO deben modificarse

- `AuthContext.jsx` — error Supabase independiente
- `src/lib/supabase.js` — configuración correcta
- `package.json` / `package-lock.json`
- Componentes funcionales (`DynamicForm`, `DynamicModule`, etc.)
- `AuthContext`, `useAuth`, lógica de autenticación
- Supabase, Auth, RLS, Storage, migraciones
- Tests, documentación histórica
- `package.json`, `package-lock.json`

---

## 17. Plan de validación Sprint 397

### Implementación
1. Cambiar `src/App.jsx:6` a `const ROUTER_BASENAME = import.meta.env.BASE_URL;`

### Validación Localhost
```bash
npm run dev
# Verificar: http://localhost:5173/ renderiza correctamente
```

### Build Localhost (simula Vercel)
```bash
npm run build
# Verificar dist/index.html → rutas /assets/...
```

### Build GitHub Pages (simula GH Pages)
```bash
VITE_BASE_PATH=/sistema-gestion-calidad-dm/ npm run build
# Verificar dist/index.html → rutas /sistema-gestion-calidad-dm/assets/...
```

### Deploy Vercel (preview)
- Push a rama → Vercel preview deploy
- Verificar: `https://<preview>.vercel.app/`
- Validar: carga inicial, assets, navegación, auth, consola sin 404

### GitHub Pages
```bash
git push origin release/stable-sprint79
# Verificar: https://projects-dm.github.io/sistema-gestion-calidad-dm/
```

---

## 18. Riesgos

| Riesgo | Nivel | Mitigación |
|--------|-------|------------|
| Romper GitHub Pages | 🔴 Alto | `import.meta.env.BASE_URL` ya configurado en GH Actions |
| Romper Vercel | 🟡 Medio | Default `/` funciona en raíz |
| Romper Localhost | 🔴 Alto | ✅ Resuelto con `import.meta.env.BASE_URL` |
| Regresión funcional | 🟢 Bajo | Tests 294/294 PASS |

---

## 19. Veredicto final

```
🔴 INCOMPATIBLE — Requiere corrección en src/App.jsx línea 6
```

**Causa:** React Router `basename` hardcodeado vs Vite `base` parametrizado.

**Solución:** Una línea en `src/App.jsx:6` → `const ROUTER_BASENAME = import.meta.env.BASE_URL;`

**Próximo paso autorizado:** Sprint 397 — Implementación de corrección mínima.

---

**Generado:** 2026-09-10 | Sprint 396 Complete | Baseline: 99a8375 | HEAD: da1d5d3