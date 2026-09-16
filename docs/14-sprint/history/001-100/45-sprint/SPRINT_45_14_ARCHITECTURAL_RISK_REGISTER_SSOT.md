# SPRINT_45_14 — ARCHITECTURAL RISK REGISTER (SSOT)

> Documento SSOT (Solo auditoría documental).
>
> NO implementar código.
> NO modificar componentes.
> NO modificar runtime.
> NO modificar base de datos.
> NO refactorizar.

Exclusión obligatoria:
> **Trazabilidad NO constituye referencia arquitectónica.**

---

## 0) Fuentes de evidencia (solo SSOT)
- Sprint 45.9 — Standard Contract Map
- Sprint 45.10 — Standard Dependency Map
- Sprint 45.10A — Dependency Refinement
- Sprint 45.11 — Standard Core Architecture
- Sprint 45.11A — Architecture Certification Review
- Sprint 45.12 — Evolution Rules
- Sprint 45.13 — ADR Repository
- Sprint 45.13A — ADR Governance

---

## 1) Objetivo
Inventariar riesgos arquitectónicos del **Módulo Estándar** basados únicamente en lo documentado en los SSOT del Sprint 45. No se proponen implementaciones.

---

## 2) Catálogo oficial de riesgos (inventario)

> Nota documental: las clasificaciones de probabilidad/impacto se basan en la dependencia observada del flujo estándar y en los invariantes descritos en 45.12 y el core definido en 45.11/45.11A.

### Tabla maestra (Riesgos)

| ID | Nombre | Categoría | Descripción | Componentes afectados | Contratos afectados | Dependencias afectadas | Probabilidad | Impacto | Nivel | Owner arquitectónico | Evidencia documental | Estrategia de mitigación (documental) | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R-001 | Ruptura del contrato submit | Contratos | Cambios breaking en la salida/semántica de `submit` que alimenta persistencia y runtime bridge | `DynamicForm`, `dynamicService`, `runtimeActivationLayer`, `DynamicRecordsView` | Contrato de retorno con `__runtime_internal_event` | `dynamicService` (submit), engine/EAV mapping | Media | Crítico | Rojo | dynamicService | 45.9, 45.10, 45.11, 45.12 | “Nunca romper contrato público de submit/retorno __runtime_internal_event”; “antes de cambios aplicar checklist y ADR review” | No aceptable |
| R-002 | Ruptura del contrato verify | Contratos | Cambios breaking en `verify` que afectan estado, auditoría y activación runtime | `DynamicRecordsView`, `dynamicService`, `runtimeActivationLayer` | Contrato verify + evento `type=verify` | persistencia `sgc_audit_logs`/updates, runtime bridge | Media | Crítico | Rojo | DynamicRecordsView | 45.9, 45.10, 45.11, 45.12 | “Preservar semántica `type=verify` y persistencia audit”; “verificar compatibilidad con Evolution Rules” | No aceptable |
| R-003 | Incompatibilidad Runtime Bridge | Runtime | Eventos que no cumplen el contrato mínimo exigido por `runtimeActivationLayer.activate` | `runtimeActivationLayer`, `dynamicService`, `DynamicForm`, `DynamicRecordsView` | Contrato `__runtime_internal_event` + `event.type` ∈ {create, verify} | BusinessEventTranslation + runtime bridge | Media | Crítico | Rojo | runtimeActivationLayer | 45.9, 45.11, 45.12 | “Mantener campos requeridos: type/responseId/actorId/correlationId”; “no permitir contratos alternativos” | No aceptable |
| R-004 | Cambio incompatible de dynamicService | Persistencia/Contratos | Modificación en `dynamicService` que cambia escrituras/retornos y rompe flujo end-to-end | `dynamicService`, `DynamicForm`, `DynamicRecordsView`, `Configuration/FormBuilder` | Contratos submit/verify/history | sgc_* + joins `profiles` | Alta | Alto | Naranja/ Rojo | dynamicService | 45.10/45.12/45.11 core | “dynamicService se trata como componente crítico”; “revisión arquitectónica obligatoria ante cambios” | No aceptable |
| R-005 | Duplicación de ownership | Gobernanza | Lógica funcional duplicada (criticidad/required/evidence/history enrichment) con owners distintos | `DynamicForm`, `DynamicRecordsView`, engines base | Contratos implícitos de semántica derivada | dependencia UI↔servicios | Media | Alto | Naranja | Governance (reglas ADR) | 45.12 + 45.13A ADR-012/ADR-019 | “Ownership único” como regla; “evidenciar owner por responsabilidad antes de cambios” | No aceptable |
| R-006 | Metadata inconsistente | Metadata | Datos `sgc_*` incompletos o inconsistentes que rompen render/validación/persistencia | `DynamicModule`, `DynamicForm`, engines base, `dynamicService` | Contrato de metadata para execution | sgc_forms, sgc_form_fields | Alta | Alto | Rojo/Naranja | Metadata | 45.11 + 45.12 | “Metadata-driven requiere consistencia”; “agregar checks documentales: engine_type/field_type soportados” | No aceptable |
| R-007 | Nuevo engine incompatible | Runtime/Engines | Introducción de `engine_type` no compatible con el contrato props de engines base y/o semántica de valores | `DynamicForm`, engines base, `dynamicService` | Contrato de engine render/outputs (val EAV) | field_type mapping | Media | Alto | Naranja | Engines base / DynamicForm | 45.12 (nuevos engines) | “todo nuevo engine respeta props `{fields, values, onChange}` y mapping compatible con submit/EAV” | No aceptable |
| R-008 | Nuevo field_type incompatible | Runtime/Persistencia | `field_type` futuro sin soporte completo en chain render→values→submit→history/criticidad | engines base, `DynamicForm`, `DynamicRecordsView`, `dynamicService` | Contratos de mapping EAV por campo | options/required/evidence rules | Media | Alto | Naranja | Engines base / DynamicRecordsView | 45.12 (nuevos field_type) | “field_type compatible solo si chain completa respeta contratos”; “revisión arquitectónica obligatoria” | No aceptable |
| R-009 | Acoplamiento Core ↔ Documental | Extensiones | Mezcla de responsabilidades documental con pipeline estándar (submit/verify) | `DynamicModule`, `DynamicForm/DynamicRecordsView`, `ModuleDocumentViewer`, `DocumentModule`, `documentsService` | Contrato separador Core vs extensión | `documentsService` | Media | Medio/Alto | Naranja | Governance (Core vs Extension) | ADR-008, 45.11 | “Documental como extensión; no pertenece al Core mínimo”; “no cruzar pipeline” | Aceptable con disciplina |
| R-010 | Cambios breaking en contratos públicos | Contratos | Modificación de cualquier contrato observable (submit/verify/bridge) sin revisión del SSOT | Todo Core | contratos públicos observables | dynamicService/runtime bridge | Media | Crítico | Rojo | Governance | 45.12, 45.13 ADR-018/ADR-016 | “Contracts first” + “no romper compatibilidad” | No aceptable |
| R-011 | Pérdida del modelo Metadata Driven | Metadata | El comportamiento funcional deja de depender de `sgc_*` y se vuelve codificado | UI components core, engines | Contrato metadata→comportamiento | sgc_* | Baja/Media | Crítico/Alto | Rojo/Naranja | Metadata | ADR-001, 45.12 | “Siempre derivar definición funcional desde metadata”; “sin lógica específica de negocio en UI” | No aceptable |
| R-012 | Desalineación entre ADR y SSOT | Gobernanza | ADR contradicen o divergen de invariantes definidos en 45.12/45.11 | ADR repo, governance | Reglas de evolución, invariantes | totalidad del core | Baja | Alto | Naranja | Governance | 45.13/45.13A + 45.12 | “Toda nueva decisión requiere coherencia con SSOT”; “certificación congela” | No aceptable |
| R-013 | Desalineación entre Contracts y Evolution Rules | Contratos/Gobernanza | Evolution Rules no reflejan contratos observables reales; o viceversa | dynamicService/runtime | contratos + reglas | puente | Baja | Alto | Naranja | Governance + dynamicService | 45.9 + 45.12 | “si cambia contrato, actualizar SSOT docs con revisión arquitectónica” | Aceptable con disciplina |
| R-014 | Desacople incompleto del Runtime | Runtime | runtime bridge asume contratos internos que no son invariantes, causando acoplamiento oculto | runtimeActivationLayer, DynamicForm, DynamicRecordsView | contrato `__runtime_internal_event` | runtime bridge | Media | Alto | Naranja | runtimeActivationLayer | ADR-003/ADR-006 | “Mantener contrato mínimo; no contratos alternativos”; “revisión obligatoria” | No aceptable |
| R-015 | Duplicación de persistencia | Persistencia | Persistencia paralela para submit/verify/history genera divergencia audit/estado | dynamicService | persistencia centralizada | sgc_* | Baja/Media | Crítico/Alto | Rojo/Naranja | dynamicService | ADR-002 | “Persistencia centralizada en dynamicService”; “no duplicar escritura” | No aceptable |

---

## 3) Riesgos obligatorios a evaluar
Los riesgos R-001 a R-015 definidos arriba cumplen el mínimo solicitado.

---

## 4) Matriz Probabilidad × Impacto (oficial)

**Criterio documental:**
- Verde: Bajo prob/impact o combinación no-crítica
- Amarillo: prob baja/media con impacto bajo/medio
- Naranja: prob media con impacto alto o prob alta con impacto medio
- Rojo: prob media/alta con impacto crítico o prob alta con impacto alto

### Matriz

| Probabilidad \ Impacto | Bajo | Medio | Alto | Crítico |
|---|---|---|---|---|
| Alta | — | Amarillo | Naranja | Rojo |
| Media | Amarillo | Naranja | Rojo | Rojo |
| Baja | Verde | Amarillo | Naranja | Naranja |
| Muy Baja | Verde | Verde | Amarillo | Amarillo |

**Ubicación (resumen):**
- Rojo: R-001, R-002, R-003, R-004, R-010
- Naranja: R-005, R-006, R-007, R-008, R-014, R-015 (según criticidad de persistencia), R-009
- Verde/Amarillo: ninguno clasificado como Verde; R-009 con disciplina tiende a Amarillo/ Naranja

---

## 5) Ownership (resumen)
- `dynamicService`: R-001, R-002, R-004, R-015
- `runtimeActivationLayer`: R-003, R-014
- `DynamicForm`: indirecto en R-001, R-007, R-008
- `DynamicRecordsView`: R-002, R-008
- `Metadata`: R-006, R-011
- `Governance`: R-005, R-012, R-013
- `Documental/Extensiones`: R-009

---

## 6) Mitigaciones documentales (reglas)
Sin proponer código, solo reglas ya contenidas/derivadas del SSOT:

1. **No romper contratos públicos** (submit/verify/bridge).
2. **Mantener invariantes**: `__runtime_internal_event` mínimo y `event.type`.
3. **No duplicar persistencia** (submit/verify/history centralizado).
4. **Metadata-driven** como invariantes (sgc_modules/sgc_forms/sgc_form_fields).
5. **Ownership único** para lógica funcional (criticidad/required/evidence/history enrichment).
6. **Revisión arquitectónica obligatoria** ante cambios en contratos, runtime, engines, storage o nuevos field_type.
7. **Documentar coherencia**: ADR debe mantenerse alineado con SSOT.

---

## 7) Riesgos aceptados por diseño
- Mayor complejidad del motor “Metadata Driven” (implica R-006/R-011 en disciplina; se acepta como trade-off).
- Persistencia EAV (implica mayor complejidad de consultas; se acepta como diseño asociado a R-006/R-011).
- Dependencia del Runtime Bridge (R-003 mitigado por invariantes de contrato; se acepta como componente crítico).

---

## 8) Riesgos no aceptables (nunca permitir)
- Romper contratos públicos (R-001, R-002, R-003, R-010)
- Romper Runtime Bridge (R-003, R-014)
- Duplicar persistencia (R-015)
- Eliminar/invalidar metadata-driven (R-011)
- Romper ownership y duplicar lógica funcional (R-005)

---

## 9) Riesgos futuros
Probables derivados de extensiones:
- Nuevos engines que no respetan contrato props/outputs (deriva de R-007)
- Nuevos field_type (scanner/barcode/qr/etc.) incompletos en chain render→submit→history (deriva de R-008)
- Plugins documentales que acoplen pipeline submit/verify (deriva de R-009)
- Offline/workflows que introduzcan persistencia paralela o contratos alternativos (deriva de R-015/R-004)
- Versionado inconsistente de contracts runtime (deriva de R-010/R-013)

---

## 10) Relación con el SSOT (45.9–45.13)

- R-001/R-002/R-003/R-010 ↔ Sprint 45.9 (Contract Map), 45.12 (Evolution Rules)
- R-004/R-015 ↔ Sprint 45.10/45.11 (Dependency/Core), ADR-002
- R-005/R-012 ↔ Sprint 45.13/45.13A (ADR governance), 45.12 (Ownership/Evolution)
- R-006/R-011 ↔ ADR-001/ADR-017/45.12 (Metadata driven)
- R-007/R-008 ↔ 45.12 (nuevos engine/field_type)
- R-009 ↔ ADR-008/45.11 core/extension separation
- R-013 ↔ 45.12 (alignment contracts vs rules)
- R-014 ↔ ADR-003/ADR-006 (runtime bridge contract)

---

## 11) Matriz de trazabilidad (Riesgo → Contratos → Dependencias → ADR → Reglas → Componentes)

| Riesgo | Contratos | Dependencias | ADR(s) | Reglas de evolución | Componentes afectados |
|---|---|---|---|---|---|
| R-001 | submit + `__runtime_internal_event` | dynamicService, EAV mapping | ADR-002, ADR-003, ADR-006 | 45.12 Invariantes + checklist | DynamicForm, dynamicService, runtimeActivationLayer |
| R-002 | verify + audit + bridge type=verify | dynamicService, sgc_audit_logs | ADR-002, ADR-006 | 45.12 verify invariants | DynamicRecordsView, dynamicService, runtimeActivationLayer |
| R-003 | `__runtime_internal_event` mínimos | runtimeActivationLayer | ADR-003, ADR-006 | 45.12 runtime contract | runtimeActivationLayer, DynamicForm/RecordsView |
| R-004 | dynamicService contract | sgc_* persistencia | ADR-002 | 45.12 cambios obligan revisión | dynamicService + core UI |
| R-005 | ownership de lógica funcional | UI/services/runtime boundary | ADR-012/ADR-019 | 45.12 ownership rule | DynamicForm/DynamicRecordsView |
| R-006 | metadata consistency | sgc_forms/fields | ADR-001/ADR-017 | 45.12 metadata driven | DynamicModule/DynamicForm/Engines |
| R-007 | engine_type compat | engines base props | ADR-004 | 45.12 new engines | DynamicForm, engines |
| R-008 | field_type compat | engines→EAV→history | ADR-005/ADR-004 | 45.12 new field_type | Engines, DynamicRecordsView |
| R-009 | core vs extension boundaries | documentsService | ADR-008/ADR-020 | 45.12 ext vs core | DocumentModule/ModuleDocumentViewer |
| R-010 | contratos públicos observables | all core | ADR-018 | 45.12 contracts first | submit/verify/bridge |
| R-011 | metadata-driven model | sgc_* | ADR-001/ADR-014 | 45.12 evolution via metadata | entire module |
| R-012 | ADR↔SSOT alignment | governance rules | ADR-016 + 45.11A | 45.12 consistency | ADR repo & governance |
| R-013 | contracts↔rules alignment | SSOT evolution rules | ADR-013 | 45.12 evolution rules | governance |
| R-014 | runtime decoupling completeness | bridge contract | ADR-003/ADR-006 | 45.12 bridge invariants | runtimeActivationLayer/DynamicForm |
| R-015 | persistencia centralizada | dynamicService | ADR-002 | 45.12 no parallel persistence | dynamicService |

---

## 12) Certificación del SSOT (dictamen)

- **Nivel general de riesgo arquitectónico:** **Parcialmente estable**
- **Componentes más sensibles:**
  - `dynamicService` (R-001, R-004, R-015)
  - `runtimeActivationLayer` + `__runtime_internal_event` (R-003, R-014)
  - Engines base + compatibilidad `engine_type`/`field_type` (R-007, R-008)
  - Metadata consistency `sgc_*` (R-006, R-011)
- **Componentes con mayor resiliencia:**
  - UI cosmética y filtros (reducen probabilidad de impacto crítico)
  - Documental como extensión (riesgo controlado por ADR-008/ADR-020)
- **Riesgos mitigados por el SSOT:**
  - Todos los “no aceptables” cuentan con invariantes/reglas ya definidas en 45.12 y/o ADRs.
- **Riesgos pendientes:**
  - Riesgo de disciplina: asegurar que cada cambio que afecte contratos o engine/field_type sea acompañado por actualización SSOT/ADR (riesgo de gobernanza R-012/R-013).
- **Riesgos aceptados:**
  - Complejidad del modelo metadata-driven (trade-off), complejidad derivada de EAV.

- **Estado de certificación:** **Congelable** si y solo si se respeta el proceso documental de revisión obligatoria ante cambios core.

---


