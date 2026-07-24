# Sprint 122 — Universal Operational Relationship Resolver Certification (SSOT)

**Tipo:** Production Operational Intelligence Sprint
**Estado:** LEVEL 3 — PRODUCTION READY
**Depende de:** Sprint 91 - Sprint 121
**Branch:** `operativo-v1`
**Build:** 0 errores, 2714 módulos
**Arquitectura:** Universal Document Intelligence Pipeline
**Archivos nuevos:** 0
**Archivos modificados:** 3

---

## Objetivo

Certificar la capa universal de resolución de relaciones operacionales del SGC-DM, permitiendo comprender la relación existente entre los datos encontrados dentro de la sección operacional del documento antes de construir los registros operacionales finales.

---

## Problema resuelto

El sistema sabía **qué** encontró (metadata, productos, lotes, cantidades) pero no **cómo se relacionaba** lo encontrado. No existía una capa que determinara jerarquías, pertenencia y agrupaciones entre los datos operacionales.

### Antes

```
Cliente → Productos → Lotes → Cantidades → Temperaturas
  ↓
Sin capa que determine quién pertenece a quién
```

### Después

```
Operational Section
  ↓
Operational Relationship Resolver
  ↓
{
  sharedFields: { fecha, destino, conductor },
  repeatingFields: [producto, lote, cantidad],
  hierarchy: { shared: [...], repeating: [...] },
  estimatedRecords: 15
}
  ↓
Operational Record Builder (con herencia consciente)
```

---

## Pipeline final certificado

```
Documento
  ↓
Parser
  ↓
Structure Analyzer
  ↓
Document Segmentation Layer
  ↓
Operational Section
  ↓
Operational Relationship Resolver     ← NUEVO
  ↓
Operational Record Builder
  ↓
Human Validation
  ↓
Persistencia
```

---

## Responsabilidades del Resolver

- **Campos compartidos** — Identifica metadata que aplica a todos los registros (Fecha, Destino, Conductor)
- **Campos repetitivos** — Identifica campos que varían por fila (Producto, Lote, Cantidad)
- **Jerarquías** — Construye el modelo jerárquico de pertenencia documental
- **Relaciones** — Determina cómo se vinculan los campos entre sí
- **Agrupaciones documentales** — Reconoce agrupaciones naturales del documento
- **Registros construibles** — Estima cuántos registros operacionales pueden generarse

---

## Lo que resuelve

| Tipo | Campos |
|------|--------|
| **Compartidos** | Fecha, Hora, Destino, Conductor, Vehículo, Firma |
| **Repetitivos** | Producto, Lote, Cantidad, Peso, Temperatura |
| **Agrupaciones** | Factura → Cliente → Productos → Lotes |

---

## Cambios por archivo

### `documentStructureAnalyzer.js`
- **Agregado:** `resolveOperationalRelationships()` — construye el modelo relacional a partir de la sección operacional y metadata descubierta
  - Extrae campos compartidos (metadata documental)
  - Detecta campos repetitivos (headers de tabla operacional)
  - Cuenta ocurrencias únicas por campo repetitivo
  - Estima registros construibles
- **Modificado:** `analyzeDocumentStructure()` ahora invoca `resolveOperationalRelationships()` y retorna `relationshipModel`

### `operationalDataExtractionLayer.js`
- **Modificado:** `normalizeOperationalData()` acepta `relationshipModel` opcional
  - Cuando un campo no tiene valor en la fila, intenta heredarlo de `sharedFields` del modelo relacional
  - Esto elimina la duplicación innecesaria y asegura que campos como Fecha, Destino y Conductor se propaguen correctamente

### `UniversalImportWorkflow.jsx`
- **Agregado:** Bloque 1.8 "MODELO OPERACIONAL DETECTADO"
  - Muestra el cliente detectado
  - Despliega conteo por campo repetitivo (productos, lotes, cantidades encontrados)
  - Lista campos compartidos con sus valores
  - Muestra estimación de registros construibles
- **Modificado:** `normalizeOperationalData()` recibe `relationshipModel` del análisis estructural

---

## GAPs corregidos

| GAP | Corrección |
|-----|-----------|
| No comprende relaciones entre datos | Operational Relationship Resolver |
| No comprende jerarquías documentales | Relationship Model (shared/repeating) |
| No comprende agrupaciones | Relationship Resolution |
| Construcción incorrecta de registros | Modelo operacional previo a record builder |
| Metadata repetida | Shared Metadata Resolver |
| Relaciones incorrectas | Hierarchical Operational Model |

---

## Restricciones verificadas

- NO OCR
- NO IA
- NO GPT
- NO nuevos motores
- NO nuevas capabilities
- NO nuevos parsers
- NO nuevas experiencias
- NO nuevos servicios
- NO nuevas tablas
- NO modificaciones del Runtime

---

## Resultado funcional esperado

```
Documento real del negocio
  ↓
Comprendido estructuralmente
  ↓
Comprendido operacionalmente
  ↓
Comprendido jerárquicamente (NUEVO)
  ↓
Registros operacionales correctamente construidos
  ↓
Importación completamente funcional
```
