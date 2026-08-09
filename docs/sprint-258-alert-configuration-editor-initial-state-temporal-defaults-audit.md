# Sprint 258 — Alert Configuration Editor Initial State & Temporal Defaults Audit

> **Workspace:** `docs/` | **Repo:** `release/stable-sprint79`
> **Type:** Audit / Diagnosis / Boundary Validation — **SIN CAMBIOS DE CÓDIGO**
> **Nivel:** 5 — Functional Architecture Audit

---

## 0. Resumen ejecutivo

La auditoría determinó con evidencia de fuente:

| Criterio | Resultado |
|---|---|
| Identificación del editor | **CERTIFIED** |
| Estado inicial seleccionado | **ROOT CAUSE** |
| Selección automática de Alerta 1 | **ROOT CAUSE** |
| Estado Nueva alerta | **ROOT CAUSE** |
| Fecha inicial | **ROOT CAUSE** |
| Hora inicial | **ROOT CAUSE** |
| Fuente de defaults | **IDENTIFICADA** |
| Impacto en Sprint 257 | **VALIDADO** |
| Riesgo de regresión | **EVALUADO** |
| Archivos candidatos | **IDENTIFICADOS** |
| Solución propuesta | **DEFINIDA** |
| Cambios de código | **NINGUNO** |

---

## 1. Turno / contexto de la línea

```
Configuration / Dynamic Forms / Document Repository
                    │
                    ▼
             Alert Editor
             ┌───────┴────────┐
             ▼                ▼
     Initial Selection    Temporal Defaults
             │                │
             ▼                ▼
       Nueva alerta       Ahora mismo
```

## Auditoría A — Selección inicial

### 1.1 Dónde monta el editor

El editor de alertas es **`AlertConfigurationPanel.jsx`** (`src/modules/experiences/`),
montado en dos puntos:

| Punto | Archivo:línea |
|-------|---------------|
| Formularios (modal) | `src/pages/Configuration.jsx:556-562` (`alertConfigTarget && <AlertConfigurationPanel …>`) |
| Repositorios (admin) | `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx:769` |

### 1.2 Estado que controla la alerta seleccionada

Controla **`activeKey`** (estado React):

```
AlertConfigurationPanel.jsx:100-102
  const [alerts, setAlerts]   = useState(initialRef.current.alerts);
  const [configs, setConfigs] = useState(initialRef.current.configs);
  const [activeKey, setActiveKey] = useState(initialRef.current.alerts[0]?.key || null);
```

- El **panel expandido** es un estado distinto: `const [expanded, setExpanded] = useState(false);` (línea 107) — independiente de la selección.
- El **modo nueva alerta** es otra operación: `addAlert()` (líneas 134-141) crea `makeAlert('Nueva alerta','')`, fija `setActiveKey(next.key)` y `setExpanded(false)`.

### 1.3 Valor inicial — por qué termina en Alerta 1

**ROOT CAUSE:** el `useState` inicializador lee `alerts[0]` — **siempre la primera entrada**:

```
buildInitial()  ← load.formStates (metadata persistida via AlertConfigurationApplicationService.loadCollection)
  alerts = fs.map((f,i) => ({ key: `alert-${i+1}`, name: f?.name || `Alerta ${i+1}` , ...}))
activeKey inicial = alerts[0].key   →  "alert-1" / "Alerta 1"
```

Cadena de causa, verificada en el Mapper:

```
loadCollection → resolveResourceAlertCollection  (AlertConfigurationResolver — SSOT)
  mapCollectionToFormStates → mapMetadataToFormState (AlertConfigurationMapper.js:55-102)
      alertConfiguration nunca configurada → source 'default' → mapMetadataToFormState(null)
        → 1 draft por defecto → buildInitial → alerts = [Alerta 1]
```

- **Origen:** lógica `useState(const constructor)` + índice `[0]` (NO `useEffect`, NO `map/index` anterior, NO lógica de acordeón, NO persistencia de estado anterior de sesión). La "selección" es el índice `alerts[0]`, no un valor deducido.
- Con `alertConfigurations[]` persistido, `alerts[0]` = "Alerta 1" **real** (la primera de la colección); con recurso nunca configurado, la auto-selecciona igualmente (draft default vacío) → coincide con el modo "Alerta 1 - borrador".

**Diferenciación formal:**

| Concepto | Estado | Valor inicial |
|----------|--------|---------------|
| Alerta seleccionada | `activeKey` | `alerts[0]?.key` |
| Panel expandido | `expanded` | `false` |
| Modo nueva alerta | crea `key` nuevo vía `add()` | no existe en el arranque |

---

## Auditoría B — Fecha y hora inicial

### 2.1 Dónde se construyen `startDate` / `startTime`

`startDate`/`startTime` se construyen en **dos** puntos (ninguno con `new Date()`, sin `useEffect`/`useMemo`):

1. **Mapper** (`AlertConfigurationMapper.js:78-79`) — la única fuente de forma segura para edición:

```
mapMetadataToFormState:  startDate: source.startDate ?? ''   // línea 78
                         startTime: source.startTime ?? ''   // línea 79
```

2. **Form Reactivo** (`AlertConfigurationForm.jsx:253-258`) — render del control:

```
<input type="date" value={formState?.startDate ?? ''}  onChange={set('startDate')}   />
<input type="time" value={formState?.startTime ?? ''}  onChange={set('startTime')}   />
```

### 2.2 De dónde proceden los valores

**Cadena completa (Ninguna aporta fecha local):**

```
formState  (configs[activeKey])
   └── prop formState  (panel: base de `configs[activeKey] || {}`)
         └── inicial: mapCollectionToFormStates(resolution.collection)
               └── resolution.collection = AlertConfiguration (9 campos, no trae startDate)
                     └── metadata persistida (alert_configuration / alert_config)
```

- **AlertConfiguration (VO canónico) NO incluye `startDate`/`startTime`** (9 campos certificados: enabled, periodicity, expiration, risk, priority, notification, gracePeriod, automaticClose, repeatPolicy — ver `AlertConfiguration.js`, `CONFIGURATION_KEYS`).
- El **MetadataNormalizer** no los normaliza (no existen en el esquema canónico → se conservan solo como pasantes no canónicos).
- El **Resolver** no los lee; son datos "passthrough" del mapper hacia metadata.

**Por lo tanto:** una nueva alerta **SIEMPRE** nace con:

```
startDate = ""    (fecha inicial: __/__/____)
startTime = ""    (hora inicial: --:--)
```

y **NO** "08/08/2026 · 17:42" como el objetivo funcional.

### 2.3 Impacto en el dominio (Sprint 257)

La mejora propuesta (defaults de ahora local) **NO toca el dominio certificado**:

| Fuente | Archivo | Toque esperado |
|--------|---------|----------------|
| `OccurrenceSchedule` | `alert/occurrence/OccurrenceSchedule.js` | **NINGUNO** |
| `OccurrenceProjection` | `alert/occurrence/OccurrenceProjection.js` | **NINGUNO** |
| `OccurrenceLifecycle` | `alert/occurrence/OccurrenceLifecycle.js` | **NINGUNO** |
| `OccurrenceLedger` | `alert/occurrence/OccurrenceLedger.js` | **NINGUNO** |
| `CompletionBridge` | `alert/occurrence/CompletionBridge.js` | **NINGUNO** |

Principio preservado: **Presentation defaults ≠ Domain scheduling.** La fecha/hora son
presentación passthrough; el scheduling los interpreta solo en la capa del dominio cuando
`parseAnchor` los lee como entrada del candidate (HF1 ya endurece la frontera de candidatos
con ancla nula — sin código nuevo, sin regresión).

---

## 3. Evidencia contratadora
- `git status` (working tree): **solo el documento SPRINT 257-CERT** → Sprint 258 no modifica código (SIN CAMBIOS DE CÓDIGO, comprobado).
- Barridos: los únicos `startDate/startTime` del editor son Mapper+Form (evidencia 2.1).
- `mapFormStateToMetadata` (Mapper:115-172) devuelve `startDate/startTime` **tal cual** (sin defaults), de vuelta al collector → se conserva la compatibilidad (extras ignorados por VO canónico).

---

## 3. Solución propuesta (aplicable en un futuro sprint, NO aplicado aquí)

### Arquitectura de la solución

1. **Selección inicial** — inicializar `activeKey` a `null` (Estado Nueva alerta):
   - Cambiar `useState(initialRef.current.alerts[0]?.key || null)` → **`useState(null)`** en `AlertConfigurationPanel.jsx:102`.
   - En el render, si `activeKey === null` mostrar el formulario limpio (`Nueva alerta`), con las alertas existentes **colapsadas** (state `expanded`).
   - `addAlert` ya funciona para entrar en modo nueva de forma explícita (borrador `makeAlert`).
   - Click "Alerta 1" → `selectAlert('alert-1')` → `setActiveKey('alert-1')` → editar `ALERT-001`.

2. **Default temporales (Fecha/Hora)** — al crear nueva alerta (y al estado "Nueva alerta"):
   - En `addAlert` (panel) o en el `createEmptyFormState` construir `{ startDate: hoyLocal, startTime: nowLocal }` únicamente como **default de exposición** (pantalla), **NO** como valor de VO canónico persistido.
   - Guardar siempre lo que el usuario ve (no forzar una fecha default en persistencia si el usuario la borra).
   - Mover el cálculo a un **helper `todayLocalISO()`** (pad local, formato `YYYY-MM-DD` / `HH:mm`) dentro de `src/modules/experiences/` (capa de presentación), **no** en dominio.

**Dónde vive**: `AlertConfigurationPanel.jsx` (estado + default de nueva), `AlertConfigurationForm.jsx` (solo renderizado si `formState.startDate==='' && new`), helper presentacional. **Fuera de alcance:** OccurrenceSchedule exceptuado. Ninguno de los archivos del dominio se tocará.

### 3.1 Riesgo de la regresión
- **Alta** si se elimina la auto-selección `alerts[0]` sin tocar los tests que asumieron "editor siempre sobre Alerta 1"; mitigación: los suites 236-240 / proyecto 257 no observan `activeKey` (presentación pura).
- **Media** por el cambio de "primera selección" → comportamientos visuales previos (historial 243/247/248 collapsed threads) — protección con snapshots presentacionales.
- **Baja** para el dominio: los defaults no cruzan ninguna frontera del dominio 257 (validado en 2.3).

---

## 4. Estado de la auditoría

Sprint 258 AUDIT — completado. Documento de auditoría entregado; **ningún cambio de código aplicado** (working tree limpio salvo este documento y sprint perfiles). Sin commit automático; si finalmente se pide la implementación será un sprint 259 UI-editor.

**Cambios de código: NINGUNO** ✅