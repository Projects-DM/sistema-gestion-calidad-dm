 Sprint 24 — Form Contract Engine

Estado: COMPLETADO

Fecha: 2026

Objetivo:
Construir la capa contractual obligatoria para toda la digitalización futura.

Componentes implementados:

src/runtime/validation/form/

- formContractRules.ts
- FormContractValidator.ts
- AntiBreakingGuard.ts
- FormBlueprintGenerator.ts
- index.ts

Capacidades:

✔ Validación de motores oficiales
✔ Validación de metadata IA
✔ Validación de contratos universales
✔ Bloqueo de formularios inválidos
✔ Blueprint Generator
✔ Anti Breaking Guard

Resultado:

Ningún formulario nuevo puede crearse fuera del contrato oficial SGC.

Estado Arquitectura:

Sprint 24 Certificado.

feat(layout-engine): implement Sprint 26 layout architecture layer

* add LayoutContracts.ts (LayoutDefinition, SectionDefinition, ColumnDefinition, FieldReference)
* add LayoutEngine.tsx structural renderer
* enable multi-section / multi-column layout rendering
* integrate DynamicFieldRenderer for field resolution
* enforce strict separation between layout and business logic
* maintain compatibility with ComponentRegistry (Sprint 25 renderer system)

ARCHITECTURE:
LayoutDefinition → LayoutEngine → DynamicFieldRenderer → ComponentRegistry → Field Components

BREAKING CHANGES:
none

NOTES:
Layout layer is purely structural and contains no runtime or validation logic.
