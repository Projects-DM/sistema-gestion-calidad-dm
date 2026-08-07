# Sprint 236 — Operational Time Projection Audit & Remaining Time Model Certification

> Nivel 5 · Auditoría del modelo temporal · Proyección operacional · Certificación de tiempo restante

## Tipo
Architecture Audit · Operational Read Model · Time Projection Validation

**Impacto:** **auditoría exclusiva** — no se modifica ningún archivo de implementación.
No modifica Alert Engine, Notification Engine, Runtime, Persistencia, Metadata,
`AlertConfiguration`, Resolver, Mapper, Providers ni Contracts. Estado esperado:
**TEMPORAL PROJECTION CERTIFIED** (flujo identificado; lista para Sprint 237).

---

## 1. Objetivo

Auditar cómo la experiencia operacional construye hoy la información temporal de cada alerta
y definir el modelo correcto (tiempo restante, próxima ejecución, vencimiento, frecuencia,
estado operacional) **sin introducir cálculos nuevos ni modificar motores**.

## 2. Principio arquitectónico

```
Metadata  →  Modelo temporal  →  Proyección operacional  →  Tarjeta
NUNCA:    Metadata → Motor paralelo → Evaluación → Tarjeta
```

## 3. Auditoría A1 — Fuente temporal

| Campo | Estado en el código (Sprint 235) |
|-------|----------------------------------|
| `startDate` / `startTime` | **NO presente** en la persistencia canónica ni en la proyección (el contrato de 9 campos no los incluye). La proyección NO los inventa. |
| `periodicity {amount,unit}` | SÍ se consume (`periodicity`, `amount`, `unit`). Fuente de la cadencia (`cadenceDays`). |
| `periodicity === 'once'` | Se consume (`cadence = 0`). |
| `expiration` | Se consume (`cfg.expiration`). |
| `enabled` | Se consume (`cfg.enabled`) → Activa/Deshabilitada. |
| `priority` / `notification.channel` | Se consumen (etiquetas/canal). |

Conclusión: la **única fuente temporal** es la **cadencia de `periodicity`**; **no existe un
punto de inicio absoluto** persistido.

## 4. Auditoría A2 — Próxima ejecución

- ¿Se calcula? → Sí, pero de forma **estática**: `cadenceDays(periodicity)` y luego
  `relativeLabel(days)`.
- ¿Está fija? **Sí** para un mismo `periodicity` (no cambia con el reloj).
- ¿Siempre devuelve "1 día"? **Sí** cuando `{ amount:1, unit:'days' }` → `relativeLabel(1)`
  = "En 1 día" (idéntico a `remainingTime`).
- ¿Existe fecha objetivo real? **No.** No se persiste `startDate`/`startTime`; no se calcula
  con `Date.now()`.

## 5. Auditoría A3 — Tiempo restante

```
Fecha objetivo → Ahora → Diferencia    (NO ocurre)
```
- `remainingTime = relativeLabel(days)` reutiliza la **misma cadencia estática** que
  `nextExecution` (líneas `157–158`). No hay `Date.now()` en ninguna parte de la proyección.
- No se calcula un contador real (días/horas/minutos) ni "venció hace X". El "tiempo" es la
  frecuencia, no una distancia al vencimiento.

## 6. Auditoría A4 — Estado operacional

- Se determina por **heurística estática** desde `enabled` + umbrales de `cadenceDays`
  (`operationalState`): `days<=1 → Hoy`, `days<=7 → Próxima`, resto → Activa, `enabled===false`
  → Deshabilitada, `cadence null` → Próxima.
- **NO** proviene del tiempo restante real ni de metadata de vencimiento con fecha; **no está
  fijo** (deriva de la cadencia), pero tampoco refleja el reloj.
- "Vencida" nunca se emite hoy (no hay fecha pasada).

## 7. Auditoría A5 — Ordenamiento

- Orden actual: `status.order` (Vencidas 0 → Hoy 1 → Próximas 2 → Activas 3 → Deshabilitadas 4)
  y dentro, por `days` estático.
- No hay **fecha de vencimiento real**, por lo que el orden por vencimiento exacto no es
  posible con la metadata persistida actual; solo con una `sortDate`/`target` real.

## 8. Responsabilidades UI vs Alert Engine (certificado)

- **UI:** proyección temporal/visual **provisional** (read-only); no evalúa, no persiste, no
  inventa motor. Hoy calcula un **heuristico estático** como sustituto temporal.
- **Alert Engine:** evalúa metadata persistida. NO se toca.
- La proyección debe evolucionar a un **ViewModel de solo lectura** (ver §9) o a los estados
  certificados del Engine, **sin** duplicar la evaluación.

## 9. Modelo temporal esperado (definido para Sprint 237)

```
AlertConfiguration
   ↓
Operational Projection  →  {
        remainingMilliseconds,
        remainingText,   // "Vence en 18 horas" · "Vence en 2 días" · "Vencida hace 3 horas"
        nextExecution,   // fecha objetivo real (start + cadencia)  →  requiere ancla persistida
        status,          // Activa/Próxima/Hoy/Vencida/Deshabilitada
        sortDate
   }
```
Exclusivamente **de lectura**, **nunca persistido**. Precisa un **ancla temporal real**
(persistible dentro de la infraestructura certificada) para un contador preciso.

## 10. Restricciones (auditoría)
No autorizado ahora ni en 237: `AlertSchedulerEngine`, `TimeEngine`, `Counter`, `AlertEvaluationV2`,
`RuntimeTimer`, providers/contratos/tablas/metadata nuevas. La auditoría solo documenta.

## 11. Definition of Done
✅ Flujo temporal auditado. • ✅ fuente de próxima ejecución (cadencia de periodicity) • ✅ fuente de
tiempo restante (mismo heurístico estático) • ✅ modelo de vencimiento documentado (sin ancla → no
se puede calcular vencimiento real) • ✅ ordenamiento auditado (heurístico estático) • ✅ responsabilidad
UI/Engine definida • ✅ Runtime/Persistencia/Metadata intactos • ✅ SSOT preservado.

## 12. Certificación TP1–TP14 → 14/14 (suite dedicada)
Fuente temporal; modelo de próxima ejecución; tiempo restante; estado; ordenamiento;
separación de responsabilidades; sin cambios funcionales; sin motores/estructuras nuevas;
Alert Engine, Runtime, Persistencia y Metadata preservados; **READY FOR IMPLEMENTATION (Sprint 237)**.

## 13. Resultado esperado y continuidad
Queda identificado **por qué las tarjetas muestran "1 día"** (cadencia estática reutilizada para
próxima ejecución y tiempo restante, sin ancla de fecha ni `Date.now()`). Sprint 237 implementará
un **modelo temporal preciso** a partir de un ancla persistente ofrecida por la infraestructura
certificada, expuesto como ViewModel de **solo lectura**, **sin motores paralelos** ni modificar
el Alert Engine, reutilizando la infraestructura existente.