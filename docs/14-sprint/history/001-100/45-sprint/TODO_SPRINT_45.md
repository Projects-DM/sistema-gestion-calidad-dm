# TODO — SPRINT 45 (Blackbox)

## Sprint 45.1 — Current System Audit (SSOT)
- [x] Generar `docs/45-sprint/SPRINT_45_CURRENT_SYSTEM_AUDIT.md`
- [x] Generar `docs/45-sprint/SPRINT_45_1A_CURRENT_SYSTEM_DECOMPOSITION.md`
- [x] Generar/refinar `docs/45-sprint/SPRINT_45_1_STANDARD_MODULE_DEFINITION.md`

## Sprint 45.2 — Module Creation Flow Audit (SSOT)
- [x] Generar `docs/45-sprint/SPRINT_45_2_MODULE_CREATION_FLOW_AUDIT.md`

## Sprint 45.3 — Form Builder Audit (SSOT)
- [x] Generar `docs/45-sprint/SPRINT_45_3_FORM_BUILDER_AUDIT.md`

## Sprint 45.4 — Module Execution Flow Audit (SSOT)
- [ ] Leer/armar evidencia:
  - `src/App.jsx` (router)
  - `src/pages/DynamicModule.jsx`
  - `src/pages/DynamicForm.jsx`
  - `src/components/engines/BaseChecklist.jsx`
  - `src/components/engines/BaseGeneric.jsx`
  - `src/components/engines/BaseMediciones.jsx`
  - `src/services/dynamicService.js` (submit + getFormFields + getFormBySlug)
  - `src/components/EvidenceUploader.jsx`
- [ ] Documentar flujo completo Sidebar → Engine → dynamicService → Supabase:
  - componentes, props, servicios, tablas consultadas/modificadas, parámetros clave
  - hardcodes y puntos de reutilización
  - diagrama secuencial y conclusión de parametrización mínima
- [ ] Generar `docs/45-sprint/SPRINT_45_4_MODULE_EXECUTION_FLOW_AUDIT.md`
