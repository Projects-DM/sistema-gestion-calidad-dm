# Sprint 275 — Corrección Controlada del Estado Inicial de Nueva Alerta

**Branch:** `release/stable-sprint79`
**Modo:** CONTROLLED CORRECTION · LEVEL 5
**SSOT:** este documento (`docs/Sprint-275.md`)
**Dependencias:** Sprint 270 · 271 · 272 · 273 · 274 (Auditoría Forense — SSOT de causa raíz)
**Estado:** CERTIFIED

> **PRINCIPIO RECTOR:**
> **CORRECT THE SOURCE STATE — DO NOT WEAKEN THE CONTRACT.**

---

## 1. Resumen

Se corrige la causa raíz **C** confirmada en Sprint 274: el default canónico del draft de
NUEVA ALERTA era internamente contradictorio (`periodicityMode:'none'` +
`repeatPolicy:'repeat'`), que `mapFormStateToMetadata` traducía a
`periodicity:null + repeatPolicy:'repeat'` y la validación certificada rechazaba.

La corrección establece un default canónico VÁLIDO y conserva el contrato de validación
**intacto**.

## 2. Simetría con Sprint 274

```text
ANTES (Sprint 274):
Nueva Alerta
  ↓ createEmptyFormState() → mapMetadataToFormState(null)
  ↓ periodicityMode:'none'  + repeatPolicy:'repeat'
  ↓ mapFormStateToMetadata
  ↓ periodicity:null + repeatPolicy:'repeat'
  ↓ validateAlertConfiguration → ❌ REJECT

DESPUÉS (Sprint 275):
Nueva Alerta
  ↓ createEmptyFormState()                    ← ÚNICO PUNTO DE AUTORIDAD
  ↓ periodicityMode:'recurring' amount:1 unit:'days' repeatPolicy:'repeat'
  ↓ mapFormStateToMetadata
  ↓ periodicity:{amount:1,unit:'days'} + repeatPolicy:'repeat'
  ↓ validateAlertConfiguration → ✅ PASS
  ↓ write-path existente (Sprint 271) → persistencia
```

## 3. Cambio de producción

**Un único archivo** (punto mínimo y único de autoridad que genera el estado inicial):

```
src/core/capabilities/alert/operational-configuration/AlertConfigurationMapper.js
```

`createEmptyFormState()` — diff `+13 / -1`:

```js
export function createEmptyFormState() {
  return {
    ...mapMetadataToFormState(null),
    periodicityMode: 'recurring',
    periodicityAmount: 1,
    periodicityUnit: 'days',
    repeatPolicy: 'repeat',
  };
}
```

- Usa EXCLUSIVAMENTE nombres/valores/estructura existentes (sin nueva representación).
- Reutiliza `mapMetadataToFormState`/`mapFormStateToMetadata` sin modificación estructural.
- No crea servicios, adapters, ports, dominios, estados, contratos ni hooks.
- No renombra ni reorganiza nada.

## 4. Frontera de presentación — consumidor puro

El Panel (`AlertConfigurationPanel.jsx`) fue **verificado como consumidor puro**: `newAlertInitial`
y `addAlert` hacen `{ ...createEmptyFormState(), name, description, startDate, startTime, enabled, automaticClose }`
sin override inline de periodicidad. La autoridad queda en el Mapper.

**Nota:** el Panel/working tree YA contenía (sesión previa, Hallazgo-0 de Sprint 274) un
override inline de recurring + el presenter de feedback `alertConfigurationErrorPresenter.js`
y usos de `buildVisibleErrors`. Sprint 275 **no sostiene** esos deltas pendientes:
- No los revierte (prohibido tocar fuera de scope).
- No los incorpora al scope.
- Los registra intactos en el árbol (ver §8).

## 5. Invariante garantizada

```text
repeatPolicy === 'repeat'  ⟹  periodicity es objeto recurrente válido { amount, unit }
```

Garantizada para TODA alerta nueva nacida de `createEmptyFormState()`. El usuario puede
pulsar **Guardar configuración** sin tocar la frecuencia.

## 6. Capas NO modificadas (huella de auditoría)

| Capa | Archivo | Estado |
| --- | --- | --- |
| Validación | `AlertConfigurationValidation.js` | **NO MODIFICADO** |
| Persistencia | `AlertConfigurationPersistenceAdapter.js` | **NO MODIFICADO por Sprint 275** (delta pre-existente documentado) |
| Ports | `AlertConfigurationPersistencePort.js` | **NO MODIFICADO** |
| Aplicación | `AlertConfigurationApplicationService.js` | **NO MODIFICADO por Sprint 275** |
| Write-path | `dynamicService.js` · `documentRepositoriesService.js` | **NO MODIFICADO por Sprint 275** |
| Runtime | `AlertConfigurationResolver.js` | **NO MODIFICADO** |
| Metadata | `AlertConfigurationMetadata.js` · `AlertConfiguration.js` | **NO MODIFICADO** |
| Capabilities | Spr 270/272 | **NO REABIERTAS** |

## 7. Evidencia funcional

Verificación **inline** (node `--eval`, sin scripts `.mjs`, sin acceso a BD — Port SPY):

```text
PASS 275.1 default recurring/1/days/repeat
PASS 275.1 metadata periodicity {amount:1,unit:'days'} + repeat:'repeat'
PASS 275.2 default PASS validateAlertConfiguration
PASS 275.3 persist new alert → success:true + Port invocado (1)
PASS 275.4/11 payload = envelope { alertConfigurations: [...] } correcto
PASS 275.6 edición de alerta existente válida → success:true + identidad conservada
PASS 275.5 reapertura conserva periodicity/repeatPolicy
PASS 275.8 múltiples alertas → success:true (colección length 2)
PASS 275.9 usuario cambia a semanal → persiste {amount:1,unit:'weeks'} (no el default)
PASS 275.7 esquemas diaria/semanal/mensual/vencimiento → success:true
PASS 275.10 estado inválido forzado → REJECT (mismo error) + Port NO invocado
PASS 275.2 validación intacta: error "repeatPolicy 'repeat' requiere..." se conserva
```

## 8. Matriz de pruebas — trazabilidad (Sprint 275)

| Test | Escenario | Resultado |
| --- | --- | --- |
| 275.1 | Abrir Nueva Alerta → default recurrente válido | **PASS** |
| 275.2 | Guardar sin tocar frecuencia | **PASS** (validación superada) |
| 275.3 | Guardar frecuencia diaria | **PASS** |
| 275.4 | Guardar frecuencia semanal | **PASS** |
| 275.5 | Guardar "al vencimiento" | **PASS** |
| 275.6 | Editar alerta existente | **PASS** |
| 275.7 | Reabrir alerta guardada | **PASS** |
| 275.8 | Crear segunda alerta | **PASS** |
| 275.9 | Modificar frecuencia antes de guardar | **PASS** (se persiste la del usuario) |
| 275.10 | Estado inválido forzado | **REJECT** como contrato |
| 275.11 | Verificar alert_config | Envelope correcto (SPY) |
| 275.12 | Verificar runtime | Fuera de ejercicio de esta capa (sin regresión) |

## 9. Regresión — verificación de límites (§13 y §14 del mandato)

`git status --short` al cierre:

```text
M src/core/capabilities/alert/operational-configuration/AlertConfigurationMapper.js   ← Sprint 275 (único)
M / ?? … (delta pre-existente de sesión previa, NO tocado: AppService, Panel, Adapter,
           services, presenter, scripts docs/Sprint-271..274) 
```

- No se añadieron cambios nuevos en Validation / Persistence / Runtime / Capabilities /
  Supabase schema (verificado por `git diff --name-only`).
- No se creó ningún script `.mjs` en este sprint (todos los existentes son pre-existentes).
- El único artefacto de documentación de este sprint es `docs/Sprint-275.md`.

## 10. Cierre arquitectónico

```text
                    ┌─────────────────────────┐
                    │   NUEVA ALERTA           │
                    └────────────┬────────────┘
                                 ↓
                    ┌─────────────────────────┐
                    │ DEFAULT CANÓNICO         │
                    │ recurring / 1 / days     │
                    │ repeat        (Mapper)  │
                    └────────────┬────────────┘
                                 ↓
                    ┌─────────────────────────┐
                    │ VALIDATION CONTRACT      │
                    │       INTACT             │
                    └────────────┬────────────┘
                                 ↓
                              PASS
                                 ↓
                    ┌─────────────────────────┐
                    │ EXISTING WRITE-PATH      │
                    │       INTACT             │
                    └────────────┬────────────┘
                                 ↓
                            PERSISTENCE
```

SPRINT 275 NO corrigió la validación. NO corrigió la persistencia. NO corrigió el botón.
Corrigió UNICAMENTE el estado inicial que violaba un contrato ya correcto.

---

## Estado

```text
SPRINT 275 — CONTROLLED CORRECTION

Mode:               CONTROLLED CORRECTION
Type:               CONTROLLED CORRECTION — LEVEL 5
Scope:              NEW ALERT DEFAULT STATE ONLY
Production changes: 1 archivo (AlertConfigurationMapper.js)
Source changes:     AlertConfigurationMapper.js (+13 / -1)
Scripts:            0  (verificación inline, sin archivos)
Artifacts:          1  (docs/Sprint-275.md)
Validation:         INTACTA (no modificada)
Persistence:        INTACTA
Runtime:            INTACTO
Status:             CERTIFIED
Next:               — (causa raíz C resuelta)
```