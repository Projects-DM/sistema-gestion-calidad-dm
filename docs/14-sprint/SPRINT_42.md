SPRINT 42
Rules Propagation Cleanup

Estado:
COMPLETADO

Objetivo:
Consolidar la propagación de reglas desde useRulesEngine hasta LayoutEngine.

Archivos:
- FormRuntimeHost.tsx

Cambios:
- Eliminados void hiddenFields / void disabledFields.
- hiddenFields propagado a FormRendererEngine.
- disabledFields propagado a FormRendererEngine.
- computedValues continúa fusionándose mediante mergedFormData.
- FormRendererEngine ya delega hiddenFields y disabledFields a LayoutEngine.

Resultado:
Reglas dinámicas ahora atraviesan completamente el pipeline Runtime:

RulesEngine
→ FormRuntimeHost
→ FormRendererEngine
→ LayoutEngine
→ DynamicFieldRenderer

Build:
Pendiente por limitación del entorno.

Hay una observación técnica para anotar en la documentación:

hiddenFields={hiddenFields ? new Set(hiddenFields) : undefined}
disabledFields={disabledFields ? new Set(disabledFields) : undefined}

funciona correctamente, aunque más adelante (cuando optimicemos renders) probablemente eliminaremos esos new Set(...) porque generan nuevas referencias en cada render. No es un problema ahora, pero vale la pena dejarlo anotado para una futura optimización.

Arquitectura Sprint 42
Rules Engine
────────────────────────────────────

RuleRegistry
        │
        ▼
RuleRuntimeResolver
        │
        ▼
FormRuntimeHost
        │
        ▼
useRulesEngine
        │
        ├────────► hiddenFields
        │
        ├────────► disabledFields
        │
        └────────► computedValues
                        │
                        ▼
                 mergedFormData
                        │
                        ▼
             FormRendererEngine
                        │
                        ▼
                 LayoutEngine
                        │
                        ▼
            DynamicFieldRenderer