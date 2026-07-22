# Sprint 83 — Business Knowledge Classification Engine

**Tipo:** Rule Engine Hardening
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 82 — Rule-Based Form Classification Engine
**Branch:** `operativo-v1`
**Build:** 0 errores, 2701 módulos, 2.25s

---

## Objetivo

Enseñar al sistema cómo piensa un formato de calidad. No mejorar el parser, no mejorar OCR, no mejorar IA. Insertar una capa de Business Knowledge que permita al motor clasificar campos por su **intención de negocio** y no por palabras aisladas.

## Filosofía

| Principio | Aplicación |
|-----------|------------|
| **Inspection Element** → boolean | Listas de verificación |
| **Measurement** → number | Temperatura, PPM, peso |
| **Comment** → textarea | Observaciones, hallazgos |
| **Approval** → signature | Verifica (único) |
| **Metadata** → ignore | Códigos, página, versión |
| **Runtime** → ignore | Fecha, hora, usuario |
| **Business Role** → exclude | Cargo, Responsable, Elaboró, Aprobó |

## Arquitectura

```
Documento
  ↓
Parser existente (documentParser.js)
  ↓
Structure Detector (structureDetector.js)
  ↓
Business Knowledge Engine   ← Sprint 83
  ↓
Visual Builder (FormBuilder.jsx)
  ↓
Administrador revisa
  ↓
Guardar (persistencia existente)
```

No cambia nada del flujo certificado. Solo se inserta una capa de inteligencia antes de que el formulario llegue al constructor visual.

---

## Las 10 reglas de negocio

### Regla 1 — Listas de inspección

Si existen **5+** etiquetas consecutivas:
- Cortas (≤ 35 caracteres)
- Sin verbos operacionales
- Sin unidades de medida

→ Convertir automáticamente cada una en **Cumple / No Cumple** (boolean)

```
Área ingreso     → Cumple / No Cumple
Maquinaria       → Cumple / No Cumple
Paredes          → Cumple / No Cumple
Techo            → Cumple / No Cumple
Luminarias       → Cumple / No Cumple
Lavamanos        → Cumple / No Cumple
Puertas          → Cumple / No Cumple
Canecas          → Cumple / No Cumple
```

### Regla 2 — Eliminar códigos documentales

Patrones ignorados:
- `FO-*`, `PR-*`, `IN-*`, `RG-*`, `FR-*`, `DOC-*`
- `[A-Z]{2,4}-[A-Z]{2,4}-\d+`

```
FO-MT-001    → ignorado
PR-LIMP-01   → ignorado
IN-2024-001  → ignorado
```

### Regla 3 — Eliminar numeraciones

Números de 2 a 4 dígitos que aparecen solos:

```
001    → ignorado
002    → ignorado
04     → ignorado
05     → ignorado
```

### Regla 4 — Eliminar roles de negocio

Campos que **nunca** deben convertirse en campos del formulario:

| Término | Acción |
|---------|--------|
| Cargo | Excluir |
| Responsable | Excluir |
| Elaboró | Excluir |
| Preparó | Excluir |
| Aprobó | Excluir |
| Recibió | Excluir |
| Revisó | Excluir |
| Autorizó | Excluir |

### Regla 5 — Una única firma

Sin importar cuántos campos de firma/rol aparezcan en el documento, el resultado siempre será exactamente **un** campo:

```
Verifica
  ↓
signature
```

### Regla 6 — Checklist inteligente

Etiquetas cortas de inspección ya no se clasifican como `text`. El motor detecta bloques funcionales y fuerza el tipo `boolean` (Cumple / No Cumple).

### Regla 7 — Observaciones automáticas

Cuando existan **3+** checklists consecutivos, se agrega automáticamente un campo `Observaciones` (textarea, opcional) inmediatamente después del último checklist.

### Regla 8 — Required inteligente

| Tipo | required |
|------|----------|
| boolean (checklist) | **true** |
| number | **true** |
| text | **true** |
| select | **true** |
| signature | **true** |
| textarea | **false** |

### Regla 9 — Nombre de formulario

El motor identifica correctamente nombres como:

```
FORMATO DE LIMPIEZA     → OK
PLAN DE SANEAMIENTO     → OK
CONTROL DE TEMPERATURA  → OK
```

Pero ignora:

```
FO-MT-001       → se reemplaza por nombre de archivo
Página 1 de 1   → se limpia
Versión 2       → se limpia
Código FO-001   → se limpia
```

### Regla 10 — Business Knowledge

El motor ya no piensa en palabras. Piensa en la **intención del campo**:

| Intención | Tipo destino | Ejemplos |
|-----------|-------------|----------|
| Inspection Element | boolean | Maquinaria, Paredes, Techo |
| Measurement | number | Temperatura, PPM, pH |
| Comment | textarea | Observaciones, Hallazgos |
| Approval | signature | Verifica |
| Metadata | ignore | FO-001, Página |
| Runtime | ignore | Fecha, Usuario |
| Business Role | exclude | Cargo, Responsable |

---

## Cambios en el código

### Archivo modificado: `src/services/import/structureDetector.js`

| Cambio | Líneas | Descripción |
|--------|--------|-------------|
| `BUSINESS_ROLES` | — | Nueva lista de exclusión: Cargo, Responsable, Elaboró, Preparó, Aprobó, Recibió, Revisó, Autorizó |
| `DOCUMENT_METADATA` | — | Sin cambios estructurales, se eliminaron términos que ahora están en BUSINESS_ROLES |
| `TYPE_RULES` | — | Signature reducido a solo `firma` y `verifica`. Eliminadas reglas para responsable, revisó, aprobó, autorizó (ahora en BUSINESS_ROLES) |
| `OPERATIONAL_VERBS` | — | Nueva constante con verbos operacionales para detectar límites de bloques de inspección |
| `isBusinessRole()` | — | Nueva función que excluye roles de negocio |
| `isStandaloneNumber()` | — | Nueva función que ignora numeraciones documentales (001, 002, etc.) |
| `detectInspectionBlocks()` | — | Nueva función: detecta 5+ etiquetas cortas consecutivas y las fuerza a boolean |
| `cleanFormName()` | — | Nueva función que limpia el nombre sugerido eliminando códigos, páginas, versiones |
| `detectStructure()` | — | Flujo reorganizado: inspección → exclusión → clasificación → observaciones → signature collapse → required por tipo → orden |

### Flujo completo de `detectStructure`

```
rawHeaders
  ↓
buildColumnDefs()             ← fusiona pares C/NC, Sí/No
  ↓
detectInspectionBlocks()      ← 5+ cortas consecutivas → boolean
  ↓
for each colDef:
  isStandaloneNumber()?       → skip
  isDocumentMetadata()?       → skip (FO-*, PR-*, página, etc.)
  isRuntimeMetadata()?        → skip (fecha, hora, usuario)
  isBusinessRole()?           → skip (cargo, responsable, etc.)
  classify type               → TYPE_RULES / sample values
  ↓
3+ booleans consecutivos?    → insertar Observaciones tras el último
  ↓
¿Hay signature?              → eliminar todas, agregar una "Verifica"
  ↓
Asignar required por tipo     → solo textarea=false
  ↓
Asignar orderIndex            → 1..N
```

---

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Eliminar completamente códigos documentales (FO-*, PR-*, etc.) | ✅ `isDocumentMetadata()` + `cleanFormName()` |
| 2 | Ignorar numeraciones documentales (001, 002, etc.) | ✅ `isStandaloneNumber()` |
| 3 | Detectar listas de inspección y convertirlas en Cumple/No Cumple | ✅ `detectInspectionBlocks()` (5+ cortas consecutivas) |
| 4 | Mantener una única firma (Verifica) al final del formulario | ✅ Signature collapse + push al final |
| 5 | Eliminar Cargo, Responsable, Elaboró, Aprobó, etc. | ✅ `BUSINESS_ROLES` + `isBusinessRole()` |
| 6 | Marcar por defecto como obligatorios: boolean, number, text, select, signature | ✅ required por tipo |
| 7 | Mantener Observaciones como opcional | ✅ textarea → required=false |
| 8 | Conservar el orden original del documento | ✅ orden de columnDefs mantenido, signature al final |
| 9 | No crear nuevos componentes | ✅ 0 archivos nuevos |
| 10 | No modificar Runtime, Dynamic Forms, Builder ni persistencia | ✅ Solo structureDetector.js |
| 11 | Toda la lógica concentrada en el Business Knowledge Engine | ✅ 100% en structureDetector.js |
