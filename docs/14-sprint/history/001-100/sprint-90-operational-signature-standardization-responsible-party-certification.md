# Sprint 90 — Operational Signature Standardization & Responsible Party Certification

**Tipo:** Operational Document Contract Certification
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 89 — Compliance Traceability & Audit Pipeline Certification
**Branch:** `operativo-v1`
**Build:** 0 errores, 2701 módulos, 2.23s
**Archivos modificados:** 1 (`structureDetector.js`, +1 / -3 líneas)

---

## Objetivo

Certificar el contrato documental mínimo obligatorio del SGC-DM: todo formulario operacional importado finaliza con una única firma denominada **Responsable**.

## Problema

Los documentos operacionales importados contenían múltiples variantes de firma:

- Firma, Verifica, Verificación, Responsable, Inspector, Aprobó, Autorizó, Realizado por, Elaborado por, Firma del operario, etc.

Esto generaba inconsistencias documentales, diferentes contratos operacionales, formularios sin firma, firmas duplicadas y ambigüedad en la trazabilidad del responsable.

## Nueva filosofía

El documento original **deja de ser la autoridad documental**. La autoridad pasa a ser el **contrato certificado del SGC-DM**.

## Cambio

### Antes (Sprint 88-89)

```js
const hasSignature = fields.some(f => f.fieldType === 'signature');
fields = fields.filter(f => f.fieldType !== 'signature');
if (hasSignature) {
  fields.push({ label: 'Verifica', fieldType: 'signature', ... });
}
```

Comportamiento:
- Detectaba si existía alguna firma en el documento
- Eliminaba todas
- Solo si existía al menos una, añadía "Verifica"

### Después (Sprint 90)

```js
fields = fields.filter(f => f.fieldType !== 'signature');
fields.push({ label: 'Responsable', fieldType: 'signature', required: true, orderIndex: 0, options: {} });
```

Comportamiento:
- Elimina **todas** las firmas detectadas (haya 0, 1 o muchas)
- **Siempre** añade "Responsable" como último campo
- Es obligatorio por defecto

## Reglas del contrato

| Regla | Descripción |
|-------|-------------|
| 1 — Firma única | Solo existe "Responsable". Se eliminan: Verifica, Firma, Supervisor, Inspector, Autorizó, Aprobó, etc. |
| 2 — Firma obligatoria | Todo formulario importado contiene "Responsable" |
| 3 — Último campo | "Responsable" siempre es el último campo del formulario |
| 4 — Eliminación automática | Toda firma detectada en el documento original se elimina durante la importación |
| 5 — Inserción automática | Después de toda la clasificación documental, se inserta "Responsable" automáticamente |
| 6 — Builder reutilizado | El administrador puede eliminar "Responsable" en el Builder si el caso excepcional lo requiere |

## Flujo certificado

```
Documento importado
  │
  ├── Parser
  ├── Layout Detection
  ├── Pattern Recognition
  ├── Section Detection
  ├── Business Knowledge Engine
  ├── Eliminar TODAS las firmas detectadas ← NUEVO
  ├── Clasificar campos
  ├── Agregar "Responsable" al final ← NUEVO
  ├── Asignar último orderIndex
  │
  ▼
Visual Builder (administrador revisa)
  │
  ▼
Guardar formulario
```

## Ejemplo

### Documento original

```
Temperatura: [___]
pH: [___]
Firma Supervisor: [___]
Verifica: [___]
Inspector: [___]
```

### Resultado certificado

```
Temperatura: [___]
pH: [___]
Responsable: [___]  ← única firma, al final, obligatoria
```

## Principios

| Principio | Aplicación |
|-----------|-----------|
| **REUSE FIRST** | Se reutiliza el campo `signature` existente |
| **BUSINESS KNOWLEDGE FIRST** | El contrato SGC-DM tiene prioridad sobre el documento original |
| **DOCUMENT CONTRACT FIRST** | Todo formulario posee una única firma certificada |
| **ZERO NEW FIELD TYPES** | 0 tipos nuevos |
| **ZERO NEW COMPONENTS** | 0 componentes nuevos |
| **ZERO NEW TABLES** | 0 tablas nuevas |
| **ZERO NEW RUNTIME** | Runtime intacto |
| **HUMAN VALIDATION FIRST** | Admin puede eliminar en Builder si es necesario |

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Todas las firmas detectadas son eliminadas | ✅ `filter(f => f.fieldType !== 'signature')` |
| 2 | Responsable es agregado automáticamente | ✅ `fields.push({ label: 'Responsable', ... })` |
| 3 | Responsable es obligatorio por defecto | ✅ `required: true` |
| 4 | Responsable siempre es el último campo | ✅ `push` después de todo + `orderIndex = i + 1` |
| 5 | Se reutiliza el tipo signature existente | ✅ `fieldType: 'signature'` |
| 6 | No se crean nuevos componentes | ✅ 0 archivos nuevos |
| 7 | No se modifica la persistencia | ✅ Misma tabla, mismo runtime |
| 8 | Compatible con todos los formatos importados | ✅ Solo cambia la lógica post-clasificación |
| 9 | Admin puede eliminarlo manualmente | ✅ FromBuilder intacto |
| 10 | Build 0 errores | ✅ 2701 módulos, 2.23s |

**1 archivo modificado, +1 línea / −3 líneas.**
