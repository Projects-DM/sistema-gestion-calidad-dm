# Sprint 138.1 — Expiration Engine: Architectural Governance Adjustments (MASTER SSOT ADDENDUM)

> **Architecture Status:** LEVEL 3 — CERTIFIED
> **Type:** Architectural Governance Adjustments / Expiration Engine Refinement (READ ONLY)
> **Branch:** operativo-v1
> **Date:** 2026-07-28

---

## OBJETIVO

Certificar oficialmente los ajustes arquitectónicos del Expiration Engine identificados durante la revisión del Sprint 138.0, refinando su modelo de gobernanza, estrategias de vencimiento, desacoplamiento regulatorio y modelo oficial de consumidores operacionales.

Este Addendum **no reemplaza** el Sprint 138.0.

Su propósito es complementar y fortalecer la certificación arquitectónica del Expiration Engine manteniendo los principios de:

- Operational Intelligence Driven Architecture
- Capability Driven Architecture
- Metadata Driven Architecture
- Single Source of Truth
- Maximum Reuse
- Progressive Scalability
- Multi Tenant Ready

---

## RESTRICCIONES DEL SPRINT

| Restricción | Estado |
|-------------|--------|
| 0 funcionalidades nuevas | ✅ |
| 0 implementación | ✅ |
| 0 modificaciones del Runtime | ✅ |
| 0 cambios visuales | ✅ |
| 0 persistencia | ✅ |
| 100% gobernanza arquitectónica | ✅ |

---

## ADJUSTMENT N°1 — EXPIRATION STRATEGIES CERTIFICATION

Se certifica oficialmente el concepto de:

```
Expiration Strategies
```

### Definición

El **Expiration Engine jamás asumirá un único modelo de vencimiento basado en fechas**.

Todo **Operational Element** deberá utilizar una **estrategia certificada** de vencimiento.

### Estrategias certificadas

| Estrategia | Código | Descripción |
|------------|--------|-------------|
| Fecha fija | `fixed_date` | Fecha fija de vencimiento |
| Expiración continua | `rolling_expiration` | Expira en función del tiempo transcurrido |
| Basada en renovación | `renewal_based` | Expira si no es renovado |
| Basada en dependencias | `dependency_based` | Depende del estado de otros elementos |
| Basada en periodicidad | `periodicity_based` | Depende de periodicidades operacionales |
| Validación manual | `manual_validation` | Validación manual por usuario |
| Personalizada | `custom` | Estrategia extensible futura |

---

## ADJUSTMENT N°2 — EXPIRATION MODEL UPDATE

Se actualiza oficialmente el modelo conceptual certificado.

### Modelo anterior (Sprint 138.0 original)

```javascript
expiration: {
  enabled: false,
  expirationDate: null,
  renewalRequired: false,
  renewalDate: null,
  expirationWindow: null,
  renewalWindow: null,
  autoInvalidate: false,
  blockOperations: false,
  status: "valid"
}
```

### Modelo certificado (Sprint 138.1)

```javascript
expiration: {
  enabled: false,
  strategy: "fixed_date",
  expirationDate: null,
  renewalRequired: false,
  renewalDate: null,
  expirationWindow: null,
  renewalWindow: null,
  autoInvalidate: false,
  blockOperations: false,
  status: "valid"
}
```

### Principio certificado

> **Está prohibido que un Operational Element implemente vencimientos sin una estrategia certificada.**

---

## ADJUSTMENT N°3 — REGULATORY DECOUPLING CERTIFICATION

Se certifica oficialmente el siguiente principio:

```
Regulatory Decoupling Principle
```

### Definición

El **Expiration Engine jamás conocerá**:

```
❌ ISO
❌ INVIMA
❌ BPM
❌ HACCP
❌ Normativas internas
❌ Regulaciones futuras
```

### Arquitectura certificada

```
Regulatory Framework
       │
       ▼
Regulatory Engine
       │
       ▼
Expiration Policies
       │
       ▼
Expiration Engine
```

### Prohibición oficial

Está terminantemente prohibido que el Expiration Engine implemente:

```diff
- ❌ regulatoryFramework
- ❌ regulatoryRules
- ❌ regulatoryEvaluation
- ❌ regulatoryMetadata
```

Toda inteligencia regulatoria pertenece exclusivamente al:

```
Regulatory Engine
```

---

## ADJUSTMENT N°4 — OPERATIONAL CONSUMERS GOVERNANCE

Se certifica oficialmente el siguiente modelo:

```
Operational Consumers Model
```

### Principio certificado

Los **Operational Engines** son arquitectónicamente independientes.

Está prohibido asumir un pipeline universal obligatorio entre Operational Engines.

### Modelo certificado

```
Operational Element
       │
       ▼
Expiration Engine
       │
       ▼
Operational Intelligence Contracts
       │
       ▼
Operational Consumers
```

### Consumidores certificados

| Consumidor | Tipo |
|------------|------|
| Compliance Engine | Operational Engine |
| Notification Engine | Operational Engine |
| Operational Score Engine | Operational Engine |
| Regulatory Engine | Operational Engine |
| Operational Intelligence Center | Master Consumer |
| Future AI Operational Engine | Operational Engine (Future) |

### Principio certificado

> **Todo consumidor del Expiration Engine deberá consumir exclusivamente:**
>
> ```
> Operational Intelligence Contracts
> ```

---

## ADJUSTMENT N°5 — OPERATIONAL ENGINES DEPENDENCY GOVERNANCE

Se certifica oficialmente el siguiente principio:

```
Operational Engines Dependency Governance
```

### Definición

Los **Operational Engines** del Core:

- **NO** poseen un orden universal de ejecución
- Está prohibido asumir:

```diff
- ❌ Periodicity → Expiration → Compliance
- ❌ Expiration → Notification
- ❌ Compliance → Score
- ❌ Notification → OIC
```

### Arquitectura certificada

```
Operational Capability
       │
       ▼
Operational Intelligence Contracts
       │
       ▼
Operational Consumers
```

### Principio certificado

Las dependencias entre Operational Engines deberán ser:

```
✅ Explícitas
✅ Declarativas
✅ Desacopladas
✅ Capability Driven
```

---

## RESULTADO ESPERADO

```
Sprint 138.1 completado

├── Expiration Strategies Certified ................. ✅
├── Expiration Model Updated ........................ ✅
├── Regulatory Decoupling Certified ................ ✅
├── Operational Consumers Governance ............... ✅
├── Operational Engines Dependency Governance ...... ✅
├── Product Alignment ............................... ✅
└── Master SSOT Alignment ........................... ✅
```

---

## CERTIFICACIÓN

```
LEVEL 3 — EXPIRATION ENGINE
ARCHITECTURAL GOVERNANCE ADDENDUM
MASTER SSOT CERTIFIED

- Expiration Strategies Certified ................... ✅
- Expiration Model Certified ........................ ✅
- Regulatory Decoupling Certified ................... ✅
- Operational Consumers Governance .................. ✅
- Dependency Governance Certified ................... ✅
- Product Alignment Certified ....................... ✅

100% Arquitectura.
100% Gobernanza.
0% Implementación.
```
