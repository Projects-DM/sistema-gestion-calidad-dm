# Sprint 132.1 — Operational Record Actions Governance Audit (SSOT)

**Tipo:** Core Runtime Governance Sprint  
**Estado:** LEVEL 3 — CERTIFIED  
**Branch:** operativo-v1  
**Dependencias:** Sprint 132 — Runtime Record Lifecycle Governance Audit  
**Archivos auditados:** 5  
**Archivos modificados:** 0  

---

## Preámbulo

Este documento responde la pregunta arquitectónica central del Sprint 132.1:

> **¿Cuál es el modelo correcto y definitivo del ciclo de vida operacional de un registro dentro del SGC-DM?**

La auditoría se realizó sobre el código fuente real de los siguientes archivos:

| Archivo | Rol |
|---------|-----|
| `OperationalExperienceRegistry.js` | Contratos de experiencia (SSOT de opciones de estado) |
| `OperationalExperienceLifecycleOrchestrator.js` | Ciclo de vida operacional (CRUD + acciones bulk) |
| `OperationalDataCompletion.js` | Readiness states + reglas canApprove/canClose/canReopen |
| `operationalRecordsService.js` | Persistencia (fetch/insert/update/delete/insertBatch) |
| `UniversalOperationalRuntime.jsx` | UI (handlers, dropdown, botones, tabla, badges) |

---

## FASE 1 — Auditoría del Menú Desplegable

### 1.1 Evidencia encontrada en código

**Fuente del menú desplegable** — `OperationalExperienceRegistry.js` línea 189:
```js
estado: { label: 'Estado', options: ['pendiente', 'en_proceso', 'completado', 'draft', 'validated', 'ready', 'approved', 'cerrado'] }
```

**Renderizado en UI** — `UniversalOperationalRuntime.jsx` líneas 721-725:
```jsx
<select onChange={e => { const v = e.target.value; if (v) { handleBulkStatus(v); e.target.value = ''; } }}>
  <option value="">Cambiar estado...</option>
  {estadoOptions.map(o => <option key={o} value={o}>{o}</option>)}
</select>
```

**Fallback cuando el contrato no tiene opciones** — Runtime línea 473:
```js
return ['pendiente', 'en_proceso', 'completado'];
```

### 1.2 Veredicto por pregunta

| Pregunta | Veredicto | Razón |
|----------|-----------|-------|
| ¿Debe existir el menú desplegable? | **CONDICIONAL** | Sí, pero solo para los 3 estados de trabajo del usuario |
| ¿Qué utilidad operacional tiene? | **CAMBIO DE ESTADO DE TRABAJO** | Permite al operativo mover un registro entre pendiente → en_proceso → completado |
| ¿Es redundante con los botones? | **PARCIALMENTE SÍ** | `approved` y `cerrado` ya tienen botones dedicados (Aprobar, Cerrar) |
| ¿Permite acciones que los botones ya realizan? | **SÍ — DUPLICIDAD** | El dropdown permite elegir `approved` y `cerrado` sin validación de precondición |
| ¿Está mezclando estados internos con persistentes? | **SÍ — CRÍTICO** | `draft`, `validated`, `ready` son estados computados internos del Readiness Engine, NO se persisten en DB |

### 1.3 Diagnóstico del Dropdown

El dropdown actualmente expone **8 opciones**, de las cuales:

| Opción | Naturaleza | ¿Debe aparecer en dropdown? | Razón |
|--------|-----------|----------------------------|-------|
| `pendiente` | Persistente DB | ✅ **SÍ** | Estado de trabajo del usuario |
| `en_proceso` | Persistente DB | ✅ **SÍ** | Estado de trabajo del usuario |
| `completado` | Persistente DB | ✅ **SÍ** | Estado de trabajo del usuario |
| `draft` | **Computado (Readiness)** | ❌ **NO** | Estado interno — no se persiste — confunde al usuario |
| `validated` | **Computado (Readiness)** | ❌ **NO** | Estado interno — no se persiste — confunde al usuario |
| `ready` | **Computado (Readiness)** | ❌ **NO** | Estado interno — no se persiste — confunde al usuario |
| `approved` | Persistente DB | ❌ **NO** | Lo realiza el botón "Aprobar" con validación de precondición |
| `cerrado` | Persistente DB | ❌ **NO** | Lo realiza el botón "Cerrar" con validación de precondición |

**Conclusión FASE 1:** El dropdown debe sobrevivir con exactamente **3 opciones**: `pendiente`, `en_proceso`, `completado`. Todas las demás deben eliminarse de las `options` del contrato.

---

## FASE 2 — Auditoría de Botones

### 2.1 Inventario de botones actuales

**Zona A — Header (siempre visibles):** PDF · CSV · Dashboard · Importar · Nuevo

**Zona B — Bulk Actions Bar (visible al seleccionar registros):**
Dropdown "Cambiar estado..." · Aprobar · Cerrar · Reabrir · Exportar · Eliminar

### 2.2 Auditoría detallada de cada botón

#### 🔵 Botón: Aprobar

| Atributo | Estado actual |
|----------|---------------|
| Handler | `handleBulkApprove` (Runtime línea 246) |
| Validación precondición en UI | ✅ `canApprove(r, contract)` |
| Validación en Orchestrator | ❌ `approveRecords` NO valida — escribe ciegamente `estado: 'approved'` |
| Publica EventBus | ❌ No |
| ¿Duplica otro mecanismo? | ⚠️ El dropdown también puede escribir `approved` sin validación |

**Veredicto:** ✅ **SOBREVIVE** — Requiere que la validación `canApprove` se mueva al Orchestrator (Sprint 132.2).

#### 🔵 Botón: Cerrar

| Atributo | Estado actual |
|----------|---------------|
| Handler | `handleBulkClose` (Runtime línea 265) |
| Validación precondición en UI | ✅ `canClose(r, contract)` |
| Validación en Orchestrator | ❌ `closeRecords` NO valida — escribe ciegamente `estado: 'cerrado'` |
| Publica EventBus | ❌ No |
| ¿Duplica otro mecanismo? | ⚠️ El dropdown también puede escribir `cerrado` sin validación |

**Veredicto:** ✅ **SOBREVIVE** — Requiere validación en Orchestrator (Sprint 132.2).

#### 🔵 Botón: Reabrir

| Atributo | Estado actual |
|----------|---------------|
| Handler | `handleBulkReopen` (Runtime línea 284) |
| Validación precondición en UI | ✅ `canReopen(r, contract)` |
| Estado destino | ⚠️ Escribe `'validated'` — estado **computado** que NO debería persistirse |
| Publica EventBus | ❌ No |

**Problema crítico:** `reopenRecords` escribe `estado: 'validated'` (Orchestrator línea 236). `validated` es un **estado del Readiness Engine, no un estado persistente válido**. Viola la separación entre estados computados y estados persistentes.

**Veredicto:** ✅ **SOBREVIVE** — Su estado destino debe cambiar a `'en_proceso'` en Sprint 132.2.

#### 🟢 Botón: Exportar (Zona B)

**Veredicto:** ✅ **SOBREVIVE** — Contextualmente diferente al Export de Header (seleccionados vs todos).

#### 🔴 Botón: Eliminar (Zona B)

**Veredicto:** ✅ **SOBREVIVE** — Operación legítima. El problema de lentitud (N iteraciones secuenciales) es de hardening (Sprint 132.3).

### 2.3 Tabla resumen — Botones

| Botón | ¿Sobrevive? | Acción en Sprint 132.2 |
|-------|-------------|------------------------|
| **Aprobar** | ✅ Sí | Mover validación `canApprove` al Orchestrator + EventBus |
| **Cerrar** | ✅ Sí | Mover validación `canClose` al Orchestrator + EventBus |
| **Reabrir** | ✅ Sí | Cambiar destino `validated` → `en_proceso` + EventBus |
| **Exportar (bulk)** | ✅ Sí | Mantener tal cual |
| **Eliminar (bulk)** | ✅ Sí | EventBus + batch (Sprint 132.3) |

**Ningún botón se elimina. Todos tienen utilidad operacional diferenciada.**

---

## FASE 3 — Auditoría del Ciclo de Vida

### 3.1 Ciclo de vida correcto y definitivo

```
CREACIÓN (form manual / import)
        │ automationRule: setDefault('pendiente')
        ▼
   ┌─────────┐
   │pendiente│ ◄── usuario puede cambiar vía dropdown
   └────┬────┘
        │ [dropdown]
        ▼
 ┌────────────┐
 │ en_proceso │ ◄── usuario puede cambiar vía dropdown
 └─────┬──────┘     ◄── destino de Reabrir (cambio Sprint 132.2)
       │ [dropdown]
       ▼
 ┌───────────┐
 │ completado│ ◄── usuario puede cambiar vía dropdown
 └─────┬─────┘
       │ [botón "Aprobar"] — canApprove: score 100% + sin errores + sin inconsistencias
       ▼
 ┌──────────┐
 │ approved │ ◄── escrito por Orchestrator.approveRecords
 └────┬─────┘
      │ [botón "Cerrar"] — canClose: estado == 'approved'
      ▼
 ┌─────────┐
 │ cerrado │ ◄── escrito por Orchestrator.closeRecords
 └────┬────┘
      │ [botón "Reabrir"] — canReopen: estado == 'cerrado' || 'approved'
      ▼
 ┌────────────┐
 │ en_proceso │ ◄── destino correcto (actualmente incorrecto: 'validated')
 └────────────┘
```

### 3.2 Respuestas a las preguntas de la fase

| Pregunta | Respuesta certificada |
|----------|-----------------------|
| ¿`approved` es un estado? | ✅ SÍ — Se persiste en DB. Resultado de la acción "Aprobar" |
| ¿`approved` es una acción? | ❌ No — La acción es "Aprobar". El estado resultante es `approved` |
| ¿`approved` debe existir? | ✅ SÍ — Paso previo a cierre. Da trazabilidad de aprobación |
| ¿`cerrado` es un estado? | ✅ SÍ — Se persiste en DB. Resultado de la acción "Cerrar" |
| ¿`cerrado` es una acción? | ❌ No — La acción es "Cerrar". El estado resultante es `cerrado` |
| ¿`cerrado` debe existir? | ✅ SÍ — Estado terminal del ciclo de vida |
| ¿Reopen debe volver a qué estado? | ✅ **`en_proceso`** — El único estado de trabajo persistente con sentido |
| ¿`completado` es suficiente? | ✅ Sí como antesala de `approved`. No como estado terminal |
| ¿Se necesitan menos estados? | ✅ SÍ — De 8 opciones en dropdown, solo 3 son legítimas para el usuario |

---

## FASE 4 — Auditoría de Estados

### 4.1 Veredicto definitivo por estado

| # | Estado | Naturaleza | ¿Persiste en DB? | Veredicto |
|---|--------|-----------|-----------------|-----------|
| 1 | `pendiente` | DB | ✅ | ✅ **SOBREVIVE** — Estado inicial. Generado por automationRule |
| 2 | `en_proceso` | DB | ✅ | ✅ **SOBREVIVE** — Estado de trabajo activo |
| 3 | `completado` | DB | ✅ | ✅ **SOBREVIVE** — Antesala de aprobación |
| 4 | `approved` | DB | ✅ | ✅ **SOBREVIVE** — Aprobado por usuario con validación |
| 5 | `cerrado` | DB | ✅ | ✅ **SOBREVIVE** — Estado terminal reversible |
| 6 | `draft` | Computado Readiness | ❌ | ❌ **DESAPARECE del dropdown** |
| 7 | `validated` | Computado Readiness | ❌ | ❌ **DESAPARECE del dropdown y como destino de Reopen** |
| 8 | `ready` | Computado Readiness | ❌ | ❌ **DESAPARECE del dropdown** |
| 9 | `pending_completion` | Computado Readiness | ❌ | ❌ **DESAPARECE del dropdown** |
| 10 | `inconsistent` | Computado Readiness | ❌ | ❌ NUNCA estuvo en dropdown — solo filtro de vista |
| 11 | `rechazado` | Huérfano | ❌ | ❌ **ELIMINAR** — Existe en badge UI (línea 818) pero NUNCA se genera |
| 12 | `closed` | Sinónimo huérfano | ❌ | ❌ **ELIMINAR** — Solo existe como sinónimo de `cerrado` en getReadinessState |
| 13 | `listo` | Sinónimo huérfano | ❌ | ❌ **ELIMINAR** — Solo existe como sinónimo de `ready` en getReadinessState |
| 14 | `aprobado` | Otro módulo | ❌ (despachos) | ❌ **ELIMINAR de despachos** — Pertenece a inventarios |
| 15 | `activo` | Otro módulo | ❌ (despachos) | ❌ **ELIMINAR de despachos** — Pertenece a productos |

### 4.2 Modelo definitivo de estados

**Estados que sobreviven (5 persistentes):**
```
pendiente  →  en_proceso  →  completado  →  approved  →  cerrado
```

**Estados del sistema — computados, NUNCA persistir:**
```
draft / validated / ready / pending_completion / inconsistent
```

**Estados que desaparecen — huérfanos:**
```
rechazado / closed / listo / aprobado / activo
```

### 4.3 Regla de gobernanza de estados (SSOT)

> **REGLA CERTIFICADA:** El campo `record.estado` SOLO puede contener los 5 valores persistentes. Los estados del Readiness Engine son propiedades computadas en memoria y NUNCA deben escribirse en la base de datos.

---

## FASE 5 — UX Governance

### 5.1 Separación de responsabilidades UX

| Mecanismo | Responsabilidad | Quién lo usa |
|-----------|-----------------|--------------|
| Dropdown | Estados de **trabajo** (pendiente, en_proceso, completado) | Operativo |
| Botón Aprobar | **Transición supervisada** con precondición | Calidad / Admin |
| Botón Cerrar | **Cierre controlado** con precondición | Calidad / Admin |
| Botón Reabrir | **Reversión de cierre** con precondición | Admin |
| Botones Export | **Salida de datos** | Admin / Calidad |
| Botón Eliminar | **Destrucción de registro** | Admin |

### 5.2 Problemas UX identificados

| # | Problema | Severidad |
|---|----------|-----------|
| 1 | El dropdown muestra `draft`, `validated`, `ready` — el usuario no sabe qué son | Alta |
| 2 | El dropdown permite seleccionar `approved` sin validación de precondición | Alta |
| 3 | El dropdown permite seleccionar `cerrado` sin validación de precondición | Alta |
| 4 | El botón "Reabrir" vuelve el estado a `validated` — estado que el usuario nunca ve | Media |
| 5 | El badge muestra `rechazado` en gris genérico — estado que NUNCA ocurre | Baja |

---

## FASE 6 — Separación Sistema/Usuario

### ¿Qué reglas pertenecen al usuario?
- Cambiar `estado` entre `pendiente`, `en_proceso`, `completado` (dropdown)
- Iniciar acciones "Aprobar", "Cerrar", "Reabrir" (si cumple precondiciones)
- Exportar, Eliminar, Crear, Editar, Importar

### ¿Qué reglas pertenecen al sistema?
- Si un registro puede ser aprobado (`canApprove` — score + inconsistencias)
- Si un registro puede ser cerrado (`canClose` — estado == 'approved')
- Si un registro puede reabrirse (`canReopen` — estado == 'cerrado' || 'approved')
- El estado inicial en creación (`setDefault: 'pendiente'`)
- Los estados de readiness en tiempo real (draft/validated/ready/pending_completion/inconsistent)

### Brecha crítica confirmada

> **EVIDENCIA DIRECTA:** Los métodos `approveRecords`, `closeRecords` y `reopenRecords` del Orchestrator (líneas 208-241) NO invocan `canApprove`, `canClose`, ni `canReopen`. Las validaciones solo existen en el UI Runtime. Cualquier llamada directa al Orchestrator bypasea estas reglas.

---

## FASE 8 — Entregables Certificados

### 8.1 Estados que sobreviven
```
1. pendiente      → Estado inicial del usuario
2. en_proceso     → Estado de trabajo activo del usuario
3. completado     → Antesala a aprobación
4. approved       → Resultado de la acción "Aprobar"
5. cerrado        → Estado terminal (reversible vía Reabrir)
```

### 8.2 Estados que desaparecen
```
Del dropdown (options en Registry):
- draft / validated / ready / approved / cerrado

Como destino de Reopen (Orchestrator):
- validated → reemplazar por 'en_proceso'

Del badge UI (Runtime línea 818):
- rechazado → estado huérfano, nunca generado

De getReadinessState (OperationalDataCompletion.js):
- closed / listo → sinónimos innecesarios
```

### 8.3 Botones que sobreviven: TODOS

### 8.4 Botones que desaparecen: NINGUNO

### 8.5 Acciones duplicadas

| Duplicidad | Solución |
|------------|----------|
| Dropdown `approved` + botón "Aprobar" | Eliminar `approved` del dropdown |
| Dropdown `cerrado` + botón "Cerrar" | Eliminar `cerrado` del dropdown |

### 8.6 Elementos del dropdown que permanecen
```
1. pendiente
2. en_proceso
3. completado
```

### 8.7 Elementos del dropdown que desaparecen
```
1. draft
2. validated
3. ready
4. approved  (duplicidad con botón Aprobar)
5. cerrado   (duplicidad con botón Cerrar)
```

### 8.8 Flujo operacional definitivo
```
CREACIÓN → pendiente → en_proceso → completado → [Aprobar] → approved → [Cerrar] → cerrado
                           ↑                                                           │
                           └─────────────── [Reabrir] ───────────────────────────────┘
```

### 8.9 Reglas del usuario
```
1. Puede cambiar estado: pendiente / en_proceso / completado
2. Puede iniciar "Aprobar" (el sistema valida precondición)
3. Puede iniciar "Cerrar" (el sistema valida precondición)
4. Puede iniciar "Reabrir" (el sistema valida precondición)
5. Puede Exportar, Eliminar, Crear, Editar, Importar sin restricciones de lifecycle
```

### 8.10 Reglas del sistema
```
1. canApprove: score == 100% AND errors.length == 0 AND inconsistencies.length == 0
2. canClose:   estado == 'approved'
3. canReopen:  estado == 'cerrado' OR estado == 'approved'
4. estado inicial: automationRule setDefault('pendiente') en creación
5. readiness states: solo en memoria, NUNCA persistir en DB
```

---

## Plan de Acción para Sprint 132.2

| # | Cambio | Severidad | Archivo | Línea |
|---|--------|-----------|---------|-------|
| 1 | Reducir `options` dropdown de 8 a 3 | **ALTA** | `OperationalExperienceRegistry.js` | 189 |
| 2 | Cambiar destino `reopenRecords` de `'validated'` a `'en_proceso'` | **ALTA** | `OperationalExperienceLifecycleOrchestrator.js` | 236 |
| 3 | Mover `canApprove` al Orchestrator | **ALTA** | `OperationalExperienceLifecycleOrchestrator.js` | 208-218 |
| 4 | Mover `canClose` al Orchestrator | **ALTA** | `OperationalExperienceLifecycleOrchestrator.js` | 220-230 |
| 5 | Mover `canReopen` al Orchestrator | **ALTA** | `OperationalExperienceLifecycleOrchestrator.js` | 232-242 |
| 6 | Agregar `EventBus.publish` en operaciones bulk | **MEDIA** | `OperationalExperienceLifecycleOrchestrator.js` | Múltiple |
| 7 | Eliminar badge `rechazado` | **BAJA** | `UniversalOperationalRuntime.jsx` | 818 |
| 8 | Eliminar sinónimos `closed` y `listo` de `getReadinessState` | **BAJA** | `OperationalDataCompletion.js` | 119-121 |

---

## Certificación

> **Sprint 132.1 — LEVEL 3 — GOVERNANCE AUDIT COMPLETE**
>
> El modelo operacional definitivo del ciclo de vida de un registro en el SGC-DM ha sido identificado, documentado y certificado. Los Sprints 132.2 y 132.3 pueden proceder a implementación con plena autoridad arquitectónica.

---

*Auditoría completada: Julio 2026 · Branch: operativo-v1 · 0 archivos modificados · 1 documento de auditoría producido*
