# Sprint 113 — Dispatch Traceability Operational Activation (SSOT)

**Tipo:** Production Operationalization Sprint
**Estado:** LEVEL 3 — PRODUCTION READY
**Depende de:** Sprint 91 - Sprint 112
**Branch:** `operativo-v1`
**Build:** 0 errores, 2712 módulos
**Archivos nuevos:** 0
**Archivos modificados:** 2

---

## Objetivo

Activar la experiencia operacional de **Despachos** como la primera funcionalidad real utilizada por el negocio — conectar el contrato operacional existente con la experiencia visual y funcional que usará el usuario final.

Este sprint **NO crea nuevas capacidades**. Todo reusa el pipeline universal.

## Problema resuelto

**Antes:**
```
OperationalExperienceRegistry → Lista experiencias → Tarjetas genéricas → Usuario no puede operar
```

**Después:**
```
Experiencia Despachos → UniversalOperationalRuntime → Contrato dispatches v2.1
    ↓
Datos reales SAP importados vía synonyms
    ↓
Workspace operacional con KPIs, vistas, trazabilidad
    ↓
Operación diaria del negocio
```

## Cambios realizados

### 1. Contrato dispatches v2.0 → v2.1

| Propiedad | v2.0 | v2.1 |
|-----------|------|------|
| canonicalFields | 12 campos | 14 campos (+temperatura, +signature_estado) |
| tableFields | fecha, hora, cliente, producto, lote, cantidad, estado | +temperatura, destino, conductor |
| synonyms placa | — | +vehiculo |
| complianceRules | 3 reglas | 5 reglas (+temperatura > 8°C, < 0°C) |
| automationRules | 3 reglas | 4 reglas (+signature_estado default pending) |
| visibilityRules | 2 reglas | 4 reglas (+temperatura, +signature_estado) |
| dashboard highlight | 4 campos | 5 campos (+temperatura) |
| fieldDisplay placa | Placa | Vehículo / Placa |

#### Nuevos campos

| Campo | Tipo | Normalizer | Opciones | Propósito |
|-------|------|------------|----------|-----------|
| `temperatura` | number | toNumber | — | Control de cadena de frío en el despacho |
| `signature_estado` | text | — | pending, signed | Preparación futura para firma del conductor |

#### Synonyms SAP añadidos

| Campo | SAP synonyms |
|-------|-------------|
| temperatura | temp, temperatura producto, temperature, temp_c, temp_carga |
| placa | +vehiculo |
| signature_estado | firma, signature, firma conductor, signature_status |

#### Compliance rules de temperatura

| Regla | Severidad | Mensaje |
|-------|-----------|---------|
| temperatura > 8°C | warning | Temperatura superior a 8°C — riesgo de cadena de frío |
| temperatura < 0°C | warning | Temperatura bajo 0°C — posible congelación del producto |

### 2. Business Summary Cards (UniversalOperationalRuntime)

Nueva barra de KPIs operacionales en la parte superior del workspace:

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Total        │ Pendientes   │ En proceso   │ Completados  │ Alertas      │
│ Despachos    │              │              │              │              │
│ 150          │ 23           │ 12           │ 115          │ 3            │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

- **Total**: registros totales cargados
- **Pendientes**: estado pendiente o vacío
- **En proceso**: estado en_proceso
- **Completados**: completado o cerrado
- **Alertas**: inconsistentes + duplicados

Cada card tiene color distintivo (gris, amarillo, azul, verde, rojo). Aparece solo cuando hay registros.

### 3. Flujo de operación diaria

```
SAP
    ↓
Exportar .xlsx / .xls / .csv
    ↓
UniversalImportWorkflow (synonyms: matnr, kunnr, charg, lfimg, brgew, temp_c, vehiculo)
    ↓
Preview → Validar → Guardar
    ↓
Workspace Despachos
    ↓
Barra KPIs → Vistas → Filtros → Búsqueda → Selección múltiple
    ↓
Editar / Corregir datos (lote, producto, destino, conductor, temperatura)
    ↓
Trazabilidad por registro (CREADO → IMPORTADO → EDITADO → VALIDADADO → CERRADO)
    ↓
Exportar CSV / PDF para evidencia
```

### 4. Preparación para firma del conductor

El contrato incluye el campo `signature_estado` con opciones `['pending', 'signed']` y valor por defecto `pending`. No se implementa UI de firma — solo se deja preparada la evolución futura.

## Arquitectura final

```
Dispatch Experience Contract (v2.1)
          ↓
OperationalExperienceRegistry (certificado Sprint 106)
          ↓
UniversalOperationalRuntime (certificado Sprint 109+110+111)
          ↓
OperationalExperienceLifecycleOrchestrator (certificado Sprint 101)
          ↓
OperationalRecordsService (certificado Sprint 96)
          ↓
Tabla public.despachos (PostgreSQL)
```

## Restricciones verificadas

| Prohibición | Estado |
|-------------|--------|
| Nueva Capability | ❌ — capability certificada |
| Nueva Runtime | ❌ — reusa UniversalOperationalRuntime |
| Nuevo Import | ❌ — reusa UniversalImportWorkflow |
| Nuevo Dashboard | ❌ — reusa UniversalOperationalDashboard |
| Nuevo Service | ❌ — reusa OperationalRecordsService |
| Nuevo Orquestador | ❌ — reusa OperationalExperienceLifecycleOrchestrator |
| `DispatchRuntime` | ❌ — no creado |
| `DispatchDashboard` | ❌ — no creado |
| `DispatchService` | ❌ — no creado |
| `DispatchImportEngine` | ❌ — no creado |
| `DispatchWorkflow` | ❌ — no creado |

## Gap Discovery

### GAP-01: Falta campo temperatura para control de cadena de frío

**Categoría:** Production GAP
**Solución:** Añadido `temperatura` con normalizer toNumber, compliance rules (>8°C warning, <0°C warning), synonyms SAP.
**¿Requiere nueva capa universal?** NO
**Estado:** CORREGIDO

### GAP-02: Falta preparación para firma del conductor

**Categoría:** Evolution GAP
**Solución:** Añadido `signature_estado` con default 'pending', opciones ['pending', 'signed'].
**¿Requiere nueva capa universal?** NO
**Estado:** PREPARADO (no implementado)

### GAP-03: Usuario no ve KPIs operacionales al entrar

**Categoría:** UX GAP
**Solución:** Barra de 5 KPIs (Total, Pendientes, En proceso, Completados, Alertas) en la parte superior del workspace.
**¿Requiere nueva capa universal?** NO
**Estado:** CORREGIDO

## Resultado esperado

Al finalizar el Sprint 113, DM Distribuciones puede:

1. Entrar a **Despachos** desde el módulo operacional
2. Ver el workspace con KPIs, vistas, búsqueda y filtros
3. **Importar** archivos SAP con synonyms (MATNR → producto, KUNNR → cliente, CHARG → lote, LFIMG → cantidad, BRGEW → peso, TEMP_C → temperatura)
4. **Crear** despachos manualmente (fecha, cliente, producto, lote, cantidad, temperatura, destino, vehículo, conductor)
5. **Editar** registros (corregir lote, producto, destino, conductor, temperatura)
6. **Consultar trazabilidad** por registro (CREADO → IMPORTADO → EDITADO → VALIDADADO → CERRADO)
7. **Exportar** CSV o PDF como evidencia
8. **Preparar** evolución a firma del conductor

La aplicación deja de ser una arquitectura certificada y se convierte en una **herramienta operacional real**.
