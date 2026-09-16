# Sprint 400 — Documentation Consolidation & Migration Plan

**Estado:** PLAN CERTIFIED
**Tipo:** DOCUMENTATION CONSOLIDATION & MIGRATION PLANNING
**Nivel:** DOCUMENTATION GOVERNANCE / TARGET EXECUTION PLAN
**Modo:** PLAN ONLY — READ-ONLY SOBRE EL REPOSITORIO (cero movimientos, cero ediciones, cero commits)
**Precedentes:** 397 (Sprint-397.md) · 398 (398-…-TARGET-ARCHITECTURE.md) · 399 (399-…-GLOBAL-DOCUMENTATION.md) · 399.1 (§21 reconciliación)
**Siguiente:** Sprint 401 — Controlled Documentation Migration
**Entregable:** este archivo (`docs/13-auditoria/400-DOCUMENTATION-CONSOLIDATION-MIGRATION-PLAN.md`), unico cambio del Sprint

---

## 1. Executive Summary

La matriz reconciliada 399.1 (120 KEEP · 2 CONSOLIDATE · 9 MIGRATE · 3 ARCHIVE · 8 REVIEW · 2 EMPTY · 0 FIX primarios sobre 144 individuales + grupo 526) queda convertida en plan determinista: **todas las decisiones REVIEW resueltas, todos los destinos ambiguos fijados a ubicacion unica, SoT definidos, secuencia D1–D10 ordenada, rollback y validacion especificados**. Hallazgo de cierre: el `301-400 +2` son `383-DOCUMENTATION_INDEX.md` y `383-PROJECT_STATUS.md` (ex-raiz Sprint 383, preservados — sin accion). Los dos vacios tienen hash canonico de archivo vacio (`e3b0c44…b855`) y cero referencias entrantes. Ningun archivo requiere carpeta nueva. Veredicto: **PLAN CERTIFIED / READY FOR SPRINT 401**.

## 2. Scope

Incluye: 2 CONSOLIDATE, 9 MIGRATE, 3 ARCHIVE (estatus, sin operacion fisica), 8 REVIEW (todas decididas §8), 2 EMPTY, referencias/dependencias, resolucion SoT (§5), separacion 13-auditoria (§15 diseno), secuencia, validaciones, rollback. Excluye (no ejecutado): movimientos, renombres, eliminaciones, edicion de contenido, GOVERNANCE.md, ADRs, SQL, codigo, `.ai`, Git, Supabase, migraciones, workflows, arquitectura tecnica.

## 3. Baseline 399.1

| Accion | Cantidad |
|--------|---------:|
| KEEP | 120 |
| CONSOLIDATE | 2 |
| MIGRATE | 9 |
| ARCHIVE | 3 |
| REVIEW | 8 |
| EMPTY | 2 |
| FIX primario | 0 |
| **Total individual** | **144** (132 MD + 12 SQL) |
| Historico `14-sprint/history` | **526** (134/202/104/86) |

**Universo:** 658 MD + 12 SQL = 670. Secundarias (no suman): FIX link `11/field-types.md:9`, FIX typo ROJECT, 2 pares nominales. 120 KEEP + 526 historicos fuera de migracion fisica salvo actualizacion de referencias estrictamente necesaria.

## 4. Target Architecture

Se conserva integra la estructura 398 (16 areas, sin carpetas nuevas). Sede profesional ratificada (opcion B-398): `11-architecture` = capa profesional/divulgativa; `15-architecture` = detalle certificable + decisiones. `00-governance` converge a un unico `GOVERNANCE.md` (fase 403); `13-auditoria` separa informes/anexos (§15); `14-sprint/history` solo 4 rangos oficiales.

## 5. SoT Decisions

| Dominio | SoT | Decision 400 |
|---------|-----|--------------|
| Governance | `00/GOVERNANCE.md` (futuro, fase 403) | confirmado; reglas candidatas en 398 §22 |
| Contracts | `02/contract-registry.md` | confirmado; 401 anade 2 entradas (SRCL runtime + Form Contract Layer, §8.4) |
| Engines | `08/engine_registry.md` | confirmado, sin cambios |
| AI Context | `10/AI_HANDOFF_INDEX.md` | confirmado, sin cambios |
| Current Architecture | **dual declarado**: primario-divulgativo `11/ARCHITECTURE_OVERVIEW.md` (v2.0-383) + detalle autoritativo `15/current-architecture.md` (v3.0-380) | resuelto §8.1, sin duplicar contenido, sin ediciones |
| ADR | `15/adr/adr-index.md` | confirmado; ADR-011 planificado §8.5 |
| Historical Knowledge | `15/historical-knowledge-map.md` | confirmado, sin cambios |
| Database executable | `12-database/supabase/migrations` (unico versionado en worktree; sin `supabase/` fuera de docs) | canon confirmado, sin cambios |
| Audit reports | `13-auditoria/informes/` (fisico en 401) | separacion §15 |
| Sprint evidence | `14-sprint/history` | confirmado; +2 explicado §8.7 |

## 6. Consolidation Plan

**C01 — `00/changelog.md` (1953 lin).** Extraer a futuro `GOVERNANCE.md` (fase 403) unicamente: Implementation Principles (§IMPLEMENTATION PRINCIPLES), Governance Note (coherencia con arquitectura aprobada), objetivo v0.1.0 (plataforma modular/desacoplada/audit-ready). No extraer: log v0.2–v0.11, report Sprint 26, arbol 00–08. Original → `14-sprint/history/001-100/` (cubre Sprints 1–26) via `git mv` en 401 bloque B2. Validacion: hash + conteo 001-100 = 135.
**C02 — `00/PROFESSIONAL_ROADMAP.md` (256 lin).** Extraer a `GOVERNANCE.md`: Governance Cadence (§6), Decision Framework (§7), DoR/DoD (§8). No extraer: fases 383–410, metricas, riesgos, presupuesto (plan fechado). Original → `11-architecture/` (documento profesional Sprint 383) via `git mv` en 401 bloque B2. Validacion: hash + links.

## 7. Migration Matrix (destinos unicos, sin "A o B")

| ID | Origen | Accion | Destino unico | Dependencia | Riesgo | Validacion | Sprint |
|----|--------|--------|---------------|-------------|--------|------------|--------|
| M01 | `00/architecture_progress.md` | MIGRATE | `14-sprint/history/001-100/` (Sprint 10.1) | ninguna | Bajo | path+hash | 401 |
| M02 | `00/INTERVIEW_TALKING_POINTS.md` | MIGRATE | `11-architecture/` (capa profesional) | sede profesional ratificada | Medio | links entrantes (cero conocidos) | 401 |
| M03 | `00/SECURITY_OVERVIEW.md` | MIGRATE | `11-architecture/` (capa profesional; detalle tecnico referenciado, no duplicado) | decision overview §8.1 | Medio | refs a ADR-003/006/007 intactas | 401 |
| M04 | `01/SPRINT_8_RUNTIME_ARCHITECTURE_AUDIT.md` | MIGRATE | `14-sprint/history/001-100/` (Sprint 8) | higiene (lin.1 prompt pegado: se preserva tal cual, no se edita) | Medio | contenido+hash | 401 |
| M05 | `01/01-core-runtime-doc/03-master-model/prompt.md` | MIGRATE | `10-ai-context/` (contexto operativo IA) | ninguna | Bajo | links | 401 |
| M06 | `02/00-roadmap-maestro.md` | MIGRATE | `05-implementation/` (roadmap Sprint 24+) | ninguna | Medio | refs | 401 |
| M07 | `05/FEATURE_OVERVIEW.md` | MIGRATE | `11-architecture/` (capa profesional) | sede profesional ratificada | Medio | links | 401 |
| M08 | `11/field-types.md` | MIGRATE | `02-contracts/` (especificacion contrato field_type) + FIX link lin.9 | decision contrato §8.4 | Alto | broken-link test post-fix | 401 |
| M09 | `15/SPRINT_65E_ARCHITECTURE_CONSOLIDATION.md` | MIGRATE | `14-sprint/history/001-100/` (Sprint 65) | mapeo historico | Bajo | cronologia+hash | 401 |
| M10 | `15/TODO.md` (REVIEW→MIGRATE) | MIGRATE | `14-sprint/history/001-100/` (orden trabajo S49A-R.6.5D como evidencia) | ninguna | Bajo | hash | 401 |

Ediciones de contenido autorizadas en 401 (taxativas, fuera de eso ninguna): (a) `11/field-types.md:9` `file:///c:/Users/...` → ruta relativa al `FormBuilder` en `src/` o referencia al SoT `02/field_schema.md`; (b) 2 entradas en `02/contract-registry.md` (SRCL Runtime Contract Layer → `01/.../SRCL_v1.0.md`; Form Contract Layer → `02/SRCL_V1.0.md`); (c) actualizacion de referencias entrantes estrictamente afectadas por los 10 movimientos (si existen; refs conocidas: cero salvo auditorias historicas, que no se reescriben).

## 8. Review Decisions (8/8 resueltas)

**8.1 Overview (11 vs 15).** Comparativa: 11 = v2.0 Sprint 383 (2026-09-04), 440 lin, 11 secciones + glosario + related docs (capas, flujos, invariantes, schema+RLS, CI/CD, seguridad+gaps, src/, workflow); baseline c7d9547/HEAD eceaf47. 15 = v3.0 Sprint 380 (2026-09-03), 197 lin, pilares 1:1 ADR-001…009, stack, invariantes, baseline cc42e3c, rollback, targets 381+ (defecto menor: §8 y §10 duplican "Temporal Recurrence Model"). Decision: **primario vigente-divulgativo = 11/ARCHITECTURE_OVERVIEW**; **detalle autoritativo = 15/current-architecture** (fuente secundaria referenciada, no competidora). Cero movimientos, cero ediciones; rol exigible via `GOVERNANCE.md` (403).
**8.2 Deployment (04 vs 05 vs 15).** 04 = Sprint 383, 361 lin (workflow+environment, invariantes, secrets, build verification, env vars, legacy, rollback procedures, monitoring) = **as-built oficial**. 15 v2.0-380 = referencia historica (KEEP, sin cambios). 05 v1.0 blueprint BORRADOR = historico de diseno (KEEP en 05). La capa profesional referencia el as-built sin duplicarlo.
**8.3 SRCL.** Hashes distintos verificados (`31B2C44…` 132 lin vs `4668350E…` 38 lin): ambitos distintos. `01/SRCL_v1.0.md` = contrato runtime canonico de modulos (KEEP). `02/SRCL_V1.0.md` = nota Form Contract Layer (KEEP en 02 + entrada registry en 401). Coexistencia justificada, sin eliminacion.
**8.4 field-types.** Destino unico `02-contracts/` + fix link (M08).
**8.5 DYNAMIC_MODULE_DECISION.** Estructura verificada: Contexto §1, alternativas §5 (A/B), Decision §9 (dictamen), riesgos §8 → decision formal. **Convertir a ADR-011** en 401: `git mv 15-architecture/DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1.md 15-architecture/adr/ADR-011-dynamic-module-architecture-decision.md` + normalizar bloque cabecera a formato ADR (Status ACCEPTED, Date, Deciders, Sprint refs) + fila en `adr-index.md`; cuerpo intacto. Sin documento duplicado.
**8.6 SPRINT_HISTORY.** **Opcion A**: conservar en `10-ai-context/` como log operativo IA (1510 lin; cero dependientes vivos salvo arboles historicos; no compite con el historico oficial una vez declarada su funcion). Sin movimiento.
**8.7 Historico +2 / pendientes.** `301-400 +2` = **`383-DOCUMENTATION_INDEX.md` + `383-PROJECT_STATUS.md`** (ex-raiz Sprint 383, preservados) → resuelto, sin accion. `audits/`, `todos/`, `45–49-sprint/`, `TODO_SPRINT_45` → absorbidos por la migracion ejecutada (001-100=134 lo confirma); nada pendiente.
**8.8 15/TODO.md.** Migrar como evidencia S49A (M10). Si en 401 pre-check el checklist consta cumplido y duplicado en el SSOT, alternativa registrada: eliminar con hash; por defecto migrar.

## 9. Archive Plan (estatus, cero operaciones fisicas)

`00/technical_roadmap.md`, `00/tree_docs.md`, `01/core_architecture.md` quedan in-situ como historicos marcados; el estatus consta en este plan + futura seccion de superseded en `GOVERNANCE.md` (403). Prohibido reescribirlos o borrarlos para "limpiar".

## 10. Empty/Removal Plan

E01 `02/AntiBypassRules.md` (hash `e3b0c44…b855`, 0 lin, cero referencias entrantes en repo; canon con contenido en `01/.../ANTI_BYPASS_RULES.md` hash `81CBE6…`): 401 verifica hash+refs y `git rm`. E02 `10/ROJECT_STRUCTURE_TREE.md` (mismo hash vacio, typo, cero refs): igual procedimiento. Cualquier hash distinto o referencia aparecida → abortar item y devolver a REVIEW.

## 11. Dependency Graph

```text
D1 SoT definidos (§5) ─┬─→ D2 overview roles (§8.1) ─→ D3 deployment canon (§8.2)
                       └─→ D4 SRCL roles+registry (§8.3)
D2+D3 ─→ D5 ADR-011 (§8.5) ─→ D6 separacion 13 (§15: informes/ vs anexos/)
D1 ─→ D7 canon DB confirmado (§5, sin operacion)
D8 anomalias historicas resueltas (§8.7; verificacion solo)
D1..D8 ─→ D9 matriz §§6–7 (este plan) ─→ D10 ejecucion 401 por bloques B1–B6
```

## 12. Risk Register

| Riesgo | Impacto | Mitigacion |
|--------|---------|------------|
| Duplicacion SoT | Alto | §5 canon previo; registry entries exactas |
| Links rotos | Alto | validacion post-bloque; refs conocidas cero |
| Perdida historica | Critico | hash origen=destino por operacion; 526 intactos |
| Mezcla blueprint/as-built | Alto | §8.2 roles; profesional referencia, no duplica |
| Mezcla governance/audit | Medio | separacion §15; GOVERNANCE.md en 403 |
| Eliminacion evidencia | Critico | E01/E02 solo vacios verificados; gate hash+refs |
| Referencias absolutas | Medio | fix taxativo M08 |
| SRCL ambiguo | Alto | hashes+roles §8.3; sin borrado |
| Deployment contradictorio | Alto | as-built unico §8.2 |
| Deriva en 401 (improvisacion) | Alto | matriz cerrada; regla: lo no listado no se toca |

## 13. Execution Sequence (Sprint 401, 6 bloques)

**B1 Preparacion** (sin cambios): registrar hash SHA256 de los 10 M + C01/C02 originales + E01/E02; verificar destinos existen y nombres libres; snapshot `git status`.
**B2 Consolidacion-extractos (solo lectura+registro)**: identificar lineas exactas a extraer (C01: principles/governance-note/objetivos v0.1.0; C02: cadencia/framework/DoR-DoD) en actas; mover originales (changelog→14/001-100, roadmap→11) via `git mv`.
**B3 Migracion M01–M10**: `git mv` origen→destino unico; M08 incluye fix link; ADR-011 (movimiento + cabecera + index).
**B4 Separacion 13-auditoria**: crear `13-auditoria/informes/` y `13-auditoria/anexos/`; `git mv`: informes = AUD-001, AUD-002, AUD-003.1, 398, 399, 400, SPRINT_50_2; anexos = AUDIT_V1×4, B×3, C×2+D1, FIX×4, V2, 43×2. (400-plan + futuros informes quedan en raiz 13.)
**B5 Empty**: E01/E02 tras gate hash+refs.
**B6 Registry**: 2 entradas SRCL en `02/contract-registry.md` (unica edicion de contenido fuera de M08).
Orden: B1 → B2 → B3 → B4 → B5 → B6. Parar ante primer fallo de validacion (rollback §14).

## 14. Rollback Strategy

Bitacora por operacion (origen, destino, hash pre/post, comando, bloque). Rollback por bloque con `git mv` inverso / `git checkout --` para ediciones / `git restore` para rm (todo commiteado por bloque en 401 para permitir revert por bloque). Regla: bloque fallido se revierte completo antes de diagnosticar; prohibido acumular cambios sobre fallo.

## 15. Validation Strategy (post-bloque y final)

Por bloque: conteos esperados (B2: 001-100=135, 11=+1; B3: destinos +1 c/u, origenes 0; B4: informes=7, anexos=16+? ; B5: 2 ficheros menos; B6: registry 10 entradas), hash origen=destino, `grep` referencias absolutas/`file:///` cero fuera de historicos, nombres unicos (sin " (1)"). Final: estructura 16 areas sin carpetas nuevas; 120 KEEP intactos (spot-hash 10%); 526 history intactos (conteos 134/202/104/86); build/tests del repo no afectados (documentacion no toca codigo; verificacion de artefactos solo si 401 tocase codigo, prohibido).

## 16. Sprint 401 Definition of Ready

[✓] matriz final origen→destino (§7+M10) [✓] 8 REVIEW decididos (§8) [✓] cero destinos "A o B" [✓] SoT definidos (§5) [✓] as-built definido (§8.2) [✓] SRCL resuelto (§8.3) [✓] DYNAMIC resuelto (§8.5) [✓] estructura 13 definida (§13→B4) [✓] DB canon definido (§5) [✓] +2 explicado (§8.7) [✓] hashes sensibles registrados (§8.3/§10/B1) [✓] EMPTY verificados (§10) [✓] rollback definido (§14). **DoR: COMPLETO. 401 puede iniciar.**

## 17. Definition of Done (auto-verificacion 400)

Matriz convertida ✓; destinos/dependencias/riesgos/mitigaciones ✓; 8 REVIEW decididos ✓; cero ambiguedades ✓; nada delegado a 401 salvo ejecucion ✓; orden determinista ✓; rollback+validacion definidos ✓; **cero archivos movidos/eliminados/renombrados** (verificado: 00=7, 13=24 = 23+399) ✓; cero codigo ✓; entregable existe ✓ (este archivo).

## 18. Final Handoff

```text
RECONCILED INVENTORY (399.1: 120/2/9/3/8/2/0 + 526)
        ↓ TARGET ARCHITECTURE (398: 16 areas, sede 11 profesional)
        ↓ SOURCE OF TRUTH (§5, dual-overview declarado)
        ↓ CONSOLIDATION DECISIONS (§6: C01/C02 extractos + destinos originales)
        ↓ MIGRATION MATRIX (§7: M01–M10 destinos unicos)
        ↓ DEPENDENCIES (§11 D1–D10) ↓ RISK CONTROLS (§12)
        ↓ EXECUTION ORDER (§13 B1–B6) ↓ ROLLBACK (§14) ↓ VALIDATION (§15)
        ↓ SPRINT 401 (ejecucion fisica contra este plan, sin improvisar)
```

**Regla final: Sprint 400 no mueve documentos. Sprint 400 elimina la incertidumbre sobre como deben moverse. Veredicto: PLAN CERTIFIED / READY FOR SPRINT 401.**
