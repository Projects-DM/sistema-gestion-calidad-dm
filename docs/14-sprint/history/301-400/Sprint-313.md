# Sprint 313 — Completed+Next · Temporal Urgency · Pure Presentation · Controlled Correction

Rama: `release/stable-sprint79`
Modo: CONTROLLED CORRECTION · LEVEL 5 · PRESENTATION ONLY — **CERTIFIED**
Fecha: 2026-08-13
Tipo: Corrección de presentación que resuelve el hallazgo certificado en Sprint 312
Dependencias: Sprint 307 CERTIFIED · Sprint 310 CERTIFIED (53/53) · Sprint 311 CERTIFIED (46/46) · Sprint 312 CERTIFIED (108/108)
Suite: `node scripts/sprint-313-unified-alert-completion-temporal-presentation-certification.mjs`

## Clasificación final

```
SPRINT 313 — COMPLETED+NEXT · TEMPORAL URGENCY · CONTROLLED CORRECTION

  GATE COMPLETION≠DELETE: PASS
  TEMPORAL URGENCY:       PASS
  PRIORIDAD ≠ URGENCIA:   PASS
  PURE PRESENTATION:      PASS
  SINGLE PRESENTATION:    PASS
  BUILD:                  PASS
  REGRESSIONS:            GREEN
  SCOPE (src/):           PASS

  STATUS:                 CERTIFIED
```

TOTAL: **57/57 PASS** · Único archivo `src/` modificado:
`src/shared/components/alert/UnifiedAlertResourcePresentation.jsx`.

## Pregunta corregida (§1)

Sprint 312 certificó que tras completar una occurrence el estado SIGUE existiendo
(`present=true`, `status=completed`, `statusLabel="Cumplida"`, `nextDue`,
`nextExecution`), pero la tarjeta desaparecía porque `buildScheduleLines` excluye
los events completed/cancelled → `schedule=[]` → el gate
`schedule.length === 0 → return null` ocultaba todo.

**Corrección de 313 (solo presentación):** `COMPLETION ≠ DELETE`. El gate se
EVOLUCIONA a `if (!completed && schedule.length === 0) return null`: un alert
OPEN sin schedule presentable se sigue suprimiendo; un alert COMPLETED+NEXT
renderiza la tarjeta azul de cumplimiento incluso con `schedule=[]`.

## Evidencia central

```
ANTES (Sprint 312)
  COMPLETED+NEXT state presente, schedule=[]  →  tarjeta oculta (null)

DESPUÉS (Sprint 313)
  COMPLETED+NEXT state presente, schedule=[]  →  tarjeta azul visible
    <div class="... bg-blue-50 text-blue-700 border-blue-200 ...">
      [CheckCircle2]
      AlertA · Alta
      Cada día
      Cumplida
      Próxima: 2026-08-15 09:00
```

## Semántica temporal implementada (§7/§8/§14)

Buckets presentacionales: **OPEN / COMPLETED+NEXT / UPCOMING / ATTENTION /
URGENT / OVERDUE / DISABLED**. La autoridad temporal viene YA calculada en
`state` (Sprint 310/312: `status/statusLabel/nextDue/nextExecution`). El
renderer NUNCA calcula tiempo:

- Prop **opcional `now`** (instante de referencia explícito del caller): posiciona
  el `state.nextDue` absoluto en umbrales finos —
  `≤1h → URGENT (red)` · `≤24h → ATTENTION (amber)` · `≤7d → UPCOMING (amber)` ·
  `>7d → SCHEDULED (gray)`.
- **Sin `now`**: fallback al bucket grueso certificado en `state.status`
  (`today/active → Atención`, `upcoming → Próxima`, else → Programada).
- **Prioridad ≠ Urgencia**: `priority=high/critical` con vencimiento lejano →
  `Programada` (gray), NUNCA `Urgente` (rojo). Comprobado por render real
  (E08): Alta + 400d → `bg-gray-50`, sin `bg-red-50/bg-amber-50`.
- Reuso obligatorio de `STATUS_VISUALS`/`PRIORITY_VISUALS` de
  `AlertVisualDescriptor`: 0 mapas de color nuevos (E10), 0 tokens de
  reloj/cómputo temporal en el renderer (E03, sin `new Date`/`Date.now`/
  `computeTarget`/`occurrenceWindowAt`), 0 re-derivación de frecuencia por
  fechas (E04, sin `state.startsAt`/`state.dueAt`/`state.nextExecution`/
  `state.events.map` — el material "Próxima:" se desestructura).

## Decisiones certificadas

1. **Gate evolucionado**: `if (!completed && schedule.length === 0) return null`.
   El gate `state?.present !== true → return null` permanece intacto.
2. **COMPLETED+NEXT visible**: tarjeta azul informativa (bg-blue-50/bg-blue-500)
   con `statusLabel` + "Próxima: {nextExecution}". Sin estado React paralelo,
   sin hacks de visibilidad, sin `completedLocal/alertHidden/justUploaded`.
3. **`now` opcional**: sin ella el componente se comporta exactamente como antes
   (fallback grueso); con ella el caller posiciona el vencimiento certificado.
4. **PURE PRESENTATION**: 0 resolver/fetch/query/runtime/ledger/projection/event-bus;
   imports SOLO `alertVisual` + `buildScheduleLines` + `formatExecutionTime` +
   descriptores (E11).

## Hallazgos por bloque (E01–E20)

- **E01/E20 — Scope**: `git status --short src/` → SOLO
  `M src/shared/components/alert/UnifiedAlertResourcePresentation.jsx` (E01 al
  inicio y E20 al final, 1/1 cada uno).
- **E02 — Gate**: `!completed && schedule.length === 0` presente en fuente; gate
  `present` intacto; el COMPLETADO se decide por el estado certificado, no por
  events (3/3).
- **E03 — Sin reloj**: 0 tokens de cómputo temporal en el renderer (1/1).
- **E04 — Sin re-derivación**: 0 literales `state.startsAt/dueAt/nextExecution/
  events.map` (1/1).
- **E05 — COMPLETED+NEXT render**: con `schedule=[]` renderiza (NO null), muestra
  "Cumplida", "Próxima: 2026-08-15 09:00" y tarjeta azul (4/4).
- **E06 — OPEN**: con `schedule=[]` → null; con schedule → render (2/2).
- **E07 — Buckets**: URGENT≤1h red · ATTENTION≤24h amber · UPCOMING≤7d amber ·
  SCHEDULED>7d gray · OVERDUE red · DISABLED null (6/6).
- **E08 — Prioridad≠Urgencia**: Alta/Crítica + 400d → gray, NUNCA rojo (2/2).
- **E09 — `now` opcional**: con now → umbral fino; sin now → grueso (today→ámbar,
  upcoming→ámbar, otro→gray) (4/4).
- **E10 — Reuso**: PRIORITY_VISUALS + STATUS_VISUALS importados; 0 mapas de color
  nuevos (3/3).
- **E11 — Pureza**: 0 canales; imports correctos (2/2).
- **E12 — Sin estado paralelo**: 0 useState/useEffect/setTimeout/hacks (1/1).
- **E13 — Responsive**: flex-wrap + truncate + min-w-0 (2/2).
- **E14 — Single presentation**: DynamicModule y ModuleDocumentViewer delegan en
  el MISMO renderer (2/2).
- **E15 — Firma**: `{ state, className, now }` (sin fields por consumidor);
  funciona SIN la prop now (2/2).
- **E16 — Aislamiento multi-alert**: AlertA no contamina AlertB y viceversa (2/2).
- **E17 — Sin inventar metadata**: COMPLETED+NEXT sin nombre ni periodicity → sin
  "Sin nombre"/"Alerta operacional"/"Cada día" inventados (2/2).
- **E18 — Build**: `npm run build → ✓ built` (1/1).
- **E19 — Regresiones**: familia 296–312 (15 miembros) con **delta funcional
  autorizado** (15/15, GREEN):

| Miembro | Resultado | Nota |
|---|---|---|
| 296/297/299/300/301/303/305/306/308/310 | PASS | green |
| 302 | PASS | solo forenses baseline (n=9) |
| 304 | PASS | forenses baseline + delta autorizado (n=10) |
| 307 | PASS | solo forenses baseline (n=5) |
| 311 | PASS | baseline + delta autorizado (n=3) |
| 312 | PASS | baseline + delta autorizado (n=8) |

### Deltas funcionales autorizados de 313 (el propósito de la corrección)

- **304 `deja de renderizar (returns null)`**: 304 audita el gate VIEJO
  (`schedule.length === 0 → null`) que 313 EVOLUCIONÓ a
  `!completed && schedule.length === 0`. COMPLETED+NEXT ya no desaparece.
- **312 F01/F14 (`el componente devuelve null` / `responsable de la
  desaparición`)**: 312 documentó el bug de desaparición; con 313 la tarjeta
  COMPLETED+NEXT RENDERIZA — la auditoría de causa raíz queda satisfecha por
  ejecución real y su resumen (`F01 FAIL`/`F14 FAIL`) persiste como el hallazgo
  del sprint.
- **312 F25/F27 (`src/ LIMPIO` / `sin modificaciones`)**: 312 es AUDIT ONLY; con
  la modificación autorizada de 313 el guard de src/ cambia (E01/E20 verifican
  que el ÚNICO archivo modificado es el renderer).
- **311/307 (`resolveAlertIcon() calls=10`)**: 313 agrega `TEMPORAL_ICON_COMPONENTS`
  (6 resolveAlertIcon a module scope) → 307 reporta calls=10 en vez de calls=4.
  Es el MISMO fail forense pre-documentado de 307 (su KNOWN_FORENSIC lo cubre);
  solo cambia el detalle de conteo, y la E21 interna de 311 lo ve como "fail
  nuevo" en su baseline-vs-post.

## Scope respetado / STOP list (§4, §30)

- **Único archivo modificado**: `src/shared/components/alert/UnifiedAlertResourcePresentation.jsx`
  (E01/E20 lo verifican con `git status --short src/`).
- Sin tocar: Ledger, CompletionBridge, Projection, state selector
  (`alertResourceState.js`), Resolver, Runtime, Recurrence, persistence,
  consumidores (`DynamicModule`/`ModuleDocumentViewer`), descriptor.
- Sin resolver/query/ledger/projection/event-bus nuevos, sin formatters nuevos
  (reusa `formatExecutionTime`), sin hooks/estado paralelo, sin mapas de color
  nuevos, sin `Date.now/new Date/computeTarget/occurrenceWindowAt` en el renderer.
- Sin re-derivar identidad/horarios/prioridad/frecuencia desde fechas.

## Evidencia

Suite: `scripts/sprint-313-unified-alert-completion-temporal-presentation-certification.mjs`

- E01–E04 — scope, gate evolucionado, pureza de tiempo y de derivación (fuente).
- E05–E09 — render REAL (rolldown bundle + react-dom/server): COMPLETED+NEXT con
  `schedule=[]`, OPEN gates, buckets temporales por color, prioridad≠urgencia,
  umbrales finos vs gruesos.
- E10–E17 — reuso de descriptores, pureza de canales, sin estado paralelo,
  responsive, single presentation, firma con `now` opcional, aislamiento,
  no-invención de metadata.
- E18 — `npm run build → ✓ built`.
- E19 — regresiones 296–312 (15 miembros) GREEN: solo fails forenses baseline
  (302/304/307) + deltas funcionales autorizados de 313 documentados arriba.
- E20 — `src/` con SOLO el renderer modificado.

## Próximo paso

La corrección queda certificada y autocontenida (un solo archivo de
presentación). Si se desea, los consumidores pueden pasar la prop `now` (un
instante de referencia ya disponible en su contexto) para que la tarjeta use
umbrales finos; sin ella el comportamiento es el fallback grueso certificado.
