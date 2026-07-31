# Sprint 138.5 — Expiration Engine: Capability Interface & Event Governance Certification (MASTER SSOT ADDENDUM)

> **Architecture Status:** LEVEL 3 — CERTIFIED
> **Type:** Architectural Governance Closure (READ ONLY)
> **Branch:** operativo-v1
> **Date:** 2026-07-28

---

## AJUSTE N°1 — UNIVERSAL CAPABILITY INTERFACE CERTIFICATION

### Problema arquitectónico

Actualmente cada Operational Capability podría implementar una estructura ligeramente diferente:

```
Expiration Engine                Compliance Engine
       │                               │
       ├── Policies                     ├── Rules
       ├── ResolvedPolicy               ├── Evaluators
       ├── Status                       ├── Scores
       ├── Events                       ├── Alerts
       ├── Contracts                    ├── Reports
       └── Consumers                    └── Consumers
```

Esto viola:

- Maximum Reuse
- Capability Driven Architecture
- Universal Core Capability Model
- Facilitar futuros motores, IA operacional, testing e integración con el OIC

### Solución certificada

Todas las **Core Operational Capabilities** deberán implementar la **misma interfaz conceptual**:

```
Capability
       │
       ├── Policies
       ├── Resolved Policy
       ├── Evaluation Model
       ├── Events
       ├── Contracts
       └── Consumers
```

### Interfaz universal certificada

| Componente | Descripción | Naturaleza |
|------------|-------------|------------|
| **Policies** | Configuración operacional declarativa | Metadata |
| **Resolved Policy** | Política final resuelta (hereda/sobrescribe) | Metadata resuelta |
| **Evaluation Model** | Lógica de evaluación runtime del dominio | Lógica de motor |
| **Events** | Eventos operacionales publicados por la capability | Publicación |
| **Contracts** | Contratos de exposición de datos del dominio | Exposición |
| **Consumers** | Consumidores certificados del contrato | Integración |

### Ejemplo: Expiration Engine

```
ExpirationEngine implements Capability
       │
       ├── Policies             → expirationPolicy (metadata)
       ├── Resolved Policy      → ResolvedExpirationPolicy
       ├── Evaluation Model     → Expiration Rules
       ├── Events               → ExpirationCapabilityEvents
       ├── Contracts            → Expiration Contracts
       └── Consumers            → OIC, Compliance, Notification, Score, Regulatory, AI
```

### Ejemplo: Compliance Engine (futuro)

```
ComplianceEngine implements Capability
       │
       ├── Policies             → compliancePolicy (metadata)
       ├── Resolved Policy      → ResolvedCompliancePolicy
       ├── Evaluation Model     → Compliance Rules
       ├── Events               → ComplianceCapabilityEvents
       ├── Contracts            → Compliance Contracts
       └── Consumers            → OIC, Notification, Score, Regulatory, AI
```

### Principio certificado

> **Toda Core Operational Capability del sistema deberá implementar la Universal Capability Interface.**
>
> Está prohibido que una Capability tenga un diseño estructural diferente al modelo certificado.

---

## AJUSTE N°2 — OPERATIONAL EVENTS GOVERNANCE

### Problema arquitectónico

Actualmente el Expiration Engine expone `Expiration Events`, pero aún no está definido quién es el dueño arquitectónico del sistema de eventos del Core.

En el futuro tendremos:

```
❌ Expiration Events
❌ Compliance Events
❌ Indicator Events
❌ Notification Events
❌ Regulatory Events
❌ AI Events
❌ Periodicity Events
```

Sin una gobernanza clara, cada capability podría implementar eventos de forma diferente.

### Solución certificada

Se certifica oficialmente el concepto:

```
Capability Events
```

### Modelo certificado

```
Operational Capability
       │
       ▼
Capability Events
       │
       ▼
Operational Consumers
```

### Ejemplos por capability

```
Expiration Engine       →  ExpirationCapabilityEvents
Compliance Engine       →  ComplianceCapabilityEvents
Indicator Engine        →  IndicatorCapabilityEvents
Notification Engine     →  NotificationCapabilityEvents
Regulatory Engine        →  RegulatoryCapabilityEvents
Periodicity Layer       →  PeriodicityCapabilityEvents
```

### Ownership certificado

| Concepto | Ownership |
|----------|-----------|
| Capability Events | Cada Operational Capability |
| Event Bus transversal (Future) | Operational Event Bus |
| Enrutamiento de eventos (Future) | Notification Engine |
| Consumo de eventos | Operational Consumers |

### Future: Operational Event Bus

Se reserva conceptualmente el futuro:

```
Operational Event Bus (Future)
```

que será el **consumidor transversal** de todos los `CapabilityEvents` del Core, permitiendo:

- Suscripción unificada a eventos de cualquier capability
- Enrutamiento inteligente de eventos
- Historial de eventos operacionales
- Integración con AI Engine

### Principio certificado

> **Cada Operational Capability es dueña exclusiva de sus propios Capability Events.**
>
> Está prohibido que una Capability publique eventos que no pertenezcan a su dominio. El enrutamiento y consumo transversal será responsabilidad del futuro Operational Event Bus.

---

## AJUSTE N°3 — CAPABILITY HEALTH MODEL (RESERVADO)

Se certifica conceptualmente (no obligatorio para implementación inmediata):

```
Capability Health Model
```

### Definición

El **Capability Health Model** es un contrato uniforme que permite al OIC y al futuro AI Engine inspeccionar cualquier Capability del Core de manera homogénea.

### Modelo conceptual

```javascript
capabilityHealth: {
  id: "expiration-engine",
  name: "Expiration Engine",
  version: "1.0.0",
  status: "operational",     // operational | degraded | unavailable
  health: 100,               // 0-100
  contracts: ["ExpirationStatusContract", "..."],
  events: ["ExpirationUpcomingEvent", "..."],
  policies: ["expirationPolicy"],
  dependencies: [],
  lastEvaluatedAt: null,
  metrics: {
    totalEvaluations: 0,
    activeElements: 0,
    expiredElements: 0,
    pendingRenewals: 0
  }
}
```

### Beneficios certificados

| Beneficio | Descripción |
|-----------|-------------|
| Inspección uniforme | Cualquier capability expone el mismo health contract |
| AI-ready | El AI Engine puede consumir health de todas las capabilities |
| OIC integration | El OIC puede mostrar estado de salud del Core |
| Diagnóstico | Detección temprana de degradación en capabilities |
| Escalabilidad | Monitoreo transversal sin acoplamiento |

### Principio certificado

> **Toda Core Operational Capability deberá exponer opcionalmente un Capability Health Contract uniforme para permitir inspección transversal por parte del OIC y futuros consumidores inteligentes.**

---

## RESULTADO ESPERADO

```
Sprint 138.5 completado

├── Universal Capability Interface Certified ........... ✅
├── Capability Events Governance Certified ............ ✅
├── Operational Event Bus Reserved .................... ✅
├── Capability Health Model Reserved .................. ✅
├── Product Alignment .................................. ✅
└── Governance Closure ................................. ✅
```

---

## CERTIFICACIÓN

```
LEVEL 3 — EXPIRATION ENGINE
CAPABILITY INTERFACE & EVENT GOVERNANCE CERTIFIED

- Universal Capability Interface Certified ............ ✅
- Capability Events Governance Certified .............. ✅
- Operational Event Bus Reserved ...................... ✅
- Capability Health Model Reserved .................... ✅
- Product Alignment Certified ......................... ✅

100% Arquitectura.
100% Gobernanza.
0% Implementación.
```

---

```
══════════════════════════════════════════════════════════════════════
           EXPIRATION ENGINE FULLY CLOSED — CORE MODEL COMPLETE
══════════════════════════════════════════════════════════════════════
```
