# Sprint 262 — Auditoría de Identidad y Proyección: Runtime → Monitoreo (Multi-Config)

> Nivel 5 · Audit · Diagnóstico · Runtime Trace · Sin cambios en `src/`

## Tipo
AUDIT ONLY — sin modificaciones de código. Seguimiento a Sprint 261 (implementación runtime multi-config) y Sprint 260 (audit de la frontera de identidad).

## 1. Objetivo

Determinar con evidencia exacta en qué frontera se degrada una **segunda alerta** sobre el
mismo recurso antes de llegar a la UI de Monitoreo (`AlertMonitoringExperience` → Card A /
Card B), cuando la alerta se trae desde la **Resolución** (Config), no desde el feed/registro
de ocurrencias.

Cadena verificada:
`alertConfigurations[]` → Resolver (`resolveResourceAlertConfigurations`) →
`evaluateAlertEnrollments` (Sprint 261) → `useAlertRuntime` (`deriveRulesFromBinding`) →
Runtime Rules → `projectConfigCards` → Card A / Card B.

Campos de identidad/presentación verificados en cada frontera:
`name`, `description`, `priority`, `periodicity`, `startDate`, `startTime`, `timezone`,
`alertId`, `occurrenceId`, `anchor`, `target`.

## 2. Caso de prueba

- Recurso: `TEST-RESOURCE-001`, módulo `TEST-MODULE`, tipo `forms`.
- Alerta A — `name: "Alerta A"`, `description: "Primera alerta"`, `enabled: true`,
  `priority: alta`, `periodicity: 1 day`, `startDate`/`startTime` controlados.
- Alerta B — `name: "Alerta B"`, `description: "Segunda alerta"`, `enabled: true`,
  `priority: media`, `periodicity: 1 day`, `startDate`/`startTime` controlados.

## 3. Hallazgo principal

La evidencia converge en el panel del editor de alertas (Alert Configuration Panel):
recibe la colección vía **Resolver → `mapCollectionToFormStates`**, que trabaja sobre un
**Value Object normalizado** en el cual **`name` / `description` / `startDate` / `startTime` /
`timezone` NO SOBREVIVEN**.

`CONFIGURATION_KEYS` (Value Object del dominio) solo transporta las llaves de
**configuración operativa** (9): `enabled, periodicity, expiration, risk, priority,
notification, gracePeriod, automaticClose, repeatPolicy`. Los campos de **presentación**
(`name`, `description`) y de **temporalidad** (`startDate`, `startTime`, `timezone`) **no
forman parte del contrato serializable del VO**.

Flujo que rompe (round-trip del editor):

1. El Panel persiste el metadata preservado (`raw item` intacto: `name: "Alerta B"`, etc.).
2. Al reabrir, `resolveResourceAlertCollection` devuelve **Value Objects** con SOLO las 9 llaves
   (sin `name`, sin `description`, sin `startDate`, sin `startTime`).
3. `mapCollectionToFormStates(VO[0..1])` produce campos de formulación **vacíos** (`''`).
4. Al guardar de nuevo, `mapFormStateToMetadata` persiste esos **vacíos** → el `raw` pierde
   definitivamente `name`, `description`, `startDate` y `startTime`.

Es la frontera **Resolver → Panel (Config Pipeline)**, no el runtime ni la proyección. Coincide
con el criterio Sprint 260: «si B ya llega incompleta desde persistencia → ROOT CAUSE =
Configuration / Metadata Pipeline».

## 4. Auditorías (A–K)

| # | Frontera auditada | Resultado |
|---|-------------------|-----------|
| A | **Persistencia / Config** | La tupla guardada es A≠B completa en `alertConfigurations[]`. Riesgo: un re-save del Panel piso tea los campos vacíos (fixture B). |
| B | **Resolver** | `projectConfigCards` usa `resolution.collection[idx]`; el API single `resolveResourceAlertConfiguration` queda solo como contrato legacy. |
| C | **Enrollment** | ✅ (Sprint 261) `evaluateAlertEnrollments` → 1 item por configuración enrolled; `enrolled=true`, `alertId` = `<resourceId>:alert:<index>`. |
| D | **Runtime rules** | ✅ 1 regla por configuración enrolled en `deriveRulesFromBinding`; sin `Map` por `resourceId` que colapse A/B (keys distinct). |
| E | **`useAlertRuntime`** | ✅ devuelve `existing` (snapshot de recurso) + rules por `alertId`; la card consume `existing`. |
| F | **Proyección (`projectConfigCards`)** | ✅ input 2 → output 2 count, `id` distinct, React keys únicos. Al leer desde un `raw` íntegro las tarjetas muestran `name` correctos y fecha (PASS 33/33). |
| G | **Identidad matrix** | ✅ `alertId` / `occurrenceId` son únicos por configuración en todas las capas; ningún punto usa `resourceId` solo como clave de alerta. |
| H | **Temporalidad** | ✅ con `raw` completo en el path persistente; el path de loader/editor pierde `startDate/startTime` (ver §3). |
| I | **Name** | ✅ `title: cfg?.description || rawItem?.name || 'Alerta'` — el fallback `'Alerta'` se activa cuando el **`raw.name`** quedó vacío por el round-trip del panel. |
| K | **React keys / detection-0** | ✅ **NO** hay patrón `[0]` en el UI de monitoreo; los card keys son únicos (`forms:TEST-RESOURCE-001:0` / `:1`). |

## 5. Evidencia (fixtures locales, fuera del repo)

`C:\Users\USUARIO\AppData\Local\Temp\opencode\`:

- **`audit-262-a.mjs`** — save → reload → proyección directa sobre `raw` íntegro.
  Resultado: **2 tarjetas correctas** (título "Alerta A"/"Alerta B", anchor presente,
  nextExecution calculado), keys `forms:TEST-RESOURCE-001:0` / `:1`, 33/33 PASS.

- **`audit-262-b.mjs`** — **ROUND-TRIP del Panel (Config)**:
  `saveCollection` → `reload` → `mapCollectionToFormStates` → `re-save`.
  **Resultado: 2 PASS / 16 FAIL** — `name`, `description`, `startDate`, `startTime` de
  **ambas** alertas llegan `''` al re-save (el VO no los repone). Defecto que **degrada
  `B` a «Alerta», sin fecha, sin próxima ejecución** en la UI de monitoreo.

- **`audit-262-c.mjs`** — evidencia paso a paso:
  - STEP 1 (raw persistido): item B completo (`name: "Alerta B"`, `startDate`, `startTime`).
  - STEP 2 (VO de la resolución): **solo las 9 llaves**; sin `name`, `description`, `startDate`, `startTime`.
  - STEP 3 (formState del Panel): `name: ""`, `description: ""`, `startDate: ""`, `startTime: ""`.

## 6. Gate de regresión (build + lint)

- `npm run build` → **OK** (2.926 módulos; dist escrito normalmente).
- `npm run lint` (archivos del área): warnings pre-existentes
  - `useAlertRuntime.js` — `react-hooks/exhaustive-deps` (pre-existente).
  - `AlertMonitoringExperience.jsx` — `Cannot create components during render` (pre-existente,
    correct layout of the code).

Ninguno fue introducido por este Sprint (modo AUDIT, sin cambios).

## 7. Veredicto por capa

- **Runtime / Enrollment (D, E, C)** — ✅ Correcto desde Sprint 261: una regla y un
  enroll item por configuración, `alertId` por config.
- **Proyección UI (F, K)** — ✅ Correcto: lee el `raw` completo; sin `[0]`; keys únicos.
- **Configuración / Resolver → Panel (A, B, H, I)** — ❌ **ROOT CAUSE bloqueante**:
  el **VO normalizado no transporta** `name/description/startDate/startTime`, y
  `mapCollectionToFormStates` + re-save **pisotean** los valores persistidos (fixture B,
  16 FAIL).

## 8. Veredicto global

**D — Configuración / Pipeline de metadatos.** El colapso de la segunda alerta (vista como
«Alerta» genérica, frecuencia sí visible, sin próxima ejecución) no está en el runtime:
está en que la **capa `Resolver → VO → Panel` sólo emite/aplica las 9 llaves canónicas**, y
un re-save del editor rompe la tupla persistida.

Esto alinea con el veredicto de Sprint 261 (Runtime OK) y de Sprint 260 (identidad se mantiene
en dominio; el problema está en config/presentación round-trip).

## 9. Bloqueadores confirmados

1. **VO configuración sin campos de presentación/temporalidad**: `createAlertConfiguration`
   filtra a la 9 llaves canónicas (`CONFIGURATION_KEYS`).
2. **Round-trip del Panel**: `loadCollection → mapCollectionToFormStates` rellena `''`,
   y el re-save persiste los vacíos sobre el `raw` (pérdida irreversible).
3. **La UI** solo muestra lo que `raw` ofrece: si el panel toca antes, la card cae al
   fallback `'Alerta'` y sin anchor → `Próxima ejecución: —`.

Este Sprint NO aplica cambios de código (modo AUDIT).

## 9. Veredicto final y próximos

- Veredicto de capa: **Configuración / Metadata Pipeline (VO 9-keys)**.
- Próximo Sprint (sugerido, NO ejecutado aquí): ampliar el contrato del resolver/VO para
  **transportar `name`, `description`, `startDate`, `startTime`** (o atar el shell del Panel
  a los campos `raw` originales) y hacer que el re-save **preserve** las llaves no canónicas.

## 10. Archivos revisados

- `src/modules/experiences/AlertMonitoringExperience.jsx` — `projectConfigCards` es la única
  fuente de las tarjetas (no existe `projectConfigurations` con ese nombre).
- `src/core/capabilities/alert/operational-configuration/AlertConfiguration.js` —
  `CONFIGURATION_KEYS` (9 llaves) y `createAlertConfiguration`.
- `src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js` —
  `resolveResourceAlertConfigurations` / `alertConfigIdOf` / `resolveResourceAlertCollection`.
- `src/core/capabilities/alert/operational-configuration/ExplicitEnrollmentValidator.js` —
  `evaluateAlertEnrollments`.
- `src/hooks/useAlertRuntime.js` — `deriveRulesFromBinding`.
- `src/core/capabilities/alert/occurrence/OccurrenceSchedule.js` — `parseAnchor` / `computeTarget`.
- Fixtures: `C:\Users\USUARIO\AppData\Local\Temp\opencode\audit-262-a.mjs`,
  `audit-262-b.mjs`, `audit-262-c.mjs`.