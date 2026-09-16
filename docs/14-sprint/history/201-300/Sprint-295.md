# Sprint 295 — Unified Alert Resource Presentation Standard

Rama: `release/stable-sprint79`
Modo: CONTROLLED UI STANDARDIZATION · PRESENTATIONAL ONLY
Dependencias: Sprint 290 · 291 · 292 · 294

## Fase A (incluida en este sprint) — Disabled Alert Visual Suppression

Ver `scripts/sprint-295-disabled-alert-visual-suppression.mjs`. Una alerta
`enabled === false` no se presenta en Formulario / Repositorio / Categoría (el
selector `projectResourceAlertState` descarta sus ocurrencias y devuelve
`null`); la configuración, persistencia, dominio, runtime y las ocurrencias
permanecen intactas.

## Fase B — Unified Alert Resource Presentation (este documento)

### Objetivo

Un único estándar visual para las alertas operacionales, independientemente del
recurso que la consume (Formato / Repositorio / Categoría). La alerta es el
**estado del recurso**, nunca una segunda funcionalidad.

### Estado antes

Dos estándares visuales del mismo dominio:

- **Formato**: bloque compacto `Alerta operacional` + horarios agrupados
  (Sprint 292).
- **Repositorio / Categoría**: bloque rico `Estado · Prioridad · Próximo
  vencimiento · N evento(s) abierto(s)` + lista de eventos.

### Estándar único

```
┌──────────────────────────────────────┐
│ ⚠ Alerta operacional                  │
│   Hoy · 20:37 · 20:40 · 20:41        │
│   Mañana · 05:11                     │
└──────────────────────────────────────┘
```

- Header consistente: icono + `Alerta operacional`.
- Horarios agrupados por día (el día aparece UNA vez por grupo).
- Sin `Estado:`, sin `Prioridad:`, sin `Próximo vencimiento:`, sin
  `N evento(s) abierto(s)` (Regla D).
- Eventos `completed`/`cancelled` NO aparecen como horarios pendientes
  (Regla B).
- Responsive: `flex-wrap` + `whitespace-nowrap` — nunca overflow horizontal.

### Fuente única de presentación

Un componente presentacional puro end-to-end para las tres superficies
(`Formato`, `Repositorio`, `Categoría`), que consume el estado ya proyectado:

```
    projectResourceAlertState(state)
                     │
                     ▼
         buildScheduleLines(state.events)
                     │
                     ▼
   UnifiedAlertResourcePresentation (presentational-only)
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
     FORMATO     REPOSITORIO   CATEGORÍA
```

### Archivos

- `src/shared/components/alert/UnifiedAlertResourcePresentation.jsx` —
  componente presentacional único (Fase B).
- `src/pages/DynamicModule.jsx` — `FormatAlertState` delega al componente único
  (AC-01: compacto de Sprint 292 preservado).
- `src/modules/documentViewer/ModuleDocumentViewer.jsx` —
  `RepositoryAlertStateBlock` (repositorio y categoría) delega al componente
  único; se elimina el bloque rico.
- `docs/Sprint-295.md` — este documento.
- `scripts/sprint-295-unified-alert-resource-presentation.mjs` — certificación.

### Acceptance Criteria (resumen)

AC-01..AC-14: estándar único en las tres superficies, horarios agrupados, sin
metadata secundaria, una alerta por recurso, eventos completados/cancelados
excluidos, categoría propia y fallback con el mismo diseño, responsive sin
overflow. AC-15..AC-22: ni nueva lógica de alertas, ni runtime, ni persistencia,
ni configuración, ni identidad, ni Completion, ni OccurrenceProjection, ni
contratos certificados. AC-23 responsive, AC-24 Build PASS, AC-25 tests PASS.

### No se toca

`AlertConfiguration` · `AlertConfigurationPanel` ·
`AlertConfigurationPersistenceAdapter` · `OccurrenceProjection` ·
`OccurrenceLifecycle` · `OccurrenceLedger` · `Completion` · `Scheduler` ·
`RuntimeBinding` · `Resolver` · `Persistence` · `Schema` · `Supabase` y las
relaciones Repository→Category / Category→Alert / Form→Alert.

### STOP

Detener si se descubre que la unificación requiere modificar proyección,
lifecycle, completion, persistencia o configuración; crear identidad nueva,
`Alert*`, store o runtime nuevo; duplicar `useAlertRuntime`; o lógica específica
de Repository/Category.