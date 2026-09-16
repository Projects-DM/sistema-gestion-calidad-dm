# Sprint 237 — Operational Temporal Projections (read-only ViewModel)

> Nivel 5 · Proyección temporal operacional · Implementación del modelo definido/auditado en Sprint 236

## Tipo
Operational Read Model · Presentation-only · Time Projection Implementation

**Impacto:** **presentación exclusiva**. Implementa el modelo temporal definido por la
auditoría del Sprint 236 reutilizando **metadata ya persistida** (áncora `startDate`+`startTime`),
sin modificar Alert Engine, Notification Engine, Runtime, Persistencia, Metadata,
`AlertConfiguration` (contrato intacto), Resolver, Mapper, Providers ni Contracts.
Estado: **OPERATIONAL TEMPORAL PROJECTION CERTIFIED**.

---

## 1. Objetivo

Reemplazar la proyección temporal **estática** (que mostraba "En 1 día" por cadencia, sin ancla de
fecha ni `Date.now()`) por un **ViewModel de solo lectura** que calcula el **tiempo restante real**
de cada alerta, su siguiente vencimiento, texto relativo ("Vence en …" / "Venció hace …"),
la próxima ejecución formateada y un **orden cronológico** (más urgente primero) — todo
consumido por la UI desde metadata persistida, sin motores ni evaluación.

## 2. Principio (resuelve la auditoría A3/A4/A5 del Sprint 236)

```
Metadata persistida (áncla startDate+startTime + periodicity + enabled)
   ↓ parseAnchor → cadenceMs → computeTarget → remainingMs
   ↓ Projection (read-only)  →  { targetDate, remainingMilliseconds, remainingText,
                                 nextExecution, operationalState, sortDate }
   ↓
Tarjeta única cronológica
```

## 3. Algoritmo temporal

| Paso | Derivación |
|------|-----------|
| **Áncora** `parseAnchor(item)` | `new Date(startDate/start_time)` + hh:mm de `startTime/start_time`. La metadata cruda persistida conserva `startDate/startTime` (envelope/campo crudo), aunque el contrato canónico de 9 campos no los exponga como clave. |
| **Cadencia** `cadenceMs(periodicity)` | `amount * UNIT_MS[unit]` (horas/días/semanas/meses/años); `'once'` → 0 (fija). |
| **Target** `computeTarget(anchor, cadence, now)` | Si cadencia 0 → el áncora; si `now ≤ anchor` → `anchor`; si no → `anchor + ceil((now-anchor)/cadence) * cadence` (próximo múltiplo ≥ now). |
| **Remaining** | `targetMs - now`. |
| **Estado** `derivedState(enabled, remaining)` | `enabled===false → Deshabilitada`; `remaining<0 → Vencida`; `≤24h(8.64e7) → Hoy`; `≤72h(2.592e8) → Próxima`; resto → Activa. |
| **`humanDuration(ms)`** | minuto / hora / día / mes / año legible. |
| **`formattedExecution(targetMs)`** | `Hoy HH:MM` · `Mañana HH:MM` · `d mmm aaaa HH:MM`. |
| **`sortDate`** | `remainingMs` (o `Number.MAX_SAFE_INTEGER` si null) → `out.sort` ascendente (más cercano al vencimiento arriba). |

## 4. Enriquecimiento de la tarjeta (consumido por la UI)

- `status`/`statusLabel`/`color`, `frequency`, `nextExecution`, `remainingText`/`remainingMs`,
  `channel`, `priorityLabel`, `tipo` (Formulario/Repositorio), `origen`, `sortDate`.
- Navegación certificada preservada: `open-form` (payload `resource?.slug ?? resource?.formSlug ??
  resource?.identifier ?? resource?.id`) y `go-to-document` (`documentId`).

## 5. Restricciones (certificadas)

- **Solo lectura**: la proyección nunca evalúa (`evaluateAlert` ausente) y nunca persiste
  (`saveConfiguration`/`saveCollection` ausentes); el áncla temporal solo se **lee** de metadata.
- **Sin motores**: `AlertPriorityEngine`, `AlertSchedulerEngine`, `TimeEngine`, `Countdown`,
  `RuntimeTimer` están prohibidos y no se crean.
- **Capas congeladas intactas**: ningún cambio en Alert Engine, Runtime, Resolver/Mapper,
  Persistencia, Metadata, Providers ni Contracts. El contrato canónico sigue **sin** clave
  `startDate'`.
- **Presentación única**: grilla única cronológica; se retira la agrupación por estatus
  (los colores/estados se mantienen como badge en la tarjeta).

## 6. Definition of Done

✅ ViewModel temporal read-only (áncora+target+remaining+text+nextExecution+state+sortDate) •
✅ `Vence en`/`Venció hace` reales + `humanDuration` • ✅ próxima ejecución formateada (Hoy/Mañana) •
✅ estados Por ventanas de remaining (Vencida/Hoy/Próxima/Activa/Deshabilitada) • ✅ orden cronológico
por `sortDate` • ✅ reutiliza metadata persistida (áncora del envelope crudo) • ✅ nunca evalúa/persiste •
✅ sin motores nuevos • ✅ capas congeladas intactas • ✅ build de producción OK.

## 7. Certificación → 17/17 (suite dedicada)

OT-1..OT-17 (suite `sprint-237-operational-temporal-projections-certification.mjs`): ViewModel read-only
con reloj inyectable; áncora persistida; target por acorde a la cadencia; remaining real; texto
relativo + duración; next execution formateado; estados por ventana; orden cronológico; enriquecimiento;
ancaje posicional; navegación; nunca evalúa/persiste; sin motores; contrato intacto; grilla única.

## 8. Continuidad

El ViewModel queda como única fuente de lectura temporal para la experiencia. Sigue validado por las
suites 235/236 (actualizadas para reflejar el orden cronológico y el cambio de campo
`remainingTime`/`relativeLabel` → `remainingText`/`humanDuration`). No se persiste tiempo derivado ni se
sincroniza el reloj con el Engine: el Engine solo evalúa metadata persistida.