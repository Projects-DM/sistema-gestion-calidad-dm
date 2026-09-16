# Sprint 398 — Documentation Target Architecture Audit

**Estado:** CERTIFICADO
**Tipo:** FORENSIC DOCUMENTATION ARCHITECTURE AUDIT
**Nivel:** DOCUMENTATION GOVERNANCE / REPOSITORY STRUCTURE
**Modo:** AUDIT + DOCUMENTATION RESULT (solo-lectura salvo este informe)
**Base:** Sprint 397 (`docs/14-sprint/history/301-400/Sprint-397.md`)

> Este archivo (`docs/13-auditoria/398-AUDIT-DOCUMENTATION-TARGET-ARCHITECTURE.md`) es el unico cambio documental del Sprint. Ningun otro archivo fue creado, movido, renombrado, editado o eliminado. Sin commits durante el analisis. Sin Supabase, sin red, sin `.IA/`.

---

## 1. Executive Summary

Se audito `docs/` completo (16 areas + `.ai/` excluida). Hallazgo estructural: las 16 areas son defendibles y **no se propone crear ni eliminar carpetas**. El problema no es la estructura sino la **disciplina de ubicacion**: existen 3 documentos de deployment (04/05/15), 2 overviews de arquitectura vigente (11 v2.0-Sprint 383 vs 15 v3.0-Sprint 380), contratos fuera de `02-contracts` (`04/runtime_api_contracts.md`), roadmaps dentro de contratos (`02/00-roadmap-maestro.md`), evidencia de Sprint dentro de arquitectura (`15/SPRINT_65E_*`, `01/SPRINT_8_*`, `15/TODO.md`), un archivo vacio (`02/AntiBypassRules.md`, 0 lineas) duplicado en nombre con `01/.../ANTI_BYPASS_RULES.md`, SRCL duplicado (`02/SRCL_V1.0.md` vs `01/.../SRCL_v1.0.md`), un typo en nombre (`10/ROJECT_STRUCTURE_TREE.md`), y `13-auditoria/` mezcla reportes de gobernanza (AUD-*) con evidencia cruda de Sprint (AUDIT_*_RESULT, SPRINT_50_2). Adicionalmente se observo que la migracion 14-sprint prevista en AUD-003.2 parece ejecutada (`14-sprint/` contiene solo `history/`: 001-100/134, 101-200/202, 201-300/104, 301-400/86 incl. Sprint-397) y que `docs/DOCUMENTATION_INDEX.md` y los `.md` de raiz ya no existen (`ARCHITECTURE_OVERVIEW.md` ahora vive en `11-architecture/`). Esas transiciones quedan como items de verificacion para el Sprint 399, no se certifican aqui.

## 2. Audit Objective

Definir y certificar la arquitectura documental objetivo: un proposito unico por area, limites explicitos, modelo de clasificacion, modelo de fuente de verdad, reglas de ruteo para documentos nuevos, estrategia historica y secuencia de migracion — antes de mover un solo archivo.

## 3. Scope

`docs/00-governance` … `docs/15-architecture` (16 areas). Metodo: listado de directorios + lectura de encabezados (primeras 15–40 lineas) de archivos representativos. No se audito `.ai/` ni `.IA/`. No se leyo contenido completo salvo `Sprint-397.md` (insumo base), `adr-index.md`, `contract-registry.md` (encabezados) y conteos de `14-sprint/history`.

## 4. Current Documentation Structure

```text
docs/
├── .ai/                    # excluida del alcance
├── 00-governance/          # 7 files (Sprint 397: sin documento CURRENT puro)
├── 01-core-runtime/        # 9 files + 01-core-runtime-doc/ (00-freeze/3, 01-audits/5, 02-sprint23-design/6, 03-master-model/5)
├── 02-contracts/           # 8 files (registry + schemas + roadmap + 1 vacio)
├── 03-validation/          # 2 files (coherente, pequena)
├── 04-infrastructure/      # 12 files (persistencia, deployment overview, contratos runtime)
├── 05-implementation/      # 6 files (blueprints + deployment + feature overview)
├── 06-analytics-ai/        # 3 files (analisis enterprise Mayo-2026 + analytics + IA-ready)
├── 07-scalability/         # 1 file (strategy era Empresa Demo)
├── 08-registry/            # 1 file (engine_registry, 632 lineas, oficial)
├── 09-business-assets/     # 2 files (inventarios Empresa Demo)
├── 10-ai-context/          # 7 files (handoff, estado, overview, prompts, sprint/story history, tree con typo)
├── 11-architecture/        # 2 files (ARCHITECTURE_OVERVIEW v2.0-383 + field-types)
├── 12-database/            # 6 .sql + supabase/ (migrations/2, rls fixes, roles, schema)
├── 13-auditoria/           # 22 files (AUD-* gobernanza + AUDIT_*_RESULT/V1/V2/50_2 evidencia cruda)
├── 14-sprint/              # history/ unicamente (134 + 202 + 104 + 86)
└── 15-architecture/        # 19 files + adr/ (10 ADRs + index)
```

Concentracion: `14-sprint/history` (~526) domina en volumen; `15-architecture` (30) y `13-auditoria` (22) concentran decisiones y evidencia. Areas de 1–2 archivos (03, 07, 08, 09, 11) son coherentes por tema, no requieren fusion.

## 5. Documentation Domain Model

Cada area responde a una pregunta distinta:

| Area | Pregunta que responde |
|------|----------------------|
| 00-governance | ¿Cuales son las reglas del proceso? |
| 01-core-runtime | ¿Como funciona el runtime? |
| 02-contracts | ¿Que contratos rigen el sistema? |
| 03-validation | ¿Como se valida? |
| 04-infrastructure | ¿Sobre que infraestructura corre y persiste? |
| 05-implementation | ¿Como se planifico/ejecuto la implementacion? |
| 06-analytics-ai | ¿Cual es el analisis enterprise y la estrategia IA? |
| 07-scalability | ¿Como escala? |
| 08-registry | ¿Cuales son los motores oficiales y su registro? |
| 09-business-assets | ¿Cuales son los activos/inventarios de negocio? |
| 10-ai-context | ¿Que contexto necesita un agente/IA para operar? |
| 11-architecture | ¿Cual es la arquitectura vigente (vista consolidada)? |
| 12-database | ¿Cual es el estado SQL/migraciones de la base? |
| 13-auditoria | ¿Que se audito y con que resultado de gobernanza? |
| 14-sprint | ¿Que ocurrio en cada Sprint? (evidencia cronologica) |
| 15-architecture | ¿Cuales son las decisiones y modelos arquitectonicos certificados? |

## 6. Domain-by-Domain Analysis

- **00-governance (7):** `architecture_progress.md`, `changelog.md`, `INTERVIEW_TALKING_POINTS.md`, `PROFESSIONAL_ROADMAP.md`, `SECURITY_OVERVIEW.md`, `technical_roadmap.md`, `tree_docs.md`. Diagnostico Sprint 397 vigente: sin CURRENT puro; mezcla evidencia Sprint, changelog append-only, roadmaps de dos eras y presentacion profesional. Destino objetivo: 1 archivo `GOVERNANCE.md`; resto migra/archiva (Sprint 397 §13–§16).
- **01-core-runtime (9+19):** Arquitectura runtime (registry, core, dynamic engine, event bus, rendering, data model, state, workflow) + subcarpeta documental con freeze V1, audits SAAS/T2.x, diseno Sprint 23 y master-model. Cohesion alta. Anomalias: `SPRINT_8_RUNTIME_ARCHITECTURE_AUDIT.md` en raiz (evidencia Sprint), `03-master-model/prompt.md` (prompt IA fuera de lugar), `ANTI_BYPASS_RULES.md` / `SRCL_v1.0.md` (nombres duplicados con `02-contracts`).
- **02-contracts (8):** `contract-registry.md` (SSOT ACTIVE, 8 contratos CONTRACT-001…008) es el corazon. `field_schema`, `form_schema_universal_*`, `FORM_CONTRACT_ENGINE_V1`, `SRCL_V1.0` coherentes. Anomalias: `00-roadmap-maestro.md` (roadmap Sprint 24+, no es contrato), `AntiBypassRules.md` **vacio (0 lineas)**.
- **03-validation (2):** `validation_engine.md` (707 lineas, Fase 1 APROBADO) + `business_rules.md`. Area sana y delimitada.
- **04-infrastructure (12):** Persistencia (persistence, transaction, storage, durability, idempotency, event_audit_correlation, database_setup, database_adapter), `infrastructure_layers`, `audit_engine`, `runtime_api_contracts`, `DEPLOYMENT_OVERVIEW.md` (Sprint 383). Anomalia: `runtime_api_contracts.md` es contrato y deberia referenciarse desde `02` (permanecer fisicamente es aceptable solo si el registry lo referencia).
- **05-implementation (6):** Blueprints de implementacion (`application_implementation_architecture`, `deployment_architecture` v1.0 blueprint, `implementation_roadmap`, `project_structure_blueprint`, `runtime_module_dependencies`) + `FEATURE_OVERVIEW.md` (Sprint 383, presentacion de capacidades por dominio). `FEATURE_OVERVIEW` es presentacion, no blueprint: candidato a reubicar junto a la capa profesional.
- **06-analytics-ai (3):** `ANALISIS_ARQUITECTURA_ENTERPRISE.md` (Mayo 2026, 2203 lineas, con "restricciones vinculantes" — tono gobernanza), `analytics_architecture.md`, `ia_ready_architecture.md`. Analisis estrategico, no contexto operativo IA.
- **07-scalability (1):** `scalability_strategy.md` (era Empresa Demo). Tema valido, area minima estable.
- **08-registry (1):** `engine_registry.md` (632 lineas, registro oficial de motores). Autoritativo en su tema.
- **09-business-assets (2):** Inventarios Empresa Demo (`1-inventario-maestro.md`, `inventario_formatos.md`). Activos de negocio, no arquitectura.
- **10-ai-context (7):** `AI_HANDOFF_INDEX.md` (entry point declarado), `CURRENT_STATE.md` (snapshot runtime), `PROJECT_OVERVIEW.md`, `PROMPTS_HISTORY.md` (896 lineas, razonamiento IA), `SPRINT_HISTORY.md` (1510 lineas, inicia "Roadmap Sprint 12" — log operativo, no indice curado), `STORY_HISTORY.md`, `ROJECT_STRUCTURE_TREE.md` (**typo**: falta la P inicial). Area de trabajo operativa para agentes, no fuente de verdad arquitectonica.
- **11-architecture (2):** `ARCHITECTURE_OVERVIEW.md` (v2.0, Sprint 383, 440 lineas, PRODUCTION CERTIFIED Sprint 369) + `field-types.md` (catalogo de tipos de campo con link absoluto a ruta local `c:/Users/...` — link roto fuera de esa maquina). `field-types.md` es especificacion runtime/contratos, no overview.
- **12-database (6 .sql + supabase/):** `sql_*.sql` sueltos + `supabase/` (migrations/2, 2 RLS fixes, roles_setup, schema). Contiene codigo SQL ejecutable dentro de `docs/`: frontera docs-vs-IaC a definir (este informe la define en §14: `12-database` es espejo documental versionado; la ejecucion vive en `supabase/` del repo si existe — verificar en Sprint 399).
- **13-auditoria (22):** Tres reportes de gobernanza (AUD-001, AUD-002, AUD-003.1) + este informe (398) conviven con ~18 archivos de evidencia cruda (`AUDIT_B*/C*/D*/FIX_*_RESULT`, `AUDIT_V1_*`, `AUDIT_V2_*`, `SPRINT_50_2_*`). Mezcla de niveles: informe de gobernanza vs papel de trabajo forense.
- **14-sprint (history/ 134+202+104+86):** Solo `history/` con los 4 rangos oficiales. Estado consistente con la migracion AUD-003.2 (45–49 y raiz absorbidos; Sprint-397 presente en 301-400). Diferencias menores a conciliar en Sprint 399 (ver §21.7).
- **15-architecture (19 + adr/11):** `adr/` ejemplar (10 ADRs ACCEPTED + index con lifecycle PROPOSED/ACCEPTED/SUPERSEDED/DEPRECATED). `current-architecture.md` (v3.0, Sprint 380, PRODUCTION CERTIFIED Sprint 369) solapa con `11/ARCHITECTURE_OVERVIEW.md` (v2.0, Sprint 383, mismo status y resumen casi identico). `deployment-architecture.md` (v2.0, Sprint 380) es el tercer documento de deployment. Familia `CORE_*_v1`/`MODULE_CONTRACT_v1`/`BUSINESS_CAPABILITY_CONTRACT_v1` (SSOT Sprint 49A) + `DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1` (decision formal **fuera** de `adr/`). `historical-knowledge-map.md` (indice Sprint→dominio, Sprint 380) es mapa, no arquitectura. Anomalias: `SPRINT_65E_ARCHITECTURE_CONSOLIDATION.md` (reporte Sprint), `TODO.md` (orden de trabajo Sprint 49A-R.6.5D).

## 7. Allowed Responsibilities

- 00: reglas de proceso, convenciones, DoR/DoD, cadencia, anti-acumulacion. Solo `GOVERNANCE.md` como CURRENT.
- 01: arquitectura runtime vigente + freeze/master-model como referencia certificada.
- 02: contratos vigentes + `contract-registry.md` como indice SSOT.
- 03: motor y reglas de validacion vigentes.
- 04: arquitectura de infraestructura/persistencia/despliegue **as-built** vigente.
- 05: blueprints/planes de implementacion (intencion y plan, aunque sean historicos).
- 06: analisis enterprise y estrategia IA (documentos de analisis fechados, se conservan).
- 07: estrategia de escalabilidad vigente.
- 08: registro oficial de motores (indice autoritativo).
- 09: inventarios y activos de negocio.
- 10: contexto operativo para agentes (snapshots, handoff, historiales de trabajo).
- 11: **vista consolidada vigente** de arquitectura + presentacion profesional (overview/feature/deployment/security/interview) si se adopta la capa profesional (§18, opcion B).
- 12: estado SQL versionado (migrations, RLS, schema, seeds).
- 13: **informes de auditoria de gobernanza** (AUD-*, 39x) + papeles forenses como anexos separados.
- 14: evidencia cronologica de Sprints, solo `history/` + rangos oficiales.
- 15: decisiones formales (`adr/`), modelos SSOT certificados (`CORE_*`, `*_CONTRACT_v1`, `*_DECISION_v1`), mapas de conocimiento.

## 8. Explicit Exclusions

- 00: NO arquitectura, implementacion, infraestructura, DB, auditorias, historial Sprint, ADRs, instrucciones de agentes, interview/roadmaps, security architecture (Sprint 397 §12).
- 01: NO evidencia Sprint sin certificar como freeze; NO prompts de IA.
- 02: NO roadmaps; NO archivos vacios; NO contratos sin entrada en registry.
- 04/05: NO duplicar deployment entre si ni con 15 (un as-built vigente + blueprint historico referenciado).
- 06: NO snapshots operativos (van a 10); NO reglas vinculantes nuevas (van a 00/ADR).
- 10: NO fuente de verdad arquitectonica; NO decisiones (van a 15/adr).
- 11: NO catalogos tecnicos de detalle (van a 01/02); NO reportes Sprint.
- 12: NO documentacion narrativa de arquitectura (solo SQL + notas minimas de aplicacion).
- 13: NO evidencia cruda mezclada al mismo nivel que informes de gobernanza.
- 14: NO subrangos fuera de 001-100/101-200/201-300/301-400; NO audits/todos/special como destinos permanentes (fueron transitorios).
- 15: NO reportes Sprint; NO ordenes TODO; NO decisiones formales fuera de `adr/`; NO segundo overview vigente paralelo a 11.

## 9. Domain Boundary Analysis

1. **00 vs 13:** 00 = reglas futuras; 13 = veredictos pasados. Ningun AUD-* vive en 00; ningun `GOVERNANCE.md` vive en 13. Estado: 00 sin CURRENT (deficit conocido), 13 con mezcla de niveles (ver §16.4).
2. **00 vs 14:** 00 no conserva evidencia Sprint (`architecture_progress`, cuerpo `changelog` → 14). Estado: pendiente (Sprint 397).
3. **11 vs 15:** dos overviews vigentes casi identicos (11 v2.0-383 vs 15 v3.0-380). Es el solapamiento mas critico: **un solo overview vigente**; el otro queda como historico referenciado. Propuesta §18.
4. **11 vs 04:** `field-types.md` (11) es detalle runtime/contratos → referenciar desde 01/02; deployment as-built vive en 04/15, no en 11.
5. **04 vs 05:** 04 = as-built vigente; 05 = blueprint/plan. `05/deployment_architecture.md` (blueprint v1.0) vs `04/DEPLOYMENT_OVERVIEW.md` (as-built 383) vs `15/deployment-architecture.md` (as-built 380): conservar **un as-built vigente** (+ nota de sucesion v2.0→383) y mantener el blueprint en 05 como historico.
6. **12 vs 11:** SQL ejecutable bajo `docs/`: se define `12-database` como espejo versionado con notas minimas; la narrativa arquitectonica de persistencia vive en 04. Sprint 399 verifica si existe `supabase/` fuera de docs como ejecucion canonica.
7. **06 vs 10:** 06 = analisis fechado con pretension normativa; 10 = contexto operativo de agentes. Ningun snapshot de 10 cita como norma; ninguna "restriccion vinculante" de 06 se aplica sin pasar por 00/ADR.
8. **07 vs 11:** 07 es sub-tema estable de arquitectura; se mantiene como area minima (principio: no fusionar por tamano).
9. **08 vs 09:** sin solapamiento (registro tecnico oficial vs inventarios de negocio).

## 10. Documentation Classification Model

| Categoria | Donde vive | Ejemplo actual |
|-----------|-----------|----------------|
| CURRENT | 11 (overview), 01/02/03/04/07/08 (temas vigentes) | `11/ARCHITECTURE_OVERVIEW.md` (tras deduplicar) |
| GOVERNANCE | 00 (`GOVERNANCE.md`, futuro) | reglas Sprint 397 §17 / este informe §22 |
| ARCHITECTURE | 11/15/01/04/06/07 | `15/current-architecture.md`, `01/component_registry.md` |
| ADR | 15/adr exclusivamente | ADR-001…010 + index |
| IMPLEMENTATION | 05 | blueprints, `implementation_roadmap.md` |
| INFRASTRUCTURE | 04 | persistence/storage/transaction/infra layers |
| DATABASE | 12 | migrations, RLS, schema |
| BUSINESS | 09 | inventarios |
| ANALYSIS | 06 | analisis enterprise, analytics/IA-ready |
| AI CONTEXT | 10 | handoff, snapshots, histories |
| AUDIT (gobernanza) | 13 (informes AUD-*, 39x) | AUD-001/002/003.1/398 |
| SPRINT EVIDENCE | 14/history + anexos 13 | Sprint-*.md, AUDIT_*_RESULT |
| HISTORICAL | in-situ con marca de version/fecha | roadmaps, Fase 1/2 docs, Empresa Demo |
| TEMPORARY | no persiste (se elimina tras uso) | ninguno detectado (verificar TODOs en 399) |
| OBSOLETE | se archiva, no se publica como vigente | `00/tree_docs.md` (Sprint 397) |

## 11. Source-of-Truth Model

| Dominio | Fuente de verdad |
|---------|-----------------|
| Proceso/gobernanza | `00/GOVERNANCE.md` (futuro; hoy: Sprint 397 + este informe como especificacion) |
| Contratos | `02/contract-registry.md` (todo contrato existe solo si esta registrado) |
| Decisiones | `15/adr/adr-index.md` (toda decision formal solo si es ADR) |
| Motores | `08/engine_registry.md` |
| Arquitectura vigente | un overview (11 o 15, §18) + `15/current-architecture.md` como detalle |
| Deployment as-built | un documento (§9.5) + workflow `.github/` como ejecucion |
| DB aplicada | migraciones `12-database/supabase/migrations` + notas |
| Estado IA/agentes | `10/AI_HANDOFF_INDEX.md` (entry point declarado) |
| Auditorias | informe gobernanza en 13 (AUD-*/39x); la evidencia cruda nunca contradice al informe |
| Historia Sprint | `14/history/<rango>/Sprint-*.md` + `15/historical-knowledge-map.md` como indice |

Regla de desempate: ante dos documentos vigentes sobre el mismo tema, vale el de mayor version/fecha con certificacion Sprint citada; el otro se marca historico con nota de sucesion. Nunca dos vigentes en paralelo.

## 12. Document Routing Rules

1. ¿Es regla de proceso? → 00 (solo via actualizacion de `GOVERNANCE.md`).
2. ¿Es decision arquitectonica formal? → 15/adr (nuevo ADR + index).
3. ¿Es contrato? → 02 (+ entrada en registry; sin entrada no existe).
4. ¿Describe runtime/validacion/infra/DB/analisis/escalabilidad vigente? → 01/03/04/12/06/07 segun tema.
5. ¿Es plan/blueprint de implementacion? → 05.
6. ¿Es inventario de negocio? → 09. ¿Registro de motores? → 08.
7. ¿Es contexto operativo para agentes (snapshot, handoff, historial de trabajo)? → 10. ¿Analisis enterprise fechado? → 06.
8. ¿Es resultado de auditoria con veredicto? → 13 como informe; ¿papel de trabajo? → 13/anexo separado.
9. ¿Es evidencia de un Sprint? → 14/history/<rango>. ¿Mapa de conocimiento? → 15.
10. ¿Es SQL aplicable? → 12 (+ nota minima). ¿Presentacion profesional (overview/feature/security/interview/roadmap)? → 11 (opcion B §18) o raiz de dominio segun §18.
11. En duda → REVIEW (no crear carpeta nueva; no duplicar).

## 13. Historical Documentation Strategy

- Vigente vs historico se separa por **marca explicita** (Version/Status/fecha/Sprint), no por carpeta: los dominios conservan sus hitos in-situ.
- Excepciones: `14-sprint` (toda evidencia Sprint, cronologica) y anexos de `13` (papeles forenses).
- Prohibido reescribir historia para "limpiar": se marca, se referencia, no se edita.
- `15/historical-knowledge-map.md` es el indice oficial Sprint→dominio.

## 14. Governance Boundary

Se adopta integro el boundary Sprint 397 §12. Aporte 398: las "restricciones vinculantes" de `06/ANALISIS_ARQUITECTURA_ENTERPRISE.md` y la autoridad SSOT de `15/CORE_GOVERNANCE_MODEL_v1.md` **no son Governance de proceso**: gobiernan el Core arquitectonico. Toda norma de proceso general futura vive en `00/GOVERNANCE.md`; toda norma arquitectonica, en ADR/SSOT de 15.

## 15. Architecture / ADR Boundary

- `15/adr/` queda reservado a decisiones formales con lifecycle (PROPOSED/ACCEPTED/SUPERSEDED/DEPRECATED). Estado actual: ejemplar (10 ACCEPTED + index).
- `DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1.md` (decision formal fuera de `adr/`) debe normalizarse a ADR o reclasificarse como modelo SSOT (decision en Sprint 400, no aqui).
- `15/current-architecture.md`, `deployment-architecture.md`, familia `CORE_*_v1`, `MODULE_CONTRACT_v1`, `BUSINESS_CAPABILITY_CONTRACT_v1` son modelos/contratos certificados, no ADRs: conviven bajo 15 con roles distintos (modelos vs decisiones).
- `11-architecture` es vista consolidada/divulgativa; `15-architecture` es detalle certificable + decisiones. Ver deduplicacion del overview en §18.

## 16. Consolidation Findings

1. **Overview duplicado (critico):** `11/ARCHITECTURE_OVERVIEW.md` v2.0-383 vs `15/current-architecture.md` v3.0-380. Unificar a un vigente (§18).
2. **Deployment triplicado (alto):** `04/DEPLOYMENT_OVERVIEW.md` (383) vs `15/deployment-architecture.md` (380) vs `05/deployment_architecture.md` (blueprint v1.0). Un as-built vigente + blueprint historico (§9.5).
3. **Contratos dispersos (medio):** `04/runtime_api_contracts.md` referenciar desde `02`; `02/00-roadmap-maestro.md` no es contrato (reubicar a 05/14/15-segun-origen).
4. **Niveles mezclados en 13 (medio):** informes AUD-* vs papeles AUDIT_*_RESULT/V1/V2/50_2. Separar presentacion (informes) de anexos (evidencia).
5. **Evidencia Sprint en areas vigentes (medio):** `15/SPRINT_65E_*`, `15/TODO.md`, `01/SPRINT_8_*` → 14/anexo.
6. **Duplicados nominales (bajo):** `AntiBypassRules.md` (02, vacio) vs `ANTI_BYPASS_RULES.md` (01); `SRCL_V1.0.md` (02) vs `SRCL_v1.0.md` (01). Resolver por contenido en Sprint 399 (uno vacio sugiere borrado seguro tras verificacion hash).
7. **Higiene (bajo):** typo `10/ROJECT_STRUCTURE_TREE.md`; link absoluto local en `11/field-types.md:9`; `prompt.md` en `01/03-master-model`; `field-types.md` mejor referenciado desde 01/02.
8. **Capa profesional dispersa (medio):** Sprint-383 `FEATURE_OVERVIEW` (05), `DEPLOYMENT_OVERVIEW` (04), `SECURITY_OVERVIEW`/`PROFESSIONAL_ROADMAP`/`INTERVIEW_TALKING_POINTS` (00) + `ARCHITECTURE_OVERVIEW` (11). Decidir sede unica (§18 opcion B).

## 17. Migration Candidates

- A 14/history o anexo 13: `00/architecture_progress.md`, cuerpo historico de `00/changelog.md`, `15/SPRINT_65E_*`, `01/SPRINT_8_*`, `15/TODO.md` (o eliminar si temporal — decide 399), `10/SPRINT_HISTORY.md` (evaluar: log operativo vs indice; el indice oficial es `15/historical-knowledge-map.md`).
- A 05 u origen Sprint: `02/00-roadmap-maestro.md`.
- A sede profesional unica: `00/INTERVIEW_TALKING_POINTS.md`, `00/PROFESSIONAL_ROADMAP.md` (reglas→00/GOVERNANCE), `00/SECURITY_OVERVIEW.md`, `05/FEATURE_OVERVIEW.md`, `04/DEPLOYMENT_OVERVIEW.md` (si es el as-built elegido).
- A 01/02 (referencia): `11/field-types.md`, `04/runtime_api_contracts.md` (referencia en registry).
- A normalizacion ADR/SSOT: `15/DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1.md`.
- A revision hash: duplicados §16.6, vacio §16.6.
- Sin movimiento: 03, 07, 08, 09, 12 (salvo notas), 06 (salvo marcas), 10 (salvo typo/links), `adr/`, `contract-registry.md`, `08/engine_registry.md`.

## 18. Target Documentation Architecture

Se mantienen las 16 areas. Sin carpetas nuevas. Ajustes internos:

```text
docs/
├── 00-governance/      # GOVERNANCE.md (unico CURRENT) + historicos marcados hasta migrar
├── 01-core-runtime/    # runtime vigente + freeze/master-model; sin evidencias Sprint ni prompts
├── 02-contracts/       # registry SSOT + contratos (sin roadmaps, sin vacios)
├── 03-validation/      # sin cambios
├── 04-infrastructure/  # as-built infra/persistencia (+ deployment as-built si se elige)
├── 05-implementation/  # blueprints/planes historicos
├── 06-analytics-ai/    # analisis fechados (con marca historica donde aplique)
├── 07-scalability/     # sin cambios
├── 08-registry/        # sin cambios
├── 09-business-assets/ # sin cambios
├── 10-ai-context/      # contexto operativo (typo corregido en migracion, links sanos)
├── 11-architecture/    # vista consolidada vigente (opcion B: sede profesional)
├── 12-database/        # SQL versionado + notas minimas
├── 13-auditoria/       # informes/ (AUD-*, 39x) + anexos/ (evidencia cruda)
├── 14-sprint/          # history/ 4 rangos (estado actual: solo history — ver §21.7)
└── 15-architecture/    # adr/ + modelos SSOT + mapas (sin reportes Sprint ni TODOs)
```

Opcion B (recomendada, a ratificar en Sprint 400): concentrar la capa profesional Sprint-383 (overview/feature/deployment/security/interview/roadmap-profesional) bajo `11-architecture/` como vista divulgativa, dejando `15-architecture` como detalle certificable. Alternativa A: devolver presentacion a raiz `docs/` (revierte normalizacion AUD-002; desaconsejada).

## 19. Proposed Migration Sequence

- **399 Global Documentation Audit:** inventario archivo-por-archivo fuera de 14 (ya auditados 00 en 397 y 14 en AUD-003.2); verifica deltas §21.7, duplicados §16.6, vacio, typo, links; clasifica cada archivo segun §10.
- **400 Consolidation & Migration Plan:** resuelve overview (§16.1), deployment (§16.2), sede profesional (§18-B), decision-vs-modelo (§15), niveles de 13 (§16.4); emite mapa fila-por-archivo estilo AUD-003.2.
- **401 Controlled Migration:** `git mv` por lotes, SHA-256 antes/despues, sin reescritura de contenido.
- **402 Validation:** conteos, links, build/tests solo-lectura de artefactos (sin cambios funcionales).
- **403 Certification + Governance Finalization:** crea `00/GOVERNANCE.md` desde §22, certifica estructura, cierra reglas anti-acumulacion.

## 20. Risks

- Deduplicar overviews eligiendo mal la version vigente → mitigacion: matriz v2.0-383 vs v3.0-380 en Sprint 400 (contenido casi identico; difieren baseline `eceaf47` vs `cc42e3c`).
- Romper links al mover presentacion profesional → mitigacion: inventario de referencias en 399 (DOCUMENTATION_INDEX.md ya no existe; verificar sustituto).
- Tratar evidencia como borrable (changelog, SPRINT_HISTORY, ANALISIS Mayo-2026) → mitigacion: archivar/marcar, jamas reescribir.
- `12-database` ejecutable vs espejo: aplicar SQL equivocado → mitigacion: 399 confirma canon de ejecucion.
- Re-fragmentacion futura → mitigacion: routing rules §12 + regla anti-acumulacion en GOVERNANCE.md.

## 21. Open Questions

1. ¿Cual overview queda vigente (11 v2.0-383 o 15 v3.0-380)? (Sprint 400 con matriz de diff).
2. ¿Cual deployment es as-built canonico (04-383 vs 15-380)? ¿Donde vive la sede profesional (opcion B)?
3. ¿`DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1` se convierte en ADR-011 o queda SSOT-modelo?
4. ¿`13-auditoria` separa fisicamente `informes/` y `anexos/` o solo por nomenclatura?
5. ¿`12-database` es canon de ejecucion o espejo (existe `supabase/` fuera de docs)?
6. ¿`10/SPRINT_HISTORY.md` (1510 lineas) se conserva como log operativo o se archiva por redundancia con `14/history` + knowledge-map?
7. **Deltas post-AUD-003.2 observados (verificar en 399):** `001-100/`=134 (mapa predecia 20+113=133 si TODO_SPRINT_45 iba a history, o 20+114=134 si iba a history — cuadra con 134 solo en la segunda variante); `301-400/`=86 (mapa: 78+5 raiz+Sprint-397=84; **+2 sin explicar**); `audits/`, `todos/`, `45–49-sprint/` inexistentes (¿eliminados tras migrar a donde?); `DOCUMENTATION_INDEX.md` y `.md` de raiz inexistentes (¿reubicados donde? `ARCHITECTURE_OVERVIEW.md`→11 confirmado; resto pendiente).

## 22. Governance Inputs

Reglas candidatas para `00/GOVERNANCE.md` (Sprint 403): propositos §5 y exclusiones §8 como tabla normativa; routing rules §12 como procedimiento; desempate SoT §11; prohibiciones (sin carpetas nuevas, sin vigentes duplicados, sin evidencia Sprint fuera de 14, sin decisiones fuera de `adr/`, sinanalyses normativos fuera de 00/ADR, sin reescritura historica); cadencia de revision trimestral con checklist (conteo por area, links, overview unico, registry/adr-index al dia).

## 23. Final Certification

Se certifica que: las 16 areas tienen proposito definido (§5–§6); cada area tiene limites explicitos (§8) y fronteras analizadas (§9); existen reglas de ruteo (§12), modelo de clasificacion (§10) y modelo SoT (§11); CURRENT/HISTORICAL (§13), Governance/Architecture (§14), Architecture/ADR (§15) y Audit/Evidence (§9.1, §16.4) quedan separados por definicion; duplicidades/solapamientos identificados (§16); arquitectura objetivo (§18) y estrategia de migracion (§19) establecidas; resultado documentado en este archivo; ningun otro archivo modificado (verificacion por `git status` en Sprint 399/402).

## 24. Final Verdict

**PASS WITH FINDINGS** — contrato documental completo y certificable; los findings (§16–§17, §21) son el insumo ordenado del Sprint 399, no bloqueos del modelo.
