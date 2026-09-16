# Sprint 138.0 — Expiration Engine: Core Operational Capability Architecture Certification (MASTER SSOT)

> **Architecture Status:** LEVEL 3 — CERTIFIED
> **Type:** Core Architecture Certification / Operational Capability Definition / Expiration Governance (READ ONLY)
> **Branch:** operativo-v1
> **Date:** 2026-07-28

---

## OBJETIVO

Certificar formalmente el **Expiration Engine** como la segunda **Core Operational Capability** del SGC-DM, responsable exclusiva de la evaluación del estado de vigencia, vencimiento, renovación y expiración operacional de cualquier **Operational Element** del sistema.

El **Expiration Engine** establece la definición oficial del modelo de vencimientos del producto y se convierte en la **única fuente certificada de verdad** relacionada con la validez operacional de los elementos del sistema.

**Este documento se convierte en la definición oficial de toda lógica relacionada con vencimientos, renovaciones y estados de vigencia del SGC-DM.**

---

## RESTRICCIONES DEL SPRINT

| Restricción | Estado |
|-------------|--------|
| 0 funcionalidades nuevas | ✅ |
| 0 componentes nuevos | ✅ |
| 0 modificaciones del Runtime | ✅ |
| 0 cambios visuales | ✅ |
| 0 modificaciones del Dashboard | ✅ |
| 0 modificaciones sobre Operational Engines existentes | ✅ |
| 0 cambios de persistencia | ✅ |
| 100% certificación arquitectónica | ✅ |

---

## PROBLEMA ARQUITECTÓNICO IDENTIFICADO

El sistema administrará múltiples elementos susceptibles de vencer:

- Documentos
- Certificados
- Licencias
- Permisos
- Capacitaciones
- Exámenes médicos
- Auditorías
- Proveedores
- Planes de acción
- Registros operacionales
- Procedimientos
- Futuras entidades operacionales

Todos comparten las mismas necesidades operacionales:

- ¿Cuándo vence?
- ¿Está vigente?
- ¿Cuándo debe renovarse?
- ¿Está próximo a vencer?
- ¿Hace cuánto venció?
- ¿Requiere atención inmediata?
- ¿Debe bloquear operaciones?
- ¿Es válido operacionalmente?

La implementación por dominio produciría una arquitectura altamente acoplada.

### Implementaciones PROHIBIDAS

Está terminantemente prohibido implementar:

```diff
- ❌ DocumentExpirationService
- ❌ MedicalExamExpirationService
- ❌ AuditExpirationService
- ❌ CertificateExpirationService
- ❌ SupplierExpirationService
- ❌ TrainingExpirationService
- ❌ LicenseExpirationService
- ❌ ModuleExpirationService
```

Toda lógica de vencimientos deberá residir exclusivamente dentro del:

```
Expiration Engine
```

---

## CERTIFICACIÓN OFICIAL

Se certifica oficialmente la existencia del:

```
Expiration Engine
```

como la segunda:

```
CORE OPERATIONAL CAPABILITY
```

del SGC-DM.

---

## DEFINICIÓN OFICIAL

El **Expiration Engine** es responsable de determinar el estado operacional de vigencia de cualquier **Operational Element** del sistema.

> **Su propósito es responder una única pregunta:**
>
> **"¿Cuál es el estado operacional de vigencia de este elemento en este momento?"**

---

## RESPONSABILIDADES CERTIFICADAS

### Expiration Policies (Configuración operacional declarativa)

| # | Responsabilidad | Descripción | Naturaleza |
|---|----------------|-------------|------------|
| 1 | Definir ventana de vencimiento | `expirationWindow` por elemento/tenant | Metadata |
| 2 | Definir ventana de renovación | `renewalWindow` por elemento/tenant | Metadata |
| 3 | Definir auto-invalidación | `autoInvalidate` al vencer | Metadata |
| 4 | Definir bloqueo de operaciones | `blockOperations` si vencido | Metadata |
| 5 | Definir requerimiento de renovación | `renewalRequired` | Metadata |
| 6 | Definir estrategia de vencimiento | `strategy` (7 tipos certificados) | Metadata |
| 7 | Asociar regulatory framework | `regulatoryFramework` | Metadata |
| 8 | Configuración multi-tenant | Policies por tenant/empresa/módulo | Metadata |

### Expiration Rules (Lógica de evaluación runtime)

| # | Responsabilidad | Descripción | Naturaleza |
|---|----------------|-------------|------------|
| 1 | Evaluar estado vs policies | Comparar runtime contra configuración | Lógica de motor |
| 2 | Calcular tiempo restante | Días/horas hasta vencimiento | Cálculo |
| 3 | Determinar estado operacional | `valid`, `expiring_soon`, `expired`, etc. | Evaluación |
| 4 | Calcular ventanas operacionales | Aplicar expirationWindow configurada | Cálculo |
| 5 | Calcular ventanas de renovación | Aplicar renewalWindow configurada | Cálculo |
| 6 | Generar eventos operacionales | Disparar eventos de expiration | Eventos |
| 7| Exponer inteligencia operacional | A través de Operational Intelligence Contracts | Contracts |
| 8| Determinar validez operacional | `OperationalValidityContract` | Evaluación |

### Principio de separación

> **Está terminantemente prohibido mezclar configuración operacional (Policies) con lógica de evaluación (Rules) dentro del Expiration Engine.**
>
> **Esta separación es obligatoria para todas las futuras Core Operational Capabilities del sistema.**

### Responsabilidades PROHIBIDAS

| ❌ Prohibido | Pertenece a |
|-------------|-------------|
| Calcular cumplimiento | Compliance Engine |
| Enviar notificaciones | Notification Engine |
| Calcular indicadores | Indicator Engine |
| Calcular Operational Score | Operational Score Engine |
| Evaluar periodicidades | Periodicity Layer |
| Persistir información | Persistence Layer |
| Renderizar UI | Dashboard |
| Consultar DB | Providers |
| Aplicar reglas regulatorias | Regulatory Engine |

---

## OPERATIONAL EXPIRATION STATES

Se certifican oficialmente los siguientes estados:

| Estado | Código | Descripción |
|--------|--------|-------------|
| Sin vencimiento | `none` | No tiene vencimiento definido |
| Vigente | `valid` | Dentro del período de validez |
| Próximo a vencer | `upcoming` | Se acerca la fecha de vencimiento |
| Vence pronto | `expiring_soon` | Vencimiento inminente |
| Renovación requerida | `renewal_required` | Necesita renovación |
| Vencido | `expired` | Pasó la fecha de vencimiento |
| Renovado | `renewed` | Fue renovado exitosamente |
| Inválido | `invalid` | Perdió validez operacional |
| Archivado | `archived` | Histórico, no operativo |

---

## ARQUITECTURA CERTIFICADA

```
Operational Element
       │
       ▼
Expiration Engine
       │
       ├── Expiration Policies (Configuración declarativa — metadata)
       │       ├── expirationWindow
       │       ├── renewalWindow
       │       ├── autoInvalidate
       │       ├── blockOperations
       │       ├── renewalRequired
       │       ├── strategy
       │       └── regulatoryFramework
       │
       └── Expiration Rules (Lógica de evaluación — runtime)
               ├── Evaluar estado vs policies
               ├── Calcular tiempo restante
               ├── Determinar status operacional
               ├── Calcular ventanas
               ├── Generar eventos
               └── Exponer inteligencia
       │
       ▼
Operational Intelligence Contracts
       │
       ▼
Operational Intelligence Center
```

---

## EXPIRATION MODEL CERTIFICATION

Se certifica oficialmente el siguiente modelo conceptual, con separación obligatoria entre **Policies** (configuración) y **Rules** (evaluación):

```javascript
expiration: {
  enabled: false,
  policies: {
    expirationWindow: null,        // Días antes del vencimiento para alertar
    renewalWindow: null,            // Días antes para renovación
    autoInvalidate: false,          // Invalidar automáticamente al vencer
    blockOperations: false,         // Bloquear operaciones si vencido
    renewalRequired: false,         // Requiere renovación explícita
    strategy: 'date_based',         // Estrategia de vencimiento (7 tipos)
    regulatoryFramework: null       // Framework regulatorio asociado
  },
  rules: {
    expirationDate: null,           // Fecha de vencimiento calculada/evaluada
    renewalDate: null,              // Fecha de renovación calculada/evaluada
    status: 'none',                 // Estado operacional actual
    remainingDays: null,            // Días restantes o días vencido
    lastEvaluatedAt: null           // Última evaluación runtime
  }
}
```

### Definición de Propiedades

#### Expiration Policies (Configuración)

| Propiedad | Descripción | Default |
|-----------|-------------|---------|
| `enabled` | Activa la capacidad | `false` |
| `policies.expirationWindow` | Ventana operacional (días antes) | `null` |
| `policies.renewalWindow` | Ventana de renovación (días antes) | `null` |
| `policies.autoInvalidate` | Invalida automáticamente al vencer | `false` |
| `policies.blockOperations` | Bloquea operaciones si vencido | `false` |
| `policies.renewalRequired` | Requiere renovación explícita | `false` |
| `policies.strategy` | Estrategia de vencimiento | `'date_based'` |
| `policies.regulatoryFramework` | Framework regulatorio asociado | `null` |

#### Expiration Rules (Evaluación runtime)

| Propiedad | Descripción | Default |
|-----------|-------------|---------|
| `rules.expirationDate` | Fecha de vencimiento evaluada | `null` |
| `rules.renewalDate` | Fecha de renovación evaluada | `null` |
| `rules.status` | Estado operacional actual | `'none'` |
| `rules.remainingDays` | Días restantes (negativo = vencido) | `null` |
| `rules.lastEvaluatedAt` | Timestamp de última evaluación | `null` |

---

## EXPIRATION WINDOWS CERTIFICATION

Se certifica oficialmente el concepto de:

```
Expiration Windows
```

### Ejemplos

| Caso | Configuración |
|------|---------------|
| Documento | 30 días antes |
| Certificado | 15 días antes |
| Capacitación | 7 días antes |
| Auditoría | 60 días antes |
| Licencia | 90 días antes |

### Capacidades requeridas

El Expiration Engine deberá soportar:

```
✅ N ventanas operacionales
✅ N reglas temporales
✅ N estrategias de renovación
```

---

## EXPIRATION STRATEGY MODEL

Se certifica oficialmente que el Expiration Engine soporta **múltiples estrategias de vencimiento**, definidas mediante metadata y accesibles por cualquier Operational Element.

### Estrategias oficiales certificadas

| Estrategia | Código | Descripción | Base de evaluación |
|------------|--------|-------------|-------------------|
| Basada en fecha | `date_based` | Vence en una fecha fija | `expirationDate` |
| Período desde creación | `period_from_creation` | Vence tras N días desde creación | `createdAt + policy.interval` |
| Período desde última renovación | `period_from_renewal` | Vence tras N días desde última renovación | `lastRenewalAt + policy.interval` |
| Período desde último uso | `period_from_last_use` | Vence tras N días sin uso | `lastUsedAt + policy.interval` |
| Basada en evento externo | `event_driven` | Vence cuando ocurre un evento externo | `externalEvent` |
| Heredada de elemento padre | `parent_based` | Hereda vencimiento del elemento padre | `parent.expiration` |
| Manual | `manual` | Vencimiento definido exclusivamente por usuario | `status: 'expired'` |

### Reglas

- La estrategia se define mediante metadata en `expiration.policies.strategy`
- Cualquier Operational Element puede usar cualquier estrategia
- Nuevas estrategias pueden agregarse sin modificar la arquitectura del motor

---

## OPERATIONAL INTELLIGENCE CONTRACTS

Se certifica oficialmente que el **Expiration Engine únicamente expone inteligencia operacional mediante Operational Intelligence Contracts**. Ningún consumidor puede acceder a su lógica interna, metadata o persistencia.

### Contratos oficiales certificados

| Contrato | Propósito | Consumidores |
|----------|-----------|-------------|
| `ExpirationPolicyContract` | Configuración de policies del elemento | OIC, Compliance Engine |
| `ExpirationStatusContract` | Estado operacional actual (`valid`, `expired`, etc.) | OIC, Dashboard |
| `ExpirationTimelineContract` | Línea temporal completa con fechas clave | OIC, Notification Engine |
| `ExpirationRemainingContract` | Tiempo restante / días vencido | OIC, Compliance Engine |
| `RenewalStatusContract` | Estado de renovación | OIC, Notification Engine |
| `OperationalValidityContract` | Validez operacional (boolean + razón) | OIC, Regulatory Engine |
| `ExpirationEventsContract` | Eventos generados | OIC, Notification Engine |

### Principios de contratos

1. **El OIC consume exclusivamente estos contratos** — nunca accede a metadata, persistencia o lógica interna del motor
2. **Está prohibido** consumir directamente `expiration.metadata`, queries de persistencia o lógica de `Expiration Rules` desde fuera del motor
3. **Cada consumidor recibe solo el contrato que necesita** — no se exponen datos internos no contratados

---

## SINGLE SOURCE OF TRUTH PRINCIPLE

Se certifica oficialmente el siguiente principio:

> **El Expiration Engine es la única fuente certificada de verdad relacionada con estados de vigencia y vencimientos operacionales.**

Está terminantemente prohibido implementar lógica de vencimientos fuera del motor.

---

## CONSUMIDORES CERTIFICADOS

Los consumidores oficiales del Expiration Engine serán:

| Consumidor | Estado |
|-------------|--------|
| Operational Intelligence Center | ✅ Certificado |
| Compliance Engine | ✅ Certificado |
| Notification Engine | ✅ Certificado |
| Operational Score Engine | ✅ Certificado |
| Regulatory Engine | ✅ Certificado |
| Future AI Operational Engine | ✅ Certificado |

---

## OPERATIONAL ENGINES DEPENDENCY GOVERNANCE

### Principios certificados

1. **Independencia arquitectónica:** Cada motor funciona autónomamente sin requerir la ejecución previa de otro motor.
2. **Dependencias explícitas:** Si un motor requiere datos de otro, la dependencia debe declararse explícitamente mediante contrato.
3. **Sin orden universal:** Prohibido asumir un orden de ejecución obligatorio entre motores.
4. **Consumo independiente:** Cualquier motor puede ser consumido directamente por el OIC, otros motores o futuros componentes.
5. **Peer-to-peer:** Toda representación secuencial entre Operational Engines queda reemplazada por un modelo peer-to-peer con dependencias declarativas.

### Arquitectura peer-to-peer certificada

```
┌──────────────────────────────────────────────────────────────────┐
│                       OPERATIONAL ENGINES                         │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │  Periodicity   │  │  Expiration    │  │   Compliance     │   │
│  │  Layer         │  │  Engine        │  │   Engine         │   │
│  └────────────────┘  └────────────────┘  └──────────────────┘   │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │  Indicator     │  │  Notification  │  │   Regulatory     │   │
│  │  Engine        │  │  Engine        │  │   Engine         │   │
│  └────────────────┘  └────────────────┘  └──────────────────┘   │
│                                                                  │
│  ┌──────────────────────┐  ┌────────────────────────────────┐   │
│  │ Operational Score    │  │  AI Operational Engine (Future)│   │
│  │ Engine               │  └────────────────────────────────┘   │
│  └──────────────────────┘                                       │
└──────────────────────────────────────────────────────────────────┘
          │               │               │               │
          ▼               ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────────┐
│              OPERATIONAL INTELLIGENCE CENTER (OIC)                │
│         Consume mediante Operational Intelligence Contracts       │
└──────────────────────────────────────────────────────────────────┘
```

> **Cada flecha representa una dependencia explícita declarada mediante contrato, no un pipeline secuencial obligatorio.**

### Integración específica con Periodicity Layer

```
Periodicity Layer ─── contrato ───→ Expiration Engine
                                      │
                                      ├── contrato → Compliance Engine (si requiere)
                                      ├── contrato → Notification Engine (si requiere)
                                      ├── contrato → OIC (siempre)
                                      └── contrato → Operational Score Engine (si requiere)
```

> **La Periodicity Layer jamás determinará estados de vencimiento.**
> **El Expiration Engine jamás determinará periodicidades operacionales.**
>
> Ambas capacidades son independientes y complementarias. Las dependencias se declaran explícitamente mediante contrato, nunca se asumen por posición.

---

## CASOS DE USO CERTIFICADOS

```
Documento INVIMA
Estado: VALID
       ▼
Vence en 28 días.

Certificado del proveedor
Estado: EXPIRING_SOON
       ▼
Requiere renovación.

Examen médico
Estado: EXPIRED
       ▼
Venció hace 4 días.

Capacitación
Estado: RENEWAL_REQUIRED
       ▼
Renovación pendiente.
```

---

## FUTURE REGULATORY INTEGRATION

El Expiration Engine podrá ser utilizado por:

```
ISO
       │
       ▼
INVIMA
       │
       ▼
HACCP
       │
       ▼
BPM
       │
       ▼
Normas internas
       │
       ▼
Regulaciones futuras
```

**Sin necesidad de modificaciones arquitectónicas.**

---

## ESCALABILIDAD CERTIFICADA

El Expiration Engine deberá soportar:

| Elemento | Capacidad |
|----------|-----------|
| Empresas | N |
| Operational Elements | N |
| Expiration Rules | N |
| Renewal Rules | N |
| Regulatory Frameworks | N |
| Providers | N |
| Tenants | N |

---

## PRINCIPIOS CERTIFICADOS

Toda implementación futura deberá cumplir obligatoriamente con:

| Principio | Exigencia |
|-----------|-----------|
| Metadata Driven | Obligatorio |
| Runtime Driven | Obligatorio |
| Capability Driven | Obligatorio |
| Operational Intelligence Driven | Obligatorio |
| Maximum Reuse | Obligatorio |
| DB Agnostic | Obligatorio |
| Multi Tenant Ready | Obligatorio |
| Progressive Scalability | Obligatorio |
| Single Source Of Truth | Obligatorio |
| Policies vs Rules Separation | Obligatorio |
| Expiration Strategies | Obligatorio |
| Operational Engines Independence | Obligatorio |
| Intelligence Contracts Only | Obligatorio |
| Future Policy Governance | Obligatorio |

---

## ROADMAP OFICIAL

```
Sprint 136 ─── Periodicity Layer

Sprint 137 ─── Operational Intelligence Center

Sprint 138 ─── Expiration Engine    ← ESTAMOS AQUÍ

Sprint 139 ─── Compliance Engine

Sprint 140 ─── Indicator Engine

Sprint 141 ─── Notification Engine

Sprint 142 ─── Regulatory Engine

Sprint 143 ─── OIC Providers Architecture

Sprint 144 ─── Operational Score Engine

Sprint 145+ ── Progressive Implementations
```

---

## ADDENDUM — ARCHITECTURAL GOVERNANCE ADJUSTMENTS

> **Status:** REQUIRED FOR LEVEL 3 CERTIFICATION
> **Type:** Architectural Governance Adjustments
> **Impact:** Core Architecture Refinement (READ ONLY)

---

### ADJUSTMENT N°1 — EXPIRATION POLICIES vs EXPIRATION RULES

**✅ CERTIFIED.** Separación obligatoria.

| Capa | Responsabilidad | Naturaleza |
|------|----------------|------------|
| **Expiration Policies** | Configuración operacional por elemento/tenant/regulación | Metadata declarativa |
| **Expiration Rules** | Evaluación runtime en base a Policies | Lógica de motor |

**Afectación de modelos existentes:** El modelo `expiration` certificado en Sprint 138 se refactoriza para separar `policies` de `rules` (ver sección EXPIRATION MODEL CERTIFICATION).

**Obligatorio:** Esta separación es obligatoria para **todas** las futuras Core Operational Capabilities.

---

### ADJUSTMENT N°2 — EXPIRATION STRATEGY MODEL

**✅ CERTIFIED.** 7 estrategias oficiales, definidas por metadata, cualquier Operational Element puede usar cualquier estrategia (ver sección EXPIRATION STRATEGY MODEL).

**Reglas:**
- La estrategia se define mediante metadata en `expiration.policies.strategy`
- Cualquier Operational Element puede usar cualquier estrategia
- Nuevas estrategias pueden agregarse sin modificar la arquitectura del motor

---

### ADJUSTMENT N°3 — OPERATIONAL ENGINES DEPENDENCY GOVERNANCE

**✅ CERTIFIED.** Los motores son arquitectónicamente independientes (ver sección OPERATIONAL ENGINES DEPENDENCY GOVERNANCE).

**Principios:**
1. Independencia arquitectónica — no existe pipeline universal obligatorio
2. Dependencias explícitas mediante contrato, nunca asumidas por posición
3. Prohibido asumir orden universal de ejecución
4. Cualquier motor puede ser consumido independientemente por OIC, otros motores o futuros componentes
5. Toda representación secuencial previa queda reemplazada por modelo peer-to-peer

---

### ADJUSTMENT N°4 — FUTURE POLICY GOVERNANCE

**✅ CERTIFIED (obligatorio).**

**Principios:**
1. **Policies independientes de Capabilities:** Las políticas operacionales del Core son independientes de las capacidades operacionales, permitiendo soportar múltiples frameworks regulatorios y reglas empresariales sin modificar los Operational Engines.
2. **Policies multi-tenant:** Las Policies varían por tenant, empresa, regulación o módulo.
3. **Consumo de Policies certificadas:** Los Operational Engines consumen Policies certificadas en lugar de hardcodear reglas operacionales.
4. **Gobernanza transversal:** Esta gobernanza es obligatoria para todos los Operational Engines futuros.

---

### ADJUSTMENT N°5 — EXPIRATION INTELLIGENCE CONTRACTS

**✅ CERTIFIED.** 7 contratos oficiales, OIC consume exclusivamente contratos (ver sección OPERATIONAL INTELLIGENCE CONTRACTS).

**Prohibiciones:**
- Consumir metadata del motor desde fuera
- Consumir persistencia del motor desde fuera
- Consumir lógica interna de Expiration Rules desde fuera

---

## RESULTADO ESPERADO ACTUALIZADO

```
Sprint 138.0 completado

├── Expiration Engine ................................ ✅ CERTIFIED
├── Expiration Model ................................. ✅ CERTIFIED
├── Expiration Policies Governance ................... ✅ CERTIFIED
├── Expiration Rules Separation ...................... ✅ CERTIFIED
├── Expiration Strategies Model ...................... ✅ CERTIFIED
├── Expiration States ................................ ✅ CERTIFIED
├── Renewal Model .................................... ✅ CERTIFIED
├── Expiration Windows ............................... ✅ CERTIFIED
├── Operational Intelligence Contracts ............... ✅ CERTIFIED
├── Operational Engines Dependency Governance ........ ✅ CERTIFIED
├── Future Policy Governance ......................... ✅ CERTIFIED
├── Single Source Of Truth Principle ................. ✅ CERTIFIED
├── OIC Integration Strategy ......................... ✅ CERTIFIED
├── Scalability Strategy ............................. ✅ CERTIFIED
├── Architectural Restrictions ....................... ✅ CERTIFIED
└── Product Alignment ................................ ✅ CERTIFIED
```

---

## CERTIFICACIÓN

```
LEVEL 3 — CORE OPERATIONAL CAPABILITY
EXPIRATION ENGINE
ARCHITECTURE CERTIFIED (MASTER SSOT)

- Expiration Engine Certified ....................... ✅
- Expiration Policies Governance .................... ✅
- Expiration Rules Separation ....................... ✅
- Expiration Strategies Model ....................... ✅
- Expiration Model Certified ........................ ✅
- Renewal Model Certified ........................... ✅
- Operational States Certified ....................... ✅
- Operational Engines Dependency Governance .......... ✅
- Future Policy Governance .......................... ✅
- Intelligence Contracts Certified ................... ✅
- Single Source Of Truth Principle .................. ✅
- OIC Integration Certified .......................... ✅
- Scalability Strategy Certified ..................... ✅
- Architectural Restrictions Certified ............... ✅
- Product Alignment Certified ........................ ✅

100% Arquitectura.
100% Documentación.
0% Implementación.
```
