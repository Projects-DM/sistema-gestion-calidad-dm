# Sprint 240 — Operational Status Classification & Visual Severity Model

> Nivel 5 · Clasificación operacional · Estados visuales · Certificación del modelo de severidad

## Tipo
Presentation Read Model · Operational Status Consolidation

**Impacto:** exclusivamente **Presentation Layer** (`AlertMonitoringExperience.jsx`). No modifica
Alert Engine, Notification Engine, Runtime, Persistencia, Metadata, Resolver, Mapper, Providers
ni Contracts. Estado: **SINGLE OPERATIONAL STATUS MODEL CERTIFIED**.

---

## 1. Objetivo

Consolidar definitivamente la representación visual de las alertas con **un único modelo de estados
operacionales** derivado exclusivamente del ViewModel temporal (Sprints 237–239). La UI encuentra,
para cada tarjeta: `remainingMilliseconds` y `enabled`, y con ellos un estado, color, iconografía,
prioridad visual y texto. No se introducen cálculos ni motores: la UI **consume**, nunca calcula.

## 2. Principio arquitectónico

```
Metadata → Operational Temporal ViewModel → remainingMilliseconds → Operational Status → Tarjeta
```

## 3. Problema corregido / prevenido

Antes era posible una inconsistencia estructural (p. ej. `remaining < 0` mostrándose como
"Hoy"). Con Sprint 240 el estado **siempre** se deriva determinísticamente de `remaining` + `enabled`,
y las ramas son mutuamente excluyentes: si `remaining < 0` → **Vencida**, nunca "Hoy".

## 4. Modelo de estados certificado (derivación exclusiva)

| Estado | Condición | Color | Icono Lucide |
|--------|-----------|-------|--------------|
| 🔴 Vencida | `remaining < 0` | rojo | `AlertTriangle` |
| 🟠 Hoy | `0 ≤ remaining ≤ 24h` | naranja | `Clock` |
| 🟡 Próxima | `24h < remaining ≤ 72h` | amarillo | `Calendar` |
| 🟢 Activa | `remaining > 72h` | verde | `CheckCircle2` |
| ⚫ Deshabilitada | `enabled === false` (siempre prevalece) | gris | `Bell` |

## 5. Jerarquía operacional (agrupación)

La experiencia agrupa en el orden exacto, y dentro de cada grupo ordena por
`remainingMilliseconds` ASC (más urgente primero):

```
🔴 Vencidas → 🟠 Hoy → 🟡 Próximas → 🟢 Activas → ⚫ Deshabilitadas
```

Ejemplo: `Venció hace 5 días · 3 horas · 15 min` ∥ `Vence en 20 min · 8 h · 19 h` ∥
`Vence mañana · en 2 días` ∥ `Vence en 10 días`.

## 6. Texto y consistencia

- **"Venció hace …"** se muestra **solo** en alertas vencidas (`remaining < 0`).
- **"Vence en …"** se muestra **solo** en alertas hoy / próximas / activas (`remaining ≥ 0`).
- Nunca aparece `Hoy ⚖ Venció hace …` (estados contradictorios).

## 7. Reutilización certificada

Operational Temporal ViewModel · `AlertMonitoringExperience` · `CardButton` · `AlertConfiguration`
· Resolver · Mapper · ApplicationService · Runtime · Alert Engine · Notification Engine. **Sin**
crear `AlertStatusEngine`, `SeverityEngine`, `BadgeService`, `AlertPriorityV2`, `AlertVisualEngine`.

## 8. Definition of Done

✅ Estados visuales de derivación exclusiva de `remainingMilliseconds` + `enabled`.
✅ Alerta vencida nunca aparece como "Hoy".
✅ "Venció hace …" solo en vencidas; "Vence en …" solo en activas/próximas/hoy.
✅ Jerarquía de agrupación Vencida → Hoy → Próxima → Activa → Deshabilitada.
✅ Colores e iconos consistentes en toda la experiencia.
✅ Orden cronológico por `remainingMilliseconds` (ASC) dentro de cada grupo.
✅ No se modifican alert Engine / Notification / Runtime / Persistencia / Metadata / Resolver / Mapper.
✅ No se crean motores, servicios, proveedores o contratos nuevos.
✅ Build PASS · Regression PASS · SSOT preservado.

## 9. Certificación OS-1…OS-16 → 16/16 (suite dedicada)

Clasificación unificada · exclusión `remaining`+`enabled` · exclusividades de texto/imagen ·
jerarquía · orden ASC · consistencia color/icono · reutilización infraestructura · sin motores ·
sin cambios arquitectónicos · **SINGLE OPERATIONAL STATUS MODEL CERTIFIED**.

## 10. Continuidad

Este mismo modelo de estados podrá reutilizarse más adelante en el **Dashboard**, el **Bell del
Header** y el **Notification Center**, manteniendo una única semántica visual en toda la aplicación.