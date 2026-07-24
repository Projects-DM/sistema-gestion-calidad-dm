# Sprint 107 — Operational Business Flow Certification (SSOT)

**Tipo:** Operational Business Flow Architecture Certification
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 91 - Sprint 106
**Branch:** `operativo-v1`
**Build:** 0 errores, 2711 módulos (3 nuevos)
**Archivos nuevos:** 3
**Archivos modificados:** 2

---

## Objetivo

Certificar la arquitectura oficial de los **Operational Business Flows** del SGC-DM, permitiendo que múltiples Operational Experiences participen en procesos operacionales completos de negocio sin acoplarse entre sí y reutilizando el 100% de la Operational Capability previamente certificada.

## Filosofía oficial

```
ONE OPERATIONAL CAPABILITY
    ↓
MULTIPLE OPERATIONAL EXPERIENCES
    ↓
ONE BUSINESS FLOW CONTRACT
    ↓
EVENT DRIVEN ORCHESTRATION
    ↓
ZERO EXPERIENCE COUPLING
    ↓
CERTIFIED BUSINESS FLOWS
```

## Problema arquitectónico resuelto

Las experiencias eran completamente independientes:

```
Recepción
    ↓
(no conectada)
    ↓
Inventarios
    ↓
(no conectada)
    ↓
Producción
    ↓
(no conectada)
    ↓
Despachos
```

Pero los procesos reales del negocio son **transversales**:

```
Recepción
    ↓  materia prima recibida
Producción
    ↓  consume inventario
Inventarios
    ↓  actualiza stock
Despachos
    ↓  descuenta producto terminado
```

**Solución certificada:** Las experiencias no se conocen entre sí. Se comunican exclusivamente mediante **eventos**.

## Principio fundamental (prohibición permanente)

Una Operational Experience **jamás** podrá hacer esto:

```js
ProductionService.createInventory();           // ❌ prohibido
DispatchService.updateProduction();            // ❌ prohibido
ReceptionService.callInventory();              // ❌ prohibido
InventoryService.createDispatch();             // ❌ prohibido
```

**Queda permanentemente prohibido.** La única comunicación permitida son **EVENTOS**.

---

## Arquitectura certificada

```
Operational Experiences
    │
    └── publishEvent()
         │
         ▼
    Operational Business Flow
         │
         ├── Flow Rules
         ├── consumeEvent()
         ├── executeAction()
         └── publishNextEvent()
              │
              ▼
    Operational Experiences
```

### Comunicación certificada

```
Reception
    │
    └── RECORD_CREATED (experiencia: recepcion)
         │
         ▼
    Business Flow
         │
         ├── consume: RECORD_CREATED
         ├── flow: production_flow
         └── publish: RAW_MATERIAL_RECEIVED
              │
              ▼
    (futuro: Production escucha RAW_MATERIAL_RECEIVED)
```

---

## Componentes creados

### 1. OperationalEventBus (`src/core/capabilities/experiences/OperationalEventBus.js`)

Sistema publish/subscribe singleton. La única vía de comunicación entre experiencias.

```js
OperationalEventBus.publish('RECORD_CREATED', { experienceKey, recordId });
OperationalEventBus.subscribe('RECORD_CREATED', handler);
```

### 2. OperationalBusinessFlowRegistry (`src/core/capabilities/experiences/OperationalBusinessFlowRegistry.js`)

Registro de flujos declarativos. Toda orquestación se declara como contrato:

```js
registerBusinessFlow({
  flowKey: 'production_flow',
  description: 'Flujo de producción desde recepción de materia prima',
  triggerEvent: 'RECORD_CREATED',
  steps: [
    { consume: 'RECORD_CREATED', publish: 'RAW_MATERIAL_RECEIVED' },
    { consume: 'INVENTORY_UPDATED', publish: 'PRODUCTION_STARTED' },
    { consume: 'PRODUCTION_COMPLETED', publish: 'PRODUCT_READY' },
  ],
});
```

### 3. OperationalFlowOrchestrator (`src/core/capabilities/experiences/OperationalFlowOrchestrator.js`)

Escucha eventos → resuelve flujos → publica eventos siguientes → audita cada paso.

Se inicializa automáticamente al cargar el Registry (singleton).

### 4. Event publishing en Lifecycle Orchestrator

Los métodos `createRecord()`, `updateRecord()`, `deleteRecord()`, `importRecords()` ahora publican eventos automáticamente:

| Operación | Evento publicado |
|-----------|-----------------|
| Create | `RECORD_CREATED` |
| Update | `RECORD_UPDATED` |
| Delete | `RECORD_DELETED` |
| Import | `RECORDS_IMPORTED` |

### 5. auditFlowStep en Audit Service

Nuevo evento de auditoría `flow_step` para trackear cada paso de un flujo.

---

## El Business Flow NO es

- ❌ Workflow Engine
- ❌ BPM
- ❌ ERP Process Engine
- ❌ Saga Pattern
- ❌ Microservices Orchestrator
- ❌ ProductionFlowEngine
- ❌ InventoryFlowEngine
- ❌ DispatchFlowEngine

## El Business Flow SI es

- ✅ **Contract Driven Flow Orchestration**
- ✅ Escuchar eventos
- ✅ Validar reglas del flujo
- ✅ Publicar eventos
- ✅ Orquestar experiencias (sin conocerlas)
- ✅ Auditar cada paso

## Operational Flow Lifecycle

```
Experience Event
    ↓
Business Flow Trigger
    ↓
Flow Validation
    ↓
Flow Step Resolution
    ↓
Event Publication
    ↓
Experience Consumption (futuro)
    ↓
Audit Event (flow_step)
    ↓
Dashboard Event
    ↓
Flow Completed
```

## Flow Governance

Se certifica la misma política de evolución de la Operational Capability:

```
1 Flow
    ↓
    NO justifica infraestructura.

2 Flows
    ↓
    Se analiza el patrón.

3 Flows
    ↓
    Puede generalizarse.

4+ Flows
    ↓
    Se certifica como universal.
```

## Ejemplos futuros

| Flujo | Trigger | Experiencias involucradas |
|-------|---------|--------------------------|
| Production Flow | RAW_MATERIAL_RECEIVED | Recepción → Producción → Inventarios → Despachos |
| Quality Control Flow | PRODUCTION_COMPLETED | Producción → Calidad |
| Purchase Approval Flow | PURCHASE_REQUESTED | Compras → Aprobación |
| Inventory Replenishment Flow | STOCK_BELOW_MINIMUM | Inventarios → Compras |
| Maintenance Request Flow | MAINTENANCE_REQUESTED | Mantenimiento |

Todos reutilizarán la misma arquitectura: **EventBus + FlowRegistry + FlowOrchestrator**.

---

## Restricciones certificadas

Queda prohibido:

- Acoplar Operational Experiences
- Modificar la Operational Capability
- Crear pipelines específicos
- Crear componentes específicos por flujo
- Crear Flow Engine v2
- Crear servicios cruzados entre experiencias
- Compartir lógica de dominio

## Principios certificados

| Principio | Estado |
|-----------|--------|
| EVENT DRIVEN | CERTIFIED |
| CONTRACT DRIVEN | CERTIFIED |
| REUSE FIRST | CERTIFIED |
| ZERO EXPERIENCE COUPLING | CERTIFIED |
| FLOW GOVERNANCE | CERTIFIED |
| MULTI FLOW READY | CERTIFIED |
| ERP READY | CERTIFIED |
| MULTI COMPANY READY | CERTIFIED |
| SCALABILITY READY | CERTIFIED |

## Resultado esperado

```
Operational Capability
    ↓
CERTIFIED
    ↓
Operational Experiences (4)
    ↓
CERTIFIED
    ↓
Operational Business Flows
    ↓
CERTIFIED
    ↓
ERP Modular Ready
    ↓
Capability Orchestration Ready
```

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Operational Business Flow Architecture certificada | ✅ EventBus + FlowRegistry + FlowOrchestrator |
| 2 | Event Driven Orchestration certificada | ✅ publish/subscribe, eventos estándar (RECORD_CREATED, RECORD_UPDATED, RECORD_DELETED, RECORDS_IMPORTED) |
| 3 | Contract Driven Flow certificado | ✅ registerBusinessFlow({ flowKey, triggerEvent, steps }) |
| 4 | Zero Experience Coupling certificado | ✅ Experiencias publican eventos, no conocen flujos |
| 5 | Flow Governance certificado | ✅ Regla 1/2/3/4+ flujos para evolucionar |
| 6 | Operational Flow Lifecycle certificado | ✅ Event → Trigger → Validate → Resolve → Publish → Audit |
| 7 | Multi Flow Ready certificado | ✅ Arquitectura preparada para N flujos |
| 8 | ERP Ready certificado | ✅ Sin lógica de dominio en infraestructura |
| 9 | Zero New Operational Infrastructure | ✅ 3 componentes universales (no específicos) |
| 10 | LEVEL 3 Certification | ✅ Build 0 errores, 2711 módulos |
