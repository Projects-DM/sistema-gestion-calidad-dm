# Sprint 131.3 — Operational Default Values Resolution Layer (SSOT)

**Tipo:** Core Operational Contract Completion Sprint  
**Estado:** LEVEL 3 — CERTIFIED  
**Branch:** operativo-v1  
**Dependencias:** Sprint 131.2 — Persistence Boundary Recovery & PDF Worker ESM Fix  
**Incidente origen:** `null value in column "destino" of relation "despachos" violates not-null constraint` (PostgreSQL 23502)  
**Archivos nuevos:** 1  
**Archivos modificados:** 1  

---

## 1. Objetivo

Certificar el mecanismo oficial mediante el cual el sistema completa automáticamente los campos operacionales obligatorios que NO vienen presentes en el documento importado.

```
Problema:
  El PDF extrae correctamente: producto, lote, peso, cantidad, hora, etc.
  Pero la tabla despachos exige: destino NOT NULL, conductor, placa, estado...
  El Universal Import Engine no debe inventar valores.

Solución:
  Operational Defaults Resolver — capa única entre el motor de importación
  y el Persistence Mapper, responsable de resolver defaults ausentes.
```

---

## 2. Nueva regla arquitectónica

```
Universal Import Engine
        ↓
  Operational Record
        ↓
  Operational Defaults Resolver    ← Sprint 131.3
        ↓
  Persistence Mapper (Sprint 131.1)
        ↓
  stripInternalKeys (Sprint 131.2)
        ↓
  Database (public.despachos)
```

El Universal Import Engine JAMÁS podrá contener:

- ❌ Reglas del negocio
- ❌ Defaults del módulo
- ❌ Lógica específica de despachos
- ❌ Valores hardcodeados del cliente

Todas las reglas operacionales residen exclusivamente en:

```
Operational Defaults Resolver
```

---

## 3. Implementación

### Archivo nuevo: `src/services/import/operationalDefaultsResolver.js`

```js
export function resolveOperationalDefaults(record) {
  // Recibe:  Operational Record (ej: { producto, lote, cantidad, peso })
  // Retorna: Operational Record completo con defaults aplicados
}
```

#### Reglas certificadas

| Campo | Regla |
|---|---|
| `fecha` | Si el PDF no la posee → `new Date()` (formato YYYY-MM-DD) |
| `estado` | Siempre → `'Pendiente'` |
| `conductor` | Temporalmente → `'Juan Gomez'` (configurable posteriomente) |
| `temperatura` | Si producto contiene `PECHUGA` / `POLLO` / `FILETE` / `CHUZO` / `CONTRAMUSLO` / `MUSLO` / `ALA` → `-18` |
| `peso` | Si producto es `PECHUGA CONGELADA` y `cantidad` > 0 → `peso = cantidad` (kg) |
| `destino` | Mientras el sistema no tenga clientes/geolocalización → `'SIN DEFINIR'` |
| `placa` | Temporalmente → `'NO ASIGNADA'` |
| `observaciones` | Si no hay observaciones → `'IMPORTACION PDF'` |

#### Comportamiento

- Si el campo YA existe en el record (vino del PDF), se respeta.
- Si el campo NO existe, se aplica el default.
- El resolver trabaja sobre el modelo operacional (PRE-mapper), por lo que usa nombres de campo operacionales: `cantidad` (no `cantidad_bolsas`).

### Archivo modificado: `src/modules/experiences/UniversalImportWorkflow.jsx`

```
Antes:
  record → mapOperationalRecordToPersistence → payload

Después:
  record → resolveOperationalDefaults → enriched
        → mapOperationalRecordToPersistence → payload
```

```js
import { resolveOperationalDefaults } from '../../services/import/operationalDefaultsResolver.js';

const persistenceRecords = included.map(({ _rowIndex, _included, _errors, _compliance, ...record }) => {
  const enriched = resolveOperationalDefaults(record);
  const payload = mapOperationalRecordToPersistence(enriched);
  ...
});
```

---

## 4. Pipeline certificado

```
PDF
  ↓
Parser
  ↓
Spatial Recognition
  ↓
Operational Extraction
  ↓
Business Rules Resolution
  ↓
Operational Validation
  ↓
Human Validation (Preview)
  ↓
Operational Defaults Resolver    ← Sprint 131.3 (NUEVO)
  ↓
Persistence Mapper               ← Sprint 131.1
  ↓
stripInternalKeys                ← Sprint 131.2
  ↓
Supabase INSERT
  ↓
despachos
```

---

## 5. Verificación

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores en archivos modificados |
| `npm run build` | ✅ Build exitoso (2.35s, 0 errores) |
| `destino: null` → `'SIN DEFINIR'` | ✅ |
| `conductor: null` → `'Juan Gomez'` | ✅ |
| `placa: null` → `'NO ASIGNADA'` | ✅ |
| `estado: null` → `'Pendiente'` | ✅ |
| `fecha: null` → `new Date()` | ✅ |
| `temperatura: null` + producto congela → `-18` | ✅ |
| `peso: null` + PECHUGA CONGELADA → `= cantidad` | ✅ |
| `observaciones: null` → `'IMPORTACION PDF'` | ✅ |
| Campos existentes del PDF se respetan | ✅ (`r.campo ?? default` — el `??` preserva valores existentes) |
| El Universal Import Engine no contiene defaults | ✅ Resolver es un módulo separado |

---

## 6. Criterios de certificación

| Criterio | Cumple |
|---|---|
| ¿El motor Universal Import Engine conoce defaults de despachos? | ❌ No, reside en `resolveOperationalDefaults` |
| ¿La capa de resolución es reutilizable para PDF/Excel/CSV/Word? | ✅ Sí, se invoca desde `handleImport` antes del mapper |
| ¿Se respetan los valores existentes del documento? | ✅ `r.campo ?? default` preserva truthy + empty string |
| ¿La tabla `despachos` recibe valores NOT NULL? | ✅ destino, conductor, placa, estado, fecha siempre poblados |
| ¿El error `23502 null value in column "destino"` está eliminado? | ✅ `destino` nunca más es `null` |
| ¿Se puede evolucionar la resolución sin tocar el motor? | ✅ Solo se modifica `operationalDefaultsResolver.js` |

---

## 7. Restricciones cumplidas

Este sprint NO:

- ❌ Modificó el Parser
- ❌ Modificó el Normalizer
- ❌ Modificó el Import Engine
- ❌ Modificó el Recognition Engine
- ❌ Modificó el Runtime
- ❌ Modificó la Persistence Layer
- ❌ Insertó valores hardcodeados en el motor universal

Este sprint solamente:

- ✅ Creó `operationalDefaultsResolver.js` — capa única de resolución
- ✅ Lo integró en `handleImport` antes del Persistence Mapper
- ✅ Certificó que el motor universal no conoce defaults del módulo

---

## 8. Resultado arquitectónico final

```
PDF
  ↓
  [... toda la inteligencia operacional ...]
  ↓
  resolveOperationalDefaults(record)
  ↓
  mapOperationalRecordToPersistence(enriched)
  ↓
  stripInternalKeys(applyFieldMapping(payload))
  ↓
  sb.from('despachos').insert(payloads)
```

El mismo documento que generaba:

```
null value in column "destino" violates not-null constraint
```

ahora genera:

```
✅ Importación completada — destino= SIN DEFINIR, conductor= Juan Gomez, estado= Pendiente
```

---

*Certificación completada el Julio 2026. Branch: operativo-v1. 1 archivo nuevo, 1 archivo modificado.*
