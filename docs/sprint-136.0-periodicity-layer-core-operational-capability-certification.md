# Sprint 136.0 — Periodicity Layer: Core Operational Capability Architecture Certification (SSOT)

> **Architecture Status:** LEVEL 3 — CERTIFIED
> **Type:** Core Architecture Certification / Operational Capability Definition / Transversal Capability Governance (READ ONLY)
> **Branch:** operativo-v1
> **Date:** 2026-07-27

---

## OBJETIVO

Certificar formalmente la **Periodicity Layer** como la primera **Core Operational Capability** del SGC-DM, estableciendo su identidad arquitectónica, responsabilidades, límites funcionales, modelo de metadata, reglas de reutilización y estrategia de integración futura con la capa de Operational Intelligence.

Este sprint certifica oficialmente el concepto de **Operational Elements** y establece la separación permanente entre **Functional Capabilities** y **Operational Capabilities** dentro del Core del sistema.

**Este documento se convierte en la definición oficial de toda lógica temporal del SGC-DM.**

---

## RESTRICCIONES DEL SPRINT

| Restricción | Estado |
|-------------|--------|
| 0 funcionalidades nuevas | ✅ |
| 0 componentes nuevos | ✅ |
| 0 modificaciones del Runtime | ✅ |
| 0 cambios visuales | ✅ |
| 0 modificaciones del Dashboard | ✅ |
| 0 modificaciones de persistencia | ✅ |
| 0 cambios sobre módulos existentes | ✅ |
| 100% certificación arquitectónica | ✅ |

---

## PROBLEMA ARQUITECTÓNICO IDENTIFICADO

Actualmente múltiples dominios del sistema requerirán capacidades relacionadas con el tiempo:

- Formularios
- Registros operacionales
- Documentos
- Certificados
- Capacitaciones
- Exámenes médicos
- Auditorías
- Licencias
- Permisos
- Planes de acción
- Indicadores
- Procesos operacionales

Todos ellos comparten necesidades similares:

- ¿Cuándo debe ejecutarse?
- ¿Cuándo vence?
- ¿Cuándo debe renovarse?
- ¿Cuándo debe notificarse?
- ¿Cuándo se encuentra atrasado?
- ¿Cuándo entra en incumplimiento?

La implementación individual por dominio produciría:

```
DocumentExpirationService
TrainingExpirationService
MedicalExamService
CertificateRenewalService
AuditPeriodicityService
FormScheduleService
MaintenanceScheduleService
...
```

Esta aproximación viola:

- Reutilización máxima
- Escalabilidad
- Desacoplamiento
- Metadata Driven Architecture
- Capability Driven Architecture

---

## CERTIFICACIÓN OFICIAL DEL CORE

Se certifica formalmente la existencia de las siguientes categorías arquitectónicas del Core:

```
SGC-DM CORE
     │
     ├── CORE FUNCTIONAL CAPABILITIES
     │       ├── Dynamic Forms
     │       ├── Dynamic Records
     │       ├── Runtime Engine
     │       ├── Metadata Factory
     │       ├── Document Repository
     │       ├── Operational Experiences
     │       ├── Capability Assignments
     │       └── Runtime Components
     │
     └── CORE OPERATIONAL CAPABILITIES
             ├── Periodicity Layer        ← PRIMERA CERTIFICADA
             ├── Expiration Engine
             ├── Compliance Engine
             ├── Indicator Engine
             ├── Notification Engine
             ├── Regulatory Engine
             └── AI Operational Engine (Future)
```

---

## DEFINICIÓN OFICIAL

### Functional Capabilities

Son aquellas capacidades responsables de permitir que el sistema:

- Renderice
- Almacene
- Ejecute
- Consulte
- Administre
- Configure

> **Las Functional Capabilities NO interpretan el estado operacional del negocio.**

### Operational Capabilities

Son aquellas capacidades responsables de permitir que el sistema:

- **Entienda**
- **Evalúe**
- **Calcule**
- **Interprete**
- **Anticipe**
- **Notifique**
- **Proyecte**

el estado operacional de cualquier elemento del sistema.

> **Las Operational Capabilities son completamente transversales.**

---

## OPERATIONAL ELEMENT CERTIFICATION

Se certifica oficialmente el concepto de:

### Operational Element

**Definición:** Un **Operational Element** es cualquier entidad del sistema susceptible de recibir capacidades operacionales.

### Operational Elements certificados

| # | Operational Element |
|---|-------------------|
| 1 | FORMULARIOS |
| 2 | DOCUMENTOS |
| 3 | CERTIFICADOS |
| 4 | CAPACITACIONES |
| 5 | AUDITORÍAS |
| 6 | PLANES DE ACCIÓN |
| 7 | REGISTROS OPERACIONALES |
| 8 | INDICADORES |
| 9 | LICENCIAS |
| 10 | PERMISOS |
| 11 | EXÁMENES MÉDICOS |
| 12 | EXPERIENCIAS OPERACIONALES |
| 13 | MÓDULOS |
| 14 | PROCESOS OPERACIONALES |
| 15+ | Futuras entidades del sistema |

---

## MODELO CERTIFICADO

```
Operational Element
       │
       ▼
  Puede recibir:
       │
       ▼
Operational Capabilities
       │
       ├── Periodicity
       ├── Expiration
       ├── Compliance
       ├── Indicators
       ├── Notifications
       ├── Regulatory Rules
       └── Future Capabilities
```

### Modelo Conceptual

```javascript
OperationalElement {
  id,
  name,
  type,
  metadata,
  functionalCapabilities: {},
  operationalCapabilities: {}   // ← Operational Capabilities se inyectan aquí
}
```

### Ejemplo

```javascript
operationalCapabilities: {
  periodicity: {},
  expiration: {},
  compliance: {},
  indicator: {},
  notification: {}
}
```

---

## PERIODICITY LAYER

### Definición Oficial

La **Periodicity Layer** es una **Core Operational Capability** responsable de definir **cuándo** debe ejecutarse, registrarse, renovarse o evaluarse cualquier **Operational Element** del sistema.

### Responsabilidades

| # | Responsabilidad |
|---|----------------|
| 1 | Programación temporal |
| 2 | Periodicidad operacional |
| 3 | Frecuencias |
| 4 | Ciclos de ejecución |
| 5 | Configuración temporal |
| 6 | Generación de eventos temporales |
| 7 | Detección de atrasos |
| 8 | Detección de omisiones |
| 9 | Generación de calendarios operacionales |
| 10 | Soporte para futuras alertas |

### Responsabilidades PROHIBIDAS

| ❌ Prohibido | Pertenece a |
|-------------|-------------|
| Calcular vencimientos | Expiration Engine |
| Evaluar cumplimiento | Compliance Engine |
| Enviar notificaciones | Notification Engine |
| Calcular indicadores | Indicator Engine |
| Aplicar reglas regulatorias | Regulatory Engine |
| Renderizar información | Dashboard / UI |
| Persistir información | DB Agnostic Persistence Layer |

---

## ARQUITECTURA CERTIFICADA

```
                 Operational Element
                       │
                       ▼
              Periodicity Layer
                       │
               ┌───────┴───────┐
               │               │
        Scheduling        Runtime Rules
               │               │
               └───────┬───────┘
                       │
               Operational Events
                       │
       ┌───────────────┼───────────────┐
       │               │               │
Expiration       Compliance        Indicator
Engine           Engine            Engine
       │               │               │
Notification    Regulatory       AI (Future)
Engine           Engine            Engine
       │               │               │
       └───────────────┼───────────────┘
                       │
            Operational Intelligence
                       │
                       ▼
                  Dashboard
```

---

## TIPOS OFICIALES DE PERIODICIDAD

Se certifican oficialmente los siguientes tipos:

| Tipo | Código |
|------|--------|
| Sin periodicidad | `none` |
| Cada hora | `hourly` |
| Cada 4 horas | `every_4_hours` |
| Cada 8 horas | `every_8_hours` |
| Diaria | `daily` |
| Semanal | `weekly` |
| Quincenal | `biweekly` |
| Mensual | `monthly` |
| Bimestral | `bimonthly` |
| Trimestral | `quarterly` |
| Semestral | `semiannual` |
| Anual | `annual` |
| Personalizada | `custom` |

---

## MODELO DE METADATA CERTIFICADO

```javascript
periodicity: {
  enabled: false,
  type: 'daily',
  interval: 1,
  unit: 'day',
  startDate: null,
  endDate: null,
  businessDaysOnly: false,
  generateAt: null,
  reminderBefore: null,
  reminderUnit: null
}
```

### Definición de Propiedades

| Propiedad | Descripción | Default |
|-----------|-------------|---------|
| `enabled` | Activa la capacidad | `false` |
| `type` | Tipo certificado | `'daily'` |
| `interval` | Cada cuántas unidades | `1` |
| `unit` | Unidad temporal | `'day'` |
| `startDate` | Inicio del ciclo | `null` |
| `endDate` | Fin del ciclo | `null` |
| `businessDaysOnly` | Días hábiles únicamente | `false` |
| `generateAt` | Hora sugerida | `null` |
| `reminderBefore` | Tiempo previo al evento | `null` |
| `reminderUnit` | Unidad del recordatorio | `null` |

---

## REGLAS DE REUTILIZACIÓN

Se certifica oficialmente la siguiente regla:

> **La Periodicity Layer jamás pertenecerá a un módulo, documento, formulario o motor específico.**

### REGLA N°1

Está prohibido implementar:

```diff
- ❌ FormPeriodicityService
- ❌ DocumentPeriodicityService
- ❌ TrainingPeriodicityService
- ❌ AuditPeriodicityService
- ❌ MaintenancePeriodicityService
- ❌ MedicalExamPeriodicityService
```

### REGLA N°2

Toda lógica temporal deberá residir exclusivamente dentro de la **Periodicity Layer**.

### REGLA N°3

Ningún **Operational Element** podrá implementar lógica propia relacionada con:

- Fechas
- Renovaciones
- Programación
- Periodicidades
- Atrasos
- Eventos temporales

---

## INTEGRACIÓN FUTURA

La Periodicity Layer se certifica como dependencia oficial de:

| Motor / Capa | Dependencia de Periodicity Layer |
|-------------|---------------------------------|
| Expiration Engine | ✅ Sí |
| Compliance Engine | ✅ Sí |
| Indicator Engine | ✅ Sí |
| Notification Engine | ✅ Sí |
| Operational Intelligence Center | ✅ Sí (indirecta) |
| Dashboard | ✅ Sí (indirecta) |

---

## CASOS DE USO FUTUROS

| Operational Element | Ejemplo | Periodicidad |
|-------------------|---------|-------------|
| Formulario | Control de temperaturas | Cada 4 horas |
| Documento | Análisis microbiológico | Mensual |
| Capacitación | Manipulación de alimentos | Semestral |
| Examen médico | Ingreso del personal | Anual |
| Certificado | Proveedor autorizado | Anual |
| Auditoría | Auditoría interna | Trimestral |

---

## INTEGRACIÓN CON EL OIC

La Periodicity Layer será consumida indirectamente por:

### Operational Intelligence Center

```
TODAY'S OPERATIONS
├── Programados ──────── Periodicity Layer
├── Pendientes ───────── Periodicity Layer
├── Atrasados ────────── Periodicity Layer
└── Diligenciados ────── Periodicity Layer

DOCUMENTATION
├── Renovaciones ─────── Periodicity Layer + Expiration Engine
├── Próximos ─────────── Periodicity Layer + Expiration Engine
└── Vencidos ─────────── Expiration Engine

ALERTS
├── Eventos temporales ── Periodicity Layer
├── Atrasos ──────────── Periodicity Layer
└── Pendientes ───────── Periodicity Layer

COMPLIANCE
├── Cumplimiento operacional ── Periodicity Layer + Compliance Engine
└── Cumplimiento documental ─── Periodicity Layer + Compliance Engine
```

---

## ESCALABILIDAD

La Periodicity Layer deberá soportar:

| Dimensión | Capacidad |
|-----------|-----------|
| Empresas | 100 → 1.000 → 10.000 |
| Proveedores de persistencia | N |
| Operational Elements | N |
| Operational Capabilities | N |

---

## PRINCIPIOS CERTIFICADOS

Toda implementación futura deberá cumplir obligatoriamente con:

| Principio | Exigencia |
|-----------|-----------|
| Metadata Driven | La configuración de periodicidad se define por metadata, no por código |
| Runtime Driven | La evaluación de periodicidad se ejecuta en runtime, no en diseño |
| Capability Driven | La periodicidad se activa por capability, no por tipo de elemento |
| DB Agnostic | La persistencia es intercambiable |
| Operational Intelligence Driven | Debe aumentar la inteligencia operacional |
| Multi Tenant Ready | Preparado para múltiples empresas |
| Progressive Scalability | Escala horizontalmente |
| Maximum Reuse | Una sola capa de periodicidad para todos los elementos |

---

## FUTURE ROADMAP

```
Sprint 136
  └── Periodicity Layer Certification (READ ONLY)

Sprint 137
  └── Expiration Engine Certification (READ ONLY)

Sprint 138
  └── Compliance Engine Certification (READ ONLY)

Sprint 139
  └── Indicator Engine Certification (READ ONLY)

Sprint 140
  └── Notification Engine Certification (READ ONLY)

Sprint 141
  └── Operational Intelligence Center Foundation (READ ONLY)

Sprint 142+
  └── Implementaciones progresivas
```

---

## RESULTADO ESPERADO

```
Sprint 136.0 completado

├── Operational Capability Model ............... ✅ CERTIFIED
├── Operational Element Model .................. ✅ CERTIFIED
├── Functional vs Operational Separation ....... ✅ CERTIFIED
├── Periodicity Layer .......................... ✅ CERTIFIED
├── Metadata Model ............................. ✅ CERTIFIED
├── Periodicity Types .......................... ✅ CERTIFIED
├── Architectural Restrictions ................. ✅ CERTIFIED
├── Reuse Strategy ............................. ✅ CERTIFIED
├── Future Integrations ........................ ✅ CERTIFIED
├── OIC Integration Strategy ................... ✅ CERTIFIED
├── Scalability Strategy ....................... ✅ CERTIFIED
└── Future Roadmap ............................. ✅ CERTIFIED
```

---

## CERTIFICACIÓN

```
LEVEL 3 — CORE OPERATIONAL CAPABILITY
PERIODICITY LAYER
ARCHITECTURE CERTIFIED (SSOT)

- Periodicity Layer Certified ............... ✅
- Operational Capability Model Certified .... ✅
- Operational Element Model Certified ....... ✅
- Metadata Model Certified .................. ✅
- Reuse Strategy Certified .................. ✅
- Architectural Restrictions Certified ...... ✅
- Future Integration Strategy Certified ..... ✅
- Scalability Strategy Certified ........... ✅
- Product Alignment Certified .............. ✅

100% Arquitectura.
100% Documentación.
0% Implementación.
```
