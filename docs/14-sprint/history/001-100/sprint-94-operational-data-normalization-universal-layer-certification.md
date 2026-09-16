# Sprint 94 — Operational Experience Data Normalization & Universal Intelligence Layer Certification

**Tipo:** Operational Experience Architecture & Universal Data Normalization Certification
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 91 — Operational Traceability Experience & Document Intelligence Certification
**Branch:** `operativo-v1`
**Build:** 0 errores, 2702 módulos, 2.26s
**Archivos modificados:** 3

---

## Objetivo

Certificar la capa universal de normalización operacional del SGC-DM, eliminando el acoplamiento entre el normalizador y la experiencia operacional "Despachos", permitiendo que cualquier Operational Experience futura reutilice el mismo pipeline documental.

## Problema arquitectónico

`normalizeDispatches()` estaba acoplada a la experiencia "Despachos" — contenía `CANONICAL_FIELDS` y `FIELD_SYNONYMS` hardcodeados. Cada nueva experiencia operacional (Recepción, Inventarios, Producción, Compras, Logística, Calidad, ERP) habría requerido su propio `normalizeInventory()`, `normalizeProduction()`, etc.

## Solución

Se refactorizó `normalizeDispatches()` → `normalizeOperationalData()`, función universal que recibe un **Operational Experience Contract** y opera sin conocimiento del dominio específico.

## Cambios por archivo

### 1. `src/services/import/operationalDataExtractionLayer.js` — Universal Normalizer

| Antes | Después |
|-------|---------|
| `normalizeDispatches(parsedDoc)` | `normalizeOperationalData({ parsedDocument, canonicalFields, synonyms, fieldNormalizers })` |
| `CANONICAL_FIELDS` y `FIELD_SYNONYMS` hardcodeados | Eliminados del archivo |
| 200 líneas | 155 líneas (-22%) |

**Nuevo contrato de la función universal:**

```js
normalizeOperationalData({
  parsedDocument,    // { rawHeaders, rawRows } del Import Engine
  canonicalFields,   // string[] — campos canónicos de la experiencia
  synonyms,          // { [field]: string[] } — sinónimos por campo
  fieldNormalizers,  // { [field]: (value) => any } — normalizadores de tipo opcionales
})
// => { rows: object[], matchedHeaders: object, missingHeaders: string[] }
```

**Responsabilidades certificadas:**
1. Detectar encabezados
2. Aplicar sinónimos
3. Normalizar tipos de datos (vía `fieldNormalizers`)
4. Construir registros operacionales
5. Entregar contrato estándar al Runtime

**Prohibiciones explícitas:**
- ❌ Persistencia
- ❌ UI
- ❌ CRUD
- ❌ Exportaciones
- ❌ ERP integrations
- ❌ Dashboard
- ❌ Business Rules
- ❌ Validaciones del Runtime

### 2. `src/core/capabilities/experiences/OperationalExperienceRegistry.js` — Normalization Contract

**Nuevos campos en el descriptor de experiencia:**

```js
registerExperience({
  experienceKey: 'dispatches',
  canonicalFields: ['fecha', 'hora', 'cliente', 'producto', 'lote', 'cantidad', 'peso', ...],
  synonyms: {
    fecha: ['fecha', 'fec', 'fecha despacho', ...],
    cliente: ['cliente', 'clientes', 'razon social', 'nit', 'comprador', ...],
    ...
  },
  fieldNormalizers: {
    fecha: toYmd,
    hora: toHm,
    cantidad: toNumber,
    peso: toNumber,
  },
  // ...
});
```

**Nuevo método:** `getExperienceNormalizationContract(experienceKey)` → `{ canonicalFields, synonyms, fieldNormalizers }`

### 3. `src/utils/dispatchesExcel.js` — Consume contrato del Registry

| Antes | Después |
|-------|---------|
| `import { normalizeDispatches, CANONICAL_FIELDS } from '...extractionLayer'` | `import { normalizeOperationalData } from '...extractionLayer'` + `import { OperationalExperienceRegistry } from '...registry'` |
| `normalizeDispatches(parsedDoc)` | `normalizeOperationalData({ parsedDocument, canonicalFields, synonyms, fieldNormalizers })` |
| Contrato hardcodeado | Contrato desde `registry.getExperienceNormalizationContract('dispatches')` |

## Pipeline oficial certificado

```
PDF / Excel / Word / CSV / ERP Export
  ↓
Import Engine (parseDocument)
  ↓ { headers, rows, rawRows, textContent }
Universal Operational Data Normalizer (normalizeOperationalData)
  ↓
Operational Experience Registry (getExperienceNormalizationContract)
  ↓ { canonicalFields, synonyms, fieldNormalizers }
Operational Records
  ↓
Runtime (DispatchesExperience / futuras experiencias)
  ↓
Dashboard / Audit / Exports / Document Repository
```

## Operational Experience Contract

Toda experiencia operacional define únicamente:

```js
{
  experience: "dispatches",       // identificador único
  canonicalFields: [...],          // campos canónicos
  synonyms: {...},                 // sinónimos multi-idioma
  fieldNormalizers: {...},         // normalizadores de tipo opcionales
  parsedDocument                   // documento ya interpretado por Import Engine
}
```

La experiencia NO implementa: Parser, Normalizer, CRUD, Dashboard, Export, Import, Persistence.

## Principios certificados

| Principio | Aplicación |
|-----------|-----------|
| REUSE FIRST | Pipeline documental reutilizado sin cambios |
| UNIVERSAL NORMALIZATION | `normalizeOperationalData()` única para todas las experiencias |
| ZERO EXPERIENCE COUPLING | No existe lógica exclusiva por experiencia en el normalizador |
| ZERO NEW RUNTIMES | Runtime reutilizado |
| ZERO NEW BUILDERS | Builder reutilizado |
| ZERO NEW TABLES | Persistencia reutilizada |
| OPERATIONAL EXPERIENCE FIRST | Experiencias solo describen conocimiento de negocio |
| DOCUMENT INTELLIGENCE FIRST | Import Engine entiende documentos |
| FUTURE ERP READY | Sin reglas por ERP |
| MULTI COMPANY READY | Sin reglas por cliente |
| SCALABILITY FIRST | Nueva experiencia = nuevo contrato en Registry, cero código nuevo en pipeline |

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Universal Operational Data Normalizer certificado | ✅ `normalizeOperationalData()` acepta contrato genérico |
| 2 | Operational Experience Contract certificado | ✅ `{ canonicalFields, synonyms, fieldNormalizers, parsedDocument }` |
| 3 | Canonical Fields Architecture certificada | ✅ Registry almacena canonicalFields por experiencia |
| 4 | Operational Experience Registry reutilizado | ✅ `getExperienceNormalizationContract()` expuesto |
| 5 | Zero Experience Coupling | ✅ `normalizeDispatches()` eliminado |
| 6 | Import Engine reutilizado | ✅ dispatchesExcel.js usa `parseDocument()` |
| 7 | Runtime reutilizado | ✅ DispatchesExperience sin cambios |
| 8 | Dashboard reutilizado | ✅ Sin cambios |
| 9 | Export Engine reutilizado | ✅ Sin cambios |
| 10 | Document Repository reutilizado | ✅ Sin cambios |
| 11 | Multi Company Ready | ✅ Sin reglas por origen documental |
| 12 | Future ERP Ready | ✅ Normalizador no conoce ERP específicos |
| 13 | Zero New Runtimes | ✅ |
| 14 | Zero New Builders | ✅ |
| 15 | LEVEL 3 Certification | ✅ Build 0 errores, 2702 módulos |
