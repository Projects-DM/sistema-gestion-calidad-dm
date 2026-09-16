# Sprint 112 — Operational Product Master Management (SSOT)

**Tipo:** Operationalization Sprint
**Estado:** LEVEL 3 — PRODUCTION READY
**Depende de:** Sprint 91 - Sprint 111
**Branch:** `operativo-v1`
**Build:** 0 errores, 2712 módulos
**Archivos nuevos:** 0
**Archivos modificados:** 3

---

## Objetivo

Registrar el **maestro de productos** (Product Master) como la quinta experiencia operacional — un catálogo centralizado de productos terminados, materias primas, empaques, insumos y suministros de DM Distribuciones.

El objetivo NO es crear nueva infraestructura, sino **registrar una nueva experiencia** bajo el contrato universal existente.

## Problema resuelto

**Antes:**
```
Cada módulo usa su propia lista de productos (hardcodeada o en Excel)
No hay un catálogo central de productos
Los nombres y códigos varían entre despachos, inventarios, producción y recepción
No hay trazabilidad sobre el ciclo de vida de un producto (activo/inactivo/descontinuado)
```

**Después:**
```
Product Master como experiencia operacional
    ↓
13 campos canónicos con synonyms SAP (matnr, maktx, mtart, matkl, meins, netpr, etc.)
Tipos: materia_prima, producto_terminado, empaque, insumo, suministro
Categorías: granos, lácteos, cárnicos, verduras, frutas, empaques, químicos, otros
Estados: activo, inactivo, descontinuado
Mismo pipeline universal: Import → Human Validation → Data Completion → Approve → Close
```

## Contrato registrado

### experienceKey: `productos`

| Propiedad | Valor |
|-----------|-------|
| metadata.name | Productos |
| metadata.icon | Package |
| metadata.version | 1.0 |
| persistence.tableName | productos |
| persistence.prefix | PROD |
| defaultOrder | 5 |

### canonicalFields (13)

```
codigo, nombre, descripcion, tipo, categoria,
unidad_medida, presentacion, especificaciones_calidad,
proveedor, precio, moneda, estado, observaciones
```

### SAP Synonyms incluidos

| Campo | Synonyms |
|-------|----------|
| codigo | matnr, material_code, sku, part_number |
| nombre | maktx, material_description, product_name |
| tipo | mtart, material_type |
| categoria | matkl, material_group, commodity |
| unidad_medida | meins, uom, base_unit |
| proveedor | lifnr, vendor, supplier |
| precio | netpr, unit_price, cost |
| moneda | waers, currency |
| estado | mmsta, material_status |

### validationRules

| Campo | Regla |
|-------|-------|
| codigo | required |
| nombre | required |
| tipo | required |
| unidad_medida | required |
| precio | min: 0 |

### complianceRules

| Regla | Severidad | Mensaje |
|-------|-----------|---------|
| precio > 0 | info | Producto con precio registrado |
| estado == inactivo | warning | Producto inactivo — verificar disponibilidad |
| estado == descontinuado | info | Producto descontinuado — no programar compras |

### dashboardRules

```
groupBy:  ['tipo', 'categoria', 'estado']
trendBy:  []
highlight: ['codigo', 'nombre', 'tipo', 'estado']
```

## Pipeline operacional

```
SAP / Excel / CSV
    ↓
Import (UniversalImportWorkflow — synonyms SAP)
    ↓
Human Validation (Sprint 97)
    ↓
Data Completion (Sprint 110) — score 0-100%
    ↓
Aprobación (Sprint 111)
    ↓
Cierre (Sprint 111)
    ↓
Dashboard — productos por tipo, categoría, estado
    ↓
Export CSV
```

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/core/capabilities/experiences/OperationalExperienceRegistry.js` | Registro del contracto `productos` con 13 campos, synonyms SAP, rules, UI config |
| `supabase/schema.sql` | CREATE TABLE `public.productos` con índices + RLS policy |

## Restricciones verificadas

| Prohibición | Estado |
|-------------|--------|
| Nueva Capability | ❌ — capability certificada (Sprint 106) |
| Nueva Runtime | ❌ — reusa `UniversalOperationalRuntime` |
| Nuevo Import | ❌ — reusa `UniversalImportWorkflow` |
| Nuevo Dashboard | ❌ — reusa `UniversalOperationalDashboard` |
| Nuevo Service | ❌ — reusa `operationalRecordsService` |
| Nuevo Orquestador | ❌ — reusa `OperationalExperienceLifecycleOrchestrator` |
| Lógica de dominio | ❌ — 0 líneas de lógica específica |

## Gap Discovery

### GAP-01: No existía un catálogo central de productos

**Categoría:** Functional GAP
**Solución:** Registrar experiencia `productos` con contrato completo.
**¿Requiere nueva capa universal?** NO (5ta experiencia, misma pipeline)
**Estado:** CORREGIDO

### GAP-02: No había synonyms SAP para maestro de materiales

**Categoría:** Import GAP
**Solución:** 13 campos con synonyms incluyendo matnr, maktx, mtart, matkl, meins, lifnr, netpr, waers, mmsta.
**¿Requiere nueva capa universal?** NO
**Estado:** CORREGIDO

## Resultado esperado

Al finalizar el Sprint 112, un usuario puede:
1. Gestionar el catálogo de productos desde el SGC-DM
2. Importar productos desde SAP/Excel usando synonyms (matnr → codigo, maktx → nombre, etc.)
3. Clasificar productos por tipo, categoría, unidad de medida
4. Controlar el ciclo de vida del producto (activo → inactivo → descontinuado)
5. Consultar el dashboard de productos agrupado por tipo/categoría/estado
6. Todo dentro del pipeline universal, sin código de dominio
