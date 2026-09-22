# Sprint 417 — Cierre documental: propiedad intelectual y referencias arquitectónicas

## 1. Identificación

| Campo | Valor |
|-------|-------|
| Sprint | 417 |
| Área | Documentación / Gobernanza / Propiedad |
| Relación | F2-14 — Limpiar repositorio y documentación técnica |
| Auditoría origen | AUD-416 (`docs/13-auditoria/informes/416-audit.md`) |
| Rama utilizada | `operativo` |
| Commit asociado | `6d2f437` — "docs(license): establish proprietary licensing and fix architecture references" |
| Estado | COMPLETADO |

## 2. Objetivo

Establecer el carácter propietario de SGC-DM (licencia + derechos reservados, fin de la mención MIT), corregir las referencias arquitectónicas rotas detectadas por AUD-416 y dejar la documentación coherente con el estado real del proyecto, sin tocar funcionalidad, arquitectura ni configuración.

## 3. Alcance ejecutado

Evidencia Git (`git show --stat 6d2f437`): 2 archivos, 50 inserciones, 14 eliminaciones.

### Creados
- `LICENSE` (+35): licencia propietaria — titularidad y derechos reservados © 2026 DM Distribuciones SAS (Projects-DM); publicación ≠ licencia OSS; prohibiciones expresas (copia, modificación, redistribución, sublicenciamiento, comercialización, derivadas); cláusula de dependencias de terceros; cierre anti-MIT/Apache/GPL.

### Modificados
- `README.md` (15+/14−): badge `License-Proprietary`; tabla ADR reescrita de `docs/architecture/...` a `docs/15-architecture/adr/...` (+ fila ADR-011) y overview a `docs/11-architecture/ARCHITECTURE_OVERVIEW.md`; "ADR-001 through ADR-011"; sección License con copyright y distinción de dependencias.

No se atribuyen a este sprint trabajos posteriores (`aff06ca` portfolio architecture, `7e9e14f` visual evidence, `98c6044` stabilize portfolio/audit docs).

## 4. Hallazgos AUD-416 tratados

- **F-02** (licencia MIT sin archivo LICENSE): cerrado — `LICENSE` propietaria creada; 0 menciones MIT-como-licencia restantes en `README.md`.
- **F-03** (11 enlaces `docs/architecture/...` rotos): cerrado — 0 ocurrencias restantes en `README.md`; destinos reales verificados (`docs/15-architecture/adr/`, ADR-011 existente).
- Resto de hallazgos AUD-416 (F-01, F-04–F-24): **no tratados aquí**; pendientes para sprints posteriores (estado, claims, presentación, higiene, código).

## 5. Validaciones

- `git status`/`diff`: solo `LICENSE` (nuevo) + `README.md`; cero cambios en `src/`, `package.json`, lockfiles, `supabase/`, `public/`, `.github/`, `vite/eslint/tailwind/postcss`, `.env*`.
- Búsquedas: "MIT License" como licencia = 0; `docs/architecture/` en README = 0; ADR-011 existe (`15-architecture/adr/ADR-011-dynamic-module-architecture-decision.md`) y referenciado.
- Evaluados y preservados sin modificar (históricos): `historical-knowledge-map.md:168`, `ADR-010:133`, `383-DOCUMENTATION_INDEX.md`, `Sprint-382.md`.
- `npm run build`: **PASS 8.28s** (solo warning conocido de chunk-size; `dist/` ignorado, sin cambios funcionales).
- Incidencia registrada entonces: `docs/16-portfolio/README.md` con modificación ajena en worktree (redacción de portafolio en curso) — no tocado; titular del copyright fijado desde evidencia del repo (ajustable en una línea si difiere).

## 6. Restricciones respetadas

Sin cambios funcionales ni arquitectónicos: sin `src/`, dependencias, `package.json`, Supabase/SQL, rutas, RLS, build, deployment, reorg de `docs/`, movimientos, renombres, eliminaciones (incl. `.bak` e históricos). Trabajo posterior no atribuido.

## 7. Resultado

**Estado: COMPLETADO.** Objetivos de licencia/referencias satisfechos; F2-14 **no** declarada completa (restan grupos AUD-416: estado del repositorio, coherencia README, claims técnicos, evidencia/presentación, auditoría final de cierre).

## 8. Pendientes posteriores

Estado actual del repositorio · coherencia de información del README · verificación de claims técnicos · evidencia/presentación · auditoría final de cierre. Trazabilidad preservada; nada ejecutado aquí.
