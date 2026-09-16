# Sprint 394 — Deployment Compatibility Audit: GitHub Pages + Vercel

**Fecha:** 2026-09-10
**Rama:** `release/stable-sprint79`
**HEAD:** `da1d5d3a4011aac9c2afdc0594dc444792fb90b6`
**Modo:** AUDITORÍA READ-ONLY — ZERO CAMBIOS FUNCIONALES

---

## 1. RESUMEN EJECUTIVO

**Causa raíz confirmada:** `vite.config.js` tiene `base: '/sistema-gestion-calidad-dm/'` **hardcoded**, optimizado solo para GitHub Pages (subruta). Vercel sirve desde raíz `/`, por lo que los assets referenciados con prefijo `/sistema-gestion-calidad-dm/` devuelven 404.

GitHub Pages funciona porque sirve bajo `https://projects-dm.github.io/sistema-gestion-calidad-dm/`, coincidiendo con el `base` hardcodeado. Vercel sirve desde raíz `/`, por lo que las peticiones a `/sistema-gestion-calidad-dm/assets/...` fallan con 404.

**Solución:** Configurar `base` mediante variable de entorno (`VITE_BASE_PATH`) en lugar de hardcodeado.

---

## 2. ESTADO ACTUAL

| Propiedad | Valor |
|-----------|-------|
| **Rama** | `release/stable-sprint79` |
| **HEAD** | `da1d5d3a4011aac9c2afdc0594dc444792fb90b6` |
| **Working tree** | Clean (solo archivos `.bak` y `.env` locales ignorados) |
| **GitHub Pages** | ✅ Funcionando (subruta `/sistema-gestion-calidad-dm/`) |
| **Vercel** | ❌ 404 en assets (prefijo incorrecto) |
| **Build** | ✅ PASS (4.32s) |
| **Dist** | Existe, generado con `base: '/sistema-gestion-calidad-dm/'` |
| **Remote** | `origin` → `github.com/Projects-DM/sistema-gestion-calidad-dm` |

---

## 3. HALLAZGOS

| ID | Hallazgo | Evidencia | Severidad |
|----|----------|-----------|-----------|
| **A-001** | `base` hardcodeado en `vite.config.js` | `vite.config.js:7` → `base: '/sistema-gestion-calidad-dm/'` | 🔴 CRÍTICO |
| **A-002** | No existe `vercel.json` | No hay archivo de configuración Vercel | 🟡 MEDIO |
| **A-003** | GitHub Actions usa build estándar | `.github/workflows/deploy-pages.yml:46` → `npm run build` | 🟢 INFO |
| **A-004** | `base` hardcodeado para GitHub Pages | Funciona en GH Pages (subruta), falla en Vercel (raíz) | 🔴 CRÍTICO |
| **A-005** | No existe `vercel.json` | No hay configuración Vercel versionada | 🟡 MEDIO |
| **A-006** | Assets generados con prefijo `/sistema-gestion-calidad-dm/` | `dist/index.html` líneas 11-18 | 🔴 CRÍTICO |

---

## 4. ANÁLISIS DE LOS 404

| Asset (error reportado) | ¿Existe en dist? | Ruta generada en index.html | Ruta solicitada en Vercel | Diagnóstico |
|-------------------------|------------------|----------------------------|---------------------------|-------------|
| `jspdf.plugin.autotable-C025hhWW.js` | ✅ Sí (`dist/assets/`) | `/sistema-gestion-calidad-dm/assets/jspdf.plugin.autotable-C025hhWW.js` | `/sistema-gestion-calidad-dm/assets/...` → 404 | Prefijo incorrecto en Vercel |
| `supabase-RBls0YNa.js` | ⚠️ Hash distinto (`supabase-BSsRzCe5.js`) | `/sistema-gestion-calidad-dm/assets/supabase-BSsRzCe5.js` | `/sistema-gestion-calidad-dm/assets/...` → 404 | Hash distinto + prefijo incorrecto |
| `jspdf.es.min-fBS08RBW.js` | ✅ Sí | `/sistema-gestion-calidad-dm/assets/jspdf.es.min-fBS08RBW.js` | `/sistema-gestion-calidad-dm/assets/...` → 404 | Prefijo incorrecto |
| `chunk-jRWAZmH_.js` | ✅ Sí | `/sistema-gestion-calidad-dm/assets/chunk-jRWAZmH_.js` | `/sistema-gestion-calidad-dm/assets/...` → 404 | Prefijo incorrecto |
| `preload-helper-1W5ugp1d.js` | ✅ Sí | `/sistema-gestion-calidad-dm/assets/preload-helper-1W5ugp1d.js` | `/sistema-gestion-calidad-dm/assets/...` → 404 | Prefijo incorrecto |
| `index-DI-ic6m9.css` | ✅ Sí | `/sistema-gestion-calidad-dm/assets/index-DI-ic6m9.css` | `/sistema-gestion-calidad-dm/assets/...` → 404 | Prefijo incorrecto |
| `typeof-4GwhTj0O.js` | ✅ Sí | `/sistema-gestion-calidad-dm/assets/typeof-4GwhTj0O.js` | `/sistema-gestion-calidad-dm/assets/...` → 404 | Prefijo incorrecto |
| `index-D-f5WpME.js` | ⚠️ Hash distinto (`index-CVFpbDkH.js`) | `/sistema-gestion-calidad-dm/assets/index-CVFpbDkH.js` | `/sistema-gestion-calidad-dm/assets/...` → 404 | Hash distinto + prefijo incorrecto |

**Patrón confirmado:** Todos los assets fallan por el mismo motivo — prefijo `/sistema-gestion-calidad-dm/` en las rutas generadas por Vite.

---

## 5. CAUSA RAÍZ

### Causa Confirmada: **`base` hardcodeado en `vite.config.js:7`**

```javascript
// vite.config.js:7
base: '/sistema-gestion-calidad-dm/',
```

### Evidencia concreta:
1. `vite.config.js:7` → `base: '/sistema-gestion-calidad-dm/'` (hardcoded)
2. `dist/index.html` líneas 11-18 → todos los assets referenciados con prefijo `/sistema-gestion-calidad-dm/`
3. GitHub Pages: URL = `https://projects-dm.github.io/sistema-gestion-calidad-dm/` → **coincide** con `base`
4. Vercel: URL = `https://<proyecto>.vercel.app/` → **NO coincide** con `base`

### Por qué GitHub Pages funciona:
GitHub Pages sirve el sitio en `https://projects-dm.github.io/sistema-gestion-calidad-dm/`. El navegador resuelve `/sistema-gestion-calidad-dm/assets/...` relativo a esa URL, resolviendo correctamente a `https://projects-dm.github.io/sistema-gestion-calidad-dm/assets/...`

### Por qué Vercel falla:
Vercel sirve en la raíz del dominio (ej. `https://<proyecto>.vercel.app/`). El navegador solicita `/sistema-gestion-calidad-dm/assets/...` relativo a la raíz, resultando en `https://<proyecto>.vercel.app/sistema-gestion-calidad-dm/assets/...` → **404** (Vercel no tiene esa subruta).

---

## 6. COMPATIBILIDAD GITHUB PAGES + VERCEL

### Estrategia Recomendada: **Variable de entorno `VITE_BASE_PATH`**

**Cambio en `vite.config.js`:**
```javascript
// vite.config.js
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',  // ← Cambio aquí
  plugins: [react()],
  build: { sourcemap: true }
})
```

**GitHub Actions (`.github/workflows/deploy-pages.yml`):**
```yaml
- name: Build with Supabase environment variables
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    VITE_BASE_PATH: '/sistema-gestion-calidad-dm/'  # ← Agregar
  run: npm run build
```

**Vercel:** No requiere cambios. Vercel no define `VITE_BASE_PATH` → usa default `/` (raíz).

### Ventajas de esta estrategia:
| Aspecto | Evaluación |
|---------|------------|
| **Ventaja** | Un solo código fuente, un build command, ambos despliegues funcionan |
| **Riesgo** | Muy bajo (cambio mínimo, variable de entorno estándar) |
| **Impacto GitHub Pages** | ✅ Preservado (variable en GitHub Actions) |
| **Impacto Vercel** | ✅ Habilitado (default `/` funciona en raíz) |
| **Complejidad** | Muy baja (1 línea en vite.config.js + 1 línea en workflow) |
| **Mantenibilidad** | Alta (configuración explícita, sin magia) |

---

## 7. RIESGOS

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Romper GitHub Pages** | Baja | Crítico | Variable en GitHub Actions preserva comportamiento actual |
| **Romper Vercel** | Baja | Crítico | Default `/` funciona en raíz de Vercel |
| **Romper build local** | Muy baja | Medio | Default `/` funciona en `npm run build` local |
| **Variable no definida en CI** | Muy baja | Medio | Default `/` es seguro |
| **Cache de Vercel** | Media | Medio | `vercel --force` o redeploy limpio |

---

## 8. PLAN DE CORRECCIÓN PROPUESTO

### Corrección Mínima (2 archivos)

**1. `vite.config.js`:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',  // ← Cambio: variable de entorno
  build: {
    sourcemap: true
  }
})
```

**2. `.github/workflows/deploy-pages.yml`:**
```yaml
- name: Build with Supabase environment variables
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    VITE_BASE_PATH: '/sistema-gestion-calidad-dm/'  # ← Agregar
  run: npm run build
```

### Validación Post-Corrección

| Paso | Comando | Esperado |
|------|---------|----------|
| **Build GitHub Pages** | `VITE_BASE_PATH=/sistema-gestion-calidad-dm/ npm run build` | `index.html` con prefijo `/sistema-gestion-calidad-dm/` |
| **Build Vercel** | `npm run build` (sin VITE_BASE_PATH) | `index.html` con rutas `/assets/...` |
| **Deploy GitHub Pages** | Push a `release/stable-sprint79` | GitHub Actions usa variable → funciona |
| **Deploy Vercel** | Push a Vercel / `vercel deploy` | Vercel usa default `/` → funciona |

### Regresión GitHub Pages
- **Riesgo:** Muy bajo
- **Validación:** Verificar que `dist/index.html` genera prefijo `/sistema-gestion-calidad-dm/` cuando `VITE_BASE_PATH` está definido
- **Rollback:** Revertir `vite.config.js` y workflow si hay problema

### Validación Vercel
- **Riesgo:** Muy bajo  
- **Validación:** Deploy de prueba en Vercel preview, verificar que assets cargan sin 404
- **Rollback:** Revertir cambios si hay problema

---

## 8. VEREDICTO SPRINT 394

### 🟡 **Compatible con corrección controlada**

El proyecto es **compatible con ambos despliegues** aplicando la corrección mínima propuesta. No requiere duplicar código ni mantener dos ramas.

---

## 10. ARCHIVOS QUE DEBERÍAN MODIFICARSE EN EL SIGUIENTE SPRINT

| Archivo | Cambio | Prioridad |
|---------|--------|-----------|
| `vite.config.js` | `base: process.env.VITE_BASE_PATH || '/'` | 🔴 CRÍTICO |
| `.github/workflows/deploy-pages.yml` | Agregar `VITE_BASE_PATH: '/sistema-gestion-calidad-dm/'` en env del build | 🔴 CRÍTICO |

**No modificar en este sprint (394):**
- `package.json` (no necesario)
- `vercel.json` (no necesario, opcional para configuración avanzada)
- Código React / lógica de negocio
- Supabase config
- Otros archivos

---

## 9. ARCHIVOS A MODIFICAR EN SIGUIENTE SPRINT (Resumen)

```
vite.config.js                    ← base: process.env.VITE_BASE_PATH || '/'
.github/workflows/deploy-pages.yml ← + VITE_BASE_PATH: '/sistema-gestion-calidad-dm/'
```

---

**Auditoría completada.** Causa raíz identificada, solución validada conceptualmente, plan de corrección mínimo definido. Listo para implementación en Sprint 395.