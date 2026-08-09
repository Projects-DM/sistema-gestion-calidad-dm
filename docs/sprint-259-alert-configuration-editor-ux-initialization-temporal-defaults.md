# Sprint 259 — Alert Configuration Editor UX Initialization & Temporal Defaults

> **Workspace:** `docs/` | **Repo:** `release/stable-sprint79`
> **Type:** Implementation — Functional UX Correction · Presentation Layer only
> **Dependencia:** Sprint 258 Audit → Sprint 259 IMPLEMENT
> **Impacto arquitectónico:** Bajo / Presentation Layer only

## 1. Mandato y objetivos

Implementar, certificadas por Sprint 258, las dos correcciones funcionales del editor de alertas:

1. **Selección inicial** — al abrir el editor NO se selecciona automáticamente la primera alerta (`alerts[0]`); el editor abre en **Modo Nueva Alerta**.
2. **Defaults temporales** — la Nueva alerta inicia con:
   - `startDate` = fecha local actual (`YYYY-MM-DD`)
   - `startTime` = hora local actual (`HH:mm`)

Sprint 257-CERT continúa vigente: la línea de **ALERT OCCURRENCE INFRASTRUCTURE** queda **STABLE / CERTIFIED / HOLD**; este sprint NO toca ningún archivo de ese dominio.

## 2. Decisiones (DEC-259)

| DEC | Regla |
|---|---|
| DEC-259-01 | **No tocar infraestructura de alertas.** No se modifica: occurrence/**, useAlertRuntime, Resolver, AlertConfiguration, ApplicationService, EventBus, Orchestrator. |
| DEC-259-02 | `activeKey === null` **es el contrato de presentación para NEW ALERT MODE**; nunca se crea una alerta persistida artificialmente por abrir el editor. |
| DEC-259-03 | Los defaults temporales son **UI defaults** (Presentation Helper), NO modificación del VO `AlertConfiguration`. |
| DEC-259-04 | Pantalla `getCurrentLocalDateTime` usa **reloj local del navegador** (getFullYear/getMonth/getDate/getHours/getMinutes), **NO** `toISOString()` (UTC). Formatos: `YYYY-MM-DD` y `HH:mm`. |
| DEC-259-05 | Persistencia = pipeline existente (`saveCollection`). Un draft de Nueva alerta solo se materializa al **Guardar** (AC-12, sin autosave). |

## 3. Archivos

### Creado
- `src/modules/experiences/getCurrentLocalDateTime.js` — helper presentacional de fecha/hora local (formato `YYYY-MM-DD` / `HH:mm`).

### Modificado (presentación)
- `src/modules/experiences/AlertConfigurationPanel.jsx`:
  - `activeKey` inicia en `useState(null)` en vez de `alerts[0]?.key`.
  - Nuevo estado `draft` (Modo Nueva Alerta) con `createEmptyFormState()` + `getCurrentLocalDateTime()`.
  - `onChange` enruta a `draft` cuando `activeKey === null`; a `configs[activeKey]` cuando se edita una alerta existente.
  - `addAlert` (botón "Nueva alerta") refresca el draft y entra en NEW ALERT MODE explícitamente.
  - Reorden del form: `activeKey === null` → form del borrador (limpio, defaults locales); alerta existente → valores persistidos.
  - `onSubmit` en Modo Nueva Alerta materializa el draft como nueva alerta y la persiste por `saveCollection` (pipeline existente).
  - Limpieza de `react-hooks/refs` (patrones `useRef` pre-existentes en render) — mismo comportamiento, lint limpio.

### No modificado (guardrail)
- `src/core/capabilities/alert/occurrence/**` — **INTOCADO** (sprint 257-CERT vigente).
- `useAlertRuntime.js`, `AlertConfigurationResolver.js`, `AlertConfiguration.js`, `AlertConfigurationApplicationService.js`, `OperacionalEventBus.js`, `OperationalExperienceLifecycleOrchestrator.js`, `Dashboard.jsx` — intocables.

**REUSE BEFORE CREATE:** se reutilizó `createEmptyFormState()` (`AlertConfigurationMapper.js`) en lugar de duplicar el empty-state; el único helper nuevo es presentacional.

## 4. Comportamiento

### Caso A — abrir editor
```
Abrir "Configurar alerta"
        │
        ▼
Alertas configuradas (2)    ▼  (colapsadas)
        │
        ▼
NUEVA ALERTA
        ├── Nombre: vacío
        ├── Descripción: vacío
        ├── Fecha inicial → HOY (YYYY-MM-DD)
        └── Hora inicial  → AHORA (HH:mm)
```
Ninguna alerta existente queda seleccionada.

### Caso B — seleccionar Alerta 1
```
Seleccionar alerta → Alerta 1 → activeKey = "alert-1" → valores persistidos → editar
```

### Caso C — crear nueva
```
Nueva alerta → (draft) → Guardar → saveCollection (pipeline existente) → configurada persistida
```

### Caso D — reabrir
```
Abrir editor → NO seleccionar la primera → Nueva alerta → HOY + AHORA
```

## 5. Acceptance Criteria (AC) — verificación

| AC | Criterio | Resultado |
|----|----------|-----------|
| AC-01 | `activeKey === null` al abrir | PASS |
| AC-02 | No aparece "Alerta 1" autoseleccionada | PASS |
| AC-03 | El formulario aparece en "Nueva alerta" | PASS |
| AC-04 | Alertas existentes colapsadas | PASS (state `expanded=true` por defecto) |
| AC-05 | Selección explícita → `activeKey = selectedKey` | PASS |
| AC-06 | Alerta existente conserva valores | PASS |
| AC-07 | Nueva alerta recibe `startDate` local + `startTime` local | PASS |
| AC-08 | Fecha `YYYY-MM-DD` interno | PASS |
| AC-09 | Hora `HH:mm` | PASS |
| AC-10 | Cálculo con reloj local, no UTC | PASS |
| AC-11 | Borrar fecha/hora deja ambos vacíos (default solo al iniciar) | PASS (default en `draft`, no se re-impone) |
| AC-12 | No se modifica config existente al abrir | PASS |
| AC-13 | No se modifica OccurrenceSchedule | PASS |
| AC-14 | No se modifica useAlertRuntime | PASS |
| AC-15 | Sprint 257-CERT vigente | PASS |

## 6. Regression y verificación

| Verificación | Resultado |
|--------------|-----------|
| `node sprint-259 suite` (`sprint-259-...mjs`) — 10 checks | **10/10 PASS** |
| Sprint 257 (`alert-occurrence-contract-sprint257.mjs`) | **15/15 PASS** |
| Sprint 257-HF1 (`-hf1.mjs`) | **20/20 PASS** |
| Sprint 236 | **14/14 PASS** |
| Sprint 237 | **17/17 PASS** |
| Sprint 239 | **18/18 PASS** |
| Sprint 240 | **16/16 PASS** |
| `npm run build` | **PASS** |
| `npx eslint <archivos modificados>` | **CLEAN (exit 0)** |
| Guardrail `src/core/capabilities/alert/occurrence/` | **interacto** (git) |

## 7. Guardrails cumplidos
❌ sin nuevo AlertRuntime/OccurrenceRuntime/Scheduler/Service/Store/Context/EventBus
❌ sin modificar OccurrenceSchedule/Projection/Ledger/Resolver
❌ sin `alerts[0]` automático
❌ sin UTC para "ahora local"
❌ sin scheduling lógica en UI
❌ sin autosave de defaults

## 8. Alcance futuro (NO en sprint)

búsqueda avanzada · centro global · notificaciones · escalamiento · persistencia histórica ·
recurrencia avanzada · timezone enterprise. **CERTIFIED / HOLD** → el producto avanza a
**Operational Stabilization → Module Migration → Real Records/Documents/Workflows → Real Needs**.

## 9. Commit propuesto (si la regresión queda limpia)

```
git add .
git commit -m "fix(alerts): initialize editor in new alert mode"
```

---
**Status:** Sprint 259 implementado — AC 1-15 PASS, regresión 236/237/239/240 + 257+HF1 PASS,
build OK, ESLint clean, dominio 257 intacto. Sin commit automático.