# Sprint 95 — Operational Experience Contract SSOT Certification

**Tipo:** Operational Experience SSOT Architecture Certification
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 91, Sprint 94
**Branch:** `operativo-v1`
**Build:** 0 errores, 2702 módulos, 2.31s
**Archivos modificados:** 3

---

## Objetivo

Certificar el Operational Experience Contract como la **única fuente oficial de conocimiento operacional** del SGC-DM. Toda experiencia futura se declara mediante un contrato descriptivo reutilizable, no mediante lógica distribuida.

## Problema arquitectónico

El conocimiento operacional estaba fragmentado en múltiples propiedades sueltas dentro del Registry:

```js
// ANTES — conocimiento distribuido
registry.expose('canonicalFields')      // suelto
registry.expose('synonyms')             // suelto
registry.expose('fieldNormalizers')     // suelto
// futuras propiedades seguirían creciendo
```

Cada nueva regla (validation, audit, export) requería una nueva propiedad expuesta. El pipeline conocía demasiado sobre la estructura interna del Registry.

## Filosofía certificada

```
ONE EXPERIENCE = ONE CONTRACT = ONE SOURCE OF TRUTH
```

El pipeline **nunca** conoce: Despachos, Producción, Recepción, Inventarios.

El pipeline **únicamente** consume: `OperationalExperienceContract`.

## Cambios por archivo

### 1. `src/core/capabilities/experiences/OperationalExperienceRegistry.js`

**Descriptor unificado en contrato SSOT:**

```js
registerExperience({
  experienceKey: 'dispatches',
  metadata: {
    name: 'Despachos',
    description: '...',
    icon: 'Truck',
    version: '1.0',
  },
  capabilities: {
    supportsImport: true,
    supportsExport: true,
    supportsAudit: true,
    supportsDashboard: true,
  },
  documentContract: {
    canonicalFields: ['fecha', 'hora', 'cliente', ...],
    synonyms: { fecha: ['fecha', 'fec', ...], ... },
    fieldNormalizers: { fecha: toYmd, hora: toHm, ... },
  },
  validationRules: {},   // futuro
  auditRules: {},        // futuro
  exportRules: {},       // futuro
  resolveComponent: () => import('...'),
});
```

**API simplificada:**

| Antes | Después |
|-------|---------|
| `getExperienceNormalizationContract(key)` → `{ canonicalFields, synonyms, fieldNormalizers }` | `getExperienceContract(key)` → `{ metadata, capabilities, documentContract, validationRules, auditRules, exportRules }` |
| 3 propiedades expuestas sueltas | 1 contrato SSOT |

### 2. `src/services/import/operationalDataExtractionLayer.js` — Universal Normalizer

**Firma simplificada:**

```js
// ANTES — recibía props sueltas
normalizeOperationalData({ parsedDocument, canonicalFields, synonyms, fieldNormalizers })

// DESPUÉS — recibe el contrato completo
normalizeOperationalData({ parsedDocument, contract })
```

El normalizador desestructura `contract.documentContract` internamente. Nunca crece — siempre acepta el mismo contrato.

### 3. `src/utils/dispatchesExcel.js`

```js
// ANTES
const contract = Registry.getExperienceNormalizationContract('dispatches');
normalizeOperationalData({ parsedDocument, canonicalFields, synonyms, fieldNormalizers });

// DESPUÉS
const contract = Registry.getExperienceContract('dispatches');
normalizeOperationalData({ parsedDocument, contract });
```

## Pipeline oficial

```
Operational Experience
  ↓
Operational Experience Contract (SSOT)
  ↓ metadata, capabilities, documentContract, validationRules, auditRules, exportRules
Universal Import Pipeline
  ↓ parseDocument()
Universal Normalizer
  ↓ normalizeOperationalData({ parsedDocument, contract })
Runtime (agnóstico del dominio)
  ↓
Persistence / Dashboard / Export Engine / Audit Layer
```

## Beneficios certificados

| Aspecto | Antes | Después |
|---------|-------|---------|
| Nueva experiencia | crear canonicalFields + synonyms + normalizers + reglas sueltas | crear `ExperienceContract.js` — FIN |
| Multiempresa | contrato distribuido | `Empresa A → Dispatches Contract`, `Empresa B → Dispatches Contract` |
| ERP Ready | lógica ERP en código | `SAP → PurchaseOrdersContract → Universal Pipeline` |
| AI Ready | inspeccionar código | leer `contract.json` completo |

## Principios certificados

| Principio | Aplicación |
|-----------|-----------|
| REUSE FIRST | Pipeline reutilizado sin cambios |
| ONE EXPERIENCE ONE CONTRACT | ✅ Certificado |
| SINGLE SOURCE OF TRUTH | ✅ Certificado |
| ZERO NEW RUNTIMES | ✅ |
| ZERO NEW BUILDERS | ✅ |
| UNIVERSAL PIPELINE | ✅ `normalizeOperationalData({ parsedDocument, contract })` |
| MULTI COMPANY READY | ✅ Contrato intercambiable por empresa |
| ERP READY | ✅ Contrato intercambiable por ERP |
| AI READY | ✅ Contrato legible sin inspeccionar código |
| DOCUMENT INTELLIGENCE FIRST | ✅ |
| OPERATIONAL EXPERIENCE FIRST | ✅ |
| SCALABILITY FIRST | ✅ Nueva experiencia = nuevo contrato, cero cambios en pipeline |

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Registry expone `getExperienceContract()` como única fuente | ✅ `getExperienceNormalizationContract` eliminado |
| 2 | Contrato unificado: metadata + capabilities + documentContract + validationRules + auditRules + exportRules | ✅ |
| 3 | Pipeline consume contrato sin conocer el dominio | ✅ `normalizeOperationalData({ parsedDocument, contract })` |
| 4 | Sin propiedades expuestas sueltas | ✅ canonicalFields/synonyms/fieldNormalizers ya no son props directas del descriptor |
| 5 | Registry reutilizado | ✅ Sin cambios en listExperiences, getExperience, resolveComponent |
| 6 | Import Engine reutilizado | ✅ Sin cambios |
| 7 | Runtime reutilizado | ✅ Sin cambios |
| 8 | Zero Experience Coupling | ✅ |
| 9 | Zero New Runtimes | ✅ |
| 10 | Zero New Builders | ✅ |
| 11 | AI Ready | ✅ Contrato completo autodescriptivo |
| 12 | LEVEL 3 Certification | ✅ Build 0 errores, 2702 módulos |
