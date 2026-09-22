# AUD-416 — Auditoría final de conformidad F2-14

| Campo | Valor |
|-------|-------|
| Auditoría | AUD-416 · Sprint 416 |
| Tarea | F2-14 — Limpiar repositorio y documentación técnica |
| Modalidad | READ-ONLY (cero modificaciones; único entregable: este informe) |
| Rama auditada | `operativo` (código idéntico a `release/stable-sprint79` salvo trigger Pages + informes 405–415) |
| Fecha | 2026-09-21 |

## 1. Alcance verificado

README (382 lin) · `package.json` (scripts dev/build/preview/lint/test/deploy-legacy) · `.env.example` (placeholders, sin secretos) · `.env`/`.env.production` en disco pero **no versionados** (`git ls-files` solo lista `.env.example`) · `.gitignore` (cubre `.env*`, `dist/`, `*.bak`, `node_modules`) · `docs/16-portfolio/` (README + `architecture/` con README + `.mmd` + `.png` 298KB + 7 screenshots PNG) · `docs/15-architecture/adr/` (11 ADRs) · `public/` (solo favicon/icons) · `dist/` no versionado · 1494 archivos trackeados · deployment Pages (responde) + Vercel (superficie secundaria).

## 2. Hallazgos

| ID | Criterio | Sev. | Archivo | Evidencia | Impacto | Recomendación |
|----|----------|------|---------|-----------|---------|---------------|
| F-01 | Stack | MEDIO | `README.md:6` | Badge rotulado "TypeScript" enlaza a JavaScript; repo mixto JS-dominante (359+46 vs 153+30), `typescript` ni siquiera dep directa | Confunde stack real | Obligatoria: badge "JavaScript + TypeScript" |
| F-02 | Referencias | ALTO | `README.md:9,355` | Enlace `LICENSE` + claim MIT; **LICENSE no existe** en repo | Link roto + licencia inverificable | Obligatoria: crear LICENSE MIT o retirar claim/enlace |
| F-03 | Referencias | ALTO | `README.md:194-204` | 11 enlaces `docs/architecture/...`; ruta inexistente (real: `docs/15-architecture/adr/`) | Índice documental roto | Obligatoria: reescribir a rutas reales |
| F-04 | Deployment | ALTO | `README.md:249,301` | Trigger documentado `release/stable-sprint79`; real post-414: `operativo` | Pipeline documentado ≠ real | Obligatoria: actualizar trigger/rama/URLs |
| F-05 | Coherencia | MEDIO | `README.md:299-300` | Baseline `c7d9547`/HEAD `eceaf47`; reales `fd2f263`/`239e2d4` | Estado obsoleto | Obligatoria: actualizar |
| F-06 | Coherencia | MEDIO | `README.md:292-294` | "Branch Protection Pending"; rulesets activos desde Sep (release/operativo/develop) | Estado obsoleto | Obligatoria: actualizar |
| F-07 | Roadmap/Futuro | MEDIO | `README.md:306-331` | Plan 383–391 como vigente; varios items ya ocurrieron distinto | Plan presentado como realidad | Recomendada: mover a histórico/resumen |
| F-08 | Presentación | BAJO | `README.md:8` | Badge Vite duplicado (lin.4) | Ruido | Recomendada: eliminar duplicado |
| F-09 | Presentación | BAJO | `README.md:368-369` | Numeración duplicada "6." | Errata | Recomendada |
| F-10 | Coherencia | BAJO | `README.md:345` | "Sprints 355-371"; real 355-370 | Errata | Recomendada |
| F-11 | Claims | BAJO | `README.md:17` | "enterprise-grade" sin justificación objetiva | Superlativo | Recomendada: retirar |
| F-12 | Funcionalidades | MEDIO | `README.md:35,104` | "100+ tipos de formulario"; 2 slugs sembrados (`limpieza-diaria`, `cloro-ph-agua`) | Claim no evidenciado | Obligatoria: degradar o contar runtime real |
| F-13 | Stack/Features | MEDIO | `README.md`, stack "Realtime" | Cero `supabase.channel()` en `src/` | Tecnología inexistente | Obligatoria: retirar Realtime |
| F-14 | Seguridad desc. | MEDIO | `README.md:119` + Security | "Signed URLs with expiration"; código usa `getPublicUrl` directo, sin tenant-path | Control inexistente | Obligatoria: corregir a URLs públicas + RLS DB |
| F-15 | Features | MEDIO | `README.md:112` | "Offline Resilience"; solo comentarios "offline-first prep", sin IndexedDB | Capacidad inexistente | Obligatoria: retirar o "resiliencia local (caché/fallback)" |
| F-16 | Auditoría desc. | BAJO | `README.md:122-123` | "Immutable audit logs"; RLS append-only (`SELECT using(true)`, sin UPDATE/DELETE), no inmutabilidad criptográfica | Sobrerrepresentación | Recomendada: "audit logs (append-only por RLS)" |
| F-17 | Stack | BAJO | `README.md:135` | Zustand como "Global State"; usado en 1 archivo (`pdfViewer.store.ts`) | Sobrerrepresentación | Recomendada: matizar (estado global real: Context) |
| F-18 | Coherencia | MEDIO | `README.md` tabla ADR | Lista ADR-001…010; existe ADR-011 (Sprint 401) | Índice incompleto | Recomendada: agregar ADR-011 |
| F-19 | Evidencias | MEDIO | `README.md` | 7 screenshots + diagrama existen en `16-portfolio/` pero README no los enlaza | Evidencia desconectada | Recomendada: enlazar `docs/16-portfolio/` |
| F-20 | Presentación | BAJO | `README.md:119` | "Signed URLs…" duplicado en la misma celda | Errata | Recomendada |
| F-21 | Estructura | BAJO | `src/*.bak` ×3, `supabaseClient.js` vacío | Muertos en disco (ignorados/no versionados el `.bak`; `supabaseClient.js` vacío versionado) | Higiene | Recomendada: eliminar (fuera de F2-14 si se prefiere) |
| F-22 | Deployment | BAJO | `README.md` §Deployment | Vercel (superficie secundaria activa) no mencionado | Omisión | Recomendada: mencionar o excluir conscientemente |
| F-23 | Seguridad conf. | INFO | `.env.example` | Solo placeholders (`tu-proyecto`, `tu-api-key-anonima-publica`); sin secretos | Ninguno | Ninguna (conforme) |
| F-24 | Código | INFO | Rutas sombra (`DynamicModuleById`), `Traceability.jsx`/`WorkspaceFoundation.jsx` sin ruta | Calidad de código, no F2-14 | Ninguno doc. | Fuera de F2-14 |

Cero hallazgos CRÍTICO (sin secretos expuestos, sin bloqueos de instalación/ejecución).

## 3. Matriz de conformidad

| Criterio F2-14 | Estado | Evidencia | Hallazgo |
|---|---|---|---|
| README principal | PASS WITH WARNING | Completo y estructurado; links/estado con defectos | F-02, F-03 |
| Problema y solución | PASS | §§ Project Overview verificados vs dominio real | — |
| Arquitectura | PASS WITH WARNING | Diagrama coherente + `16-portfolio/architecture/` (mmd+png+README) | F-19 |
| Funcionalidades | PASS WITH WARNING | Mayoría evidenciada en código | F-12–F-16 |
| Stack | PASS WITH WARNING | `package.json` verificado | F-01, F-13, F-17 |
| Instalación | PASS | `npm install`, `.env.example`, Node ≥18/20.x vs workflow Node20 | — |
| Variables de entorno | PASS | Placeholders, `VITE_*` documentadas | — |
| `.env.example` | PASS | Existe, sin secretos | F-23 conforme |
| `.gitignore` | PASS | `.env*`, `dist/`, `*.bak`, `node_modules`; `.env` no versionado | — |
| Ejecución local | PASS | `npm run dev`, `preview` existen | — |
| Build | PASS | `npm run build`; CI lo ejecuta con éxito | — |
| Decisiones técnicas | PASS | 11 ADRs + 8 contratos + GOVERNANCE.md | F-18 |
| Documentación técnica | PASS | Dominios 00–16 + portfolio | F-03 |
| Evidencias visuales | PASS | 7 PNG + diagrama, con índices | F-19 |
| Demo | PASS | Pages responde (`DM Distribuciones - SGC`) | — |
| Deployment | PASS WITH WARNING | Pages verificado; README desactualizado; Vercel omitido | F-04, F-22 |
| Estructura pública | PASS WITH WARNING | `public/` mínimo, `dist/` fuera, 1494 tracked | F-21 |
| Referencias internas | PASS WITH WARNING | 12 enlaces rotos (LICENSE + ADRs) | F-02, F-03 |
| Coherencia documental | PASS WITH WARNING | Estado/roadmap/versiones obsoletas puntuales | F-05–F-07, F-10 |

## 4. Elementos conformes

### CONFORME
- **Problema/solución**: Evidencia: `README.md:13-41`. Verificación: coherente con módulos seed y dominio DM Distribuciones.
- **Instalación/ejecución/build**: Evidencia: scripts `dev/build/preview` + `.env.example` + workflow verde. Verificación: comandos respaldados 1:1.
- **Variables/entorno**: Evidencia: placeholders + `.gitignore` + no versionado. Verificación: sin exposición.
- **Decisiones**: Evidencia: `15-architecture/adr/` (11), `02-contracts/`, `GOVERNANCE.md`. Verificación: rutas existentes.
- **Demo/deployment real**: Evidencia: Pages responde + deployments API + Vercel bot. Verificación: directa.
- **Estructura**: Evidencia: `public/` mínimo, `dist/` excluido, sin artefactos versionados. Verificación: `git ls-files`.

## 5. Elementos fuera de alcance

Código muerto/rutas sombra (F-24), refactor UI, dependencias, migraciones, RLS profunda, threat modeling, performance, reorg histórica adicional, Vercel como primario, tests E2E.

## 6. Recomendaciones

**Obligatorias para cerrar F2-14:** F-01, F-02, F-03, F-04, F-05, F-06, F-12, F-13, F-14, F-15.
**Recomendadas:** F-07–F-11, F-16–F-22. **Fuera de F2-14:** F-24 + §5.

## 7. Criterios de cierre

F2-14 conforme cuando se apliquen las 10 obligatorias; el resto no bloquea. Sin CRÍTICO actual: el cierre es viable en una pasada editorial acotada.

## Conclusión

### Estado general

**PASS WITH WARNING**

### Criterios cumplidos

Problema/solución, instalación, variables, `.env.example`, `.gitignore`, ejecución, build, decisiones, documentación, evidencias, demo, estructura (12/19 PASS).

### Criterios con observaciones

README, arquitectura, funcionalidades, stack, deployment, referencias, coherencia (7/19).

### Correcciones necesarias antes del cierre

F-01–F-06, F-12–F-15 (10 obligatorias: badge TS, LICENSE, 11 links ADR, trigger/baseline/protección README, claims Realtime/signed-URLs/offline/100+).

### Recomendaciones no bloqueantes

F-07–F-11, F-16–F-22.

### Elementos fuera de alcance

§5 (código, dependencias, seguridad integral, E2E, reorg adicional).

### Veredicto de conformidad F2-14

Repositorio organizado, instalable, documentado y demostrable con evidencia directa; **apto con observaciones**: ninguna expone secretos ni impide uso/revisión; cerrar F2-14 exige únicamente la pasada editorial obligatoria listada, verificable diff-por-diff contra este informe.
