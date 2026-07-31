# Sprint 138.2 — Expiration Engine: Final Architectural Refinements (MASTER SSOT ADDENDUM)

> **Architecture Status:** LEVEL 3 — CERTIFIED
> **Type:** Architectural Refinement Addendum (READ ONLY)
> **Impact:** Architectural Governance Only
> **Branch:** operativo-v1
> **Date:** 2026-07-28

---

## OBJETIVO

Realizar los refinamientos finales del modelo arquitectónico del Expiration Engine con el fin de:

- Eliminar posibles acoplamientos futuros
- Formalizar los límites del motor
- Certificar el modelo de evaluación operacional
- Certificar el modelo de eventos operacionales
- Certificar la extensibilidad futura del motor

Este Sprint complementa los Sprints:

- **Sprint 138.0** — Certificación base del Expiration Engine
- **Sprint 138.1** — Expiration Strategies, Regulatory Decoupling, Dependency Governance

y representa la **certificación definitiva** del modelo de gobernanza del Expiration Engine.

---

## ADJUSTMENT N°1 — EXPIRATION STATUS OWNERSHIP CERTIFICATION

### Problema conceptual identificado

Hoy tenemos:

```javascript
expiration: {
  status: "valid"
}
```

El problema es que arquitectónicamente parece que `status` es metadata.

Cuando en realidad:

```
status
NO ES CONFIGURACIÓN
NO ES METADATA
NO ES POLICY
ES RUNTIME INTELLIGENCE
```

### Modelo corregido

#### Metadata (expirationPolicy)

```javascript
expirationPolicy: {
  strategy: "fixed_date",
  expirationWindow: null,
  renewalWindow: null,
  renewalRequired: false,
  autoInvalidate: false,
  blockOperations: false
}
```

#### Runtime Intelligence (expirationStatus)

```javascript
expirationStatus: {
  status: "valid",
  remainingTime: null,
  expiredSince: null,
  renewalRequired: false,
  operationalValidity: true
}
```

### Principio certificado

> **Está prohibido almacenar como metadata declarativa:**
>
> ```diff
> - ❌ status
> - ❌ remainingTime
> - ❌ expiredSince
> ```

`status`, `remainingTime` y `expiredSince` pertenecen exclusivamente a `expirationStatus` (runtime intelligence).

---

## ADJUSTMENT N°2 — EXPIRATION EVENTS CERTIFICATION

Se certifica oficialmente el concepto:

```
Expiration Events
```

### Eventos certificados

| Evento | Disparo |
|--------|---------|
| `ExpirationUpcomingEvent` | Elemento próximo a vencer |
| `ExpirationSoonEvent` | Elemento a punto de vencer |
| `ExpirationExpiredEvent` | Elemento vencido |
| `RenewalRequiredEvent` | Elemento requiere renovación |
| `OperationalInvalidEvent` | Elemento pierde validez operacional |
| `RenewalCompletedEvent` | Elemento renovado exitosamente |

### Restricción

El motor:

```
NO ENVÍA
NO NOTIFICA
NO RENDERIZA
```

Únicamente:

```
PUBLICA EVENTOS OPERACIONALES
```

Será responsabilidad futura del:

```
Notification Engine
```

determinar qué hacer con dichos eventos.

---

## ADJUSTMENT N°3 — EXPIRATION POLICY INHERITANCE

El producto será:

- Multi Tenant
- Multi Company
- Multi Module
- Multi Capability

### Principio certificado

```
Expiration Policy Inheritance
```

### Cadena de herencia

```
Company
   │
   ▼
Area
   │
   ▼
Process
   │
   ▼
Program
   │
   ▼
Module
   │
   ▼
Operational Element
```

### Capacidades por nivel

Cada nivel podrá definir `Expiration Policies` permitiendo:

```
✅ Heredar
✅ Sobrescribir
✅ Extender
```

### Ejemplo

```
Empresa ────────────────────────────── 30 días
                                           │
Programa BPM ────────────── 15 días (sobrescribe)
                               │
Certificado proveedor ── 7 días (sobrescribe)
```

Todo **sin modificar el motor**.

---

## ADJUSTMENT N°4 — EXPIRATION INTELLIGENCE LEVELS

Actualmente el motor evalúa un elemento. Pero el sistema necesitará inteligencia agregada.

### Niveles certificados

| Level | Ámbito | Descripción |
|-------|--------|-------------|
| LEVEL 1 | Operational Element Intelligence | Estado individual del elemento |
| LEVEL 2 | Module Intelligence | Estado agregado por módulo |
| LEVEL 3 | Program Intelligence | Estado agregado por programa |
| LEVEL 4 | Process Intelligence | Estado agregado por proceso |
| LEVEL 5 | Company Intelligence | Estado agregado por empresa |
| LEVEL 6 | Tenant Intelligence | Estado agregado por tenant |

### Ejemplo

```
Empresa
       │
       ├── 35 documentos vencidos
       ├── 5 proveedores vencidos
       ├── 12 capacitaciones pendientes
       │
       └── Expiration Health = 82%
```

### Restricción

El Expiration Engine:

```
NO CALCULA SCORES
```

Únicamente expone:

```
Expiration Intelligence
```

que posteriormente podrá ser consumida por:

- Operational Score Engine
- Operational Intelligence Center

---

## ADJUSTMENT N°5 — FUTURE EXTENSIBILITY CERTIFICATION

Se certifica oficialmente:

```
Open Expiration Capability Principle
```

### Estrategias futuras permitidas

| Estrategia futura | Descripción |
|-------------------|-------------|
| AI Based Expiration | Vencimiento determinado por IA |
| Risk Based Expiration | Vencimiento basado en nivel de riesgo |
| Regulatory Based Expiration | Vencimiento determinado por regulación |
| Usage Based Expiration | Vencimiento basado en uso del elemento |
| Location Based Expiration | Vencimiento basado en ubicación |
| Approval Based Expiration | Vencimiento ligado a aprobaciones |
| Conditional Expiration | Vencimiento sujeto a condiciones |
| Future Strategies... |Extensible sin modificar el motor|

### Restricción oficial

Está prohibido asumir que:

```
❌ Todas las expiraciones son por fecha
❌ Todas las renovaciones son temporales
❌ Todas las reglas son iguales
```

### Principio

El Expiration Engine deberá ser:

```
Open For Extension
Closed For Architectural Modification
```

---

## RESULTADO ESPERADO

```
Sprint 138.2 completado

├── Expiration Status Ownership Certified ........... ✅
├── Expiration Events Certified ..................... ✅
├── Policy Inheritance Certified .................... ✅
├── Expiration Intelligence Levels Certified ........ ✅
├── Open Expiration Capability Certified ............ ✅
└── Product Alignment Certified ..................... ✅
```

---

## CERTIFICACIÓN

```
LEVEL 3 — EXPIRATION ENGINE
FINAL ARCHITECTURAL REFINEMENT
MASTER SSOT CERTIFIED

- Expiration Status Ownership Certified ............. ✅
- Expiration Events Certified ....................... ✅
- Policy Inheritance Certified ...................... ✅
- Expiration Intelligence Levels Certified .......... ✅
- Open Capability Principle Certified ............... ✅
- Product Alignment Certified ....................... ✅

100% Arquitectura.
100% Gobernanza.
0% Implementación.
```
