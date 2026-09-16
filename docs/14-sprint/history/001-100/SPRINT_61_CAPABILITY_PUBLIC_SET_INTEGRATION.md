# SPRINT 61 — Capability Public Set Integration with DynamicModule (Evidence)

> **Tipo:** Core Implementation / Runtime Integration / Capability Driven UI
>
> **Nivel:** LEVEL 3 — CAPABILITY DRIVEN RUNTIME
>
> **Estado:** DYNAMIC MODULE CAPABILITY DRIVEN CERTIFIED

---

## 0) Objetivo

Realizar la primera integración real entre el `ModuleCapabilityResolver` y `DynamicModule`, estableciendo al **Capability Public Set** como la única fuente de verdad para construir la interfaz dinámica de los módulos.

---

## 1) Implementación entregada

### Nuevos archivos (Core — Capability Public Layer)

| Archivo | Responsabilidad |
|---------|----------------|
| `src/core/capabilities/public/CapabilityPublicSetAdapter.js` | Adapter transitorio que implementa exactamente la misma interfaz pública que `CapabilityPersistenceProvider` |
| `src/core/capabilities/public/CapabilityPublicSet.js` | Contrato público oficial del Capability Set expuesto al Runtime |
| `src/core/capabilities/public/useCapabilityPublicSet.js` | Hook React de integración entre DynamicModule y el Core |

### Archivo modificado (Runtime)

| Archivo | Cambio |
|---------|--------|
| `src/pages/DynamicModule.jsx` | Refactorizado como Core Standard Shell capability-driven puro |

---

## 2) Pipeline materializado

```text
Platform Governance
        │
        ▼
CapabilityPersistenceProvider (futuro Sprint 62)
        │        ▲
        │    CapabilityPublicSetAdapter (Sprint 61 — misma interfaz)
        ▼
ModuleCapabilityResolver
        │
        ▼
Capability Public Set  ← ÚNICA fuente de verdad para DynamicModule
        │
        ▼
useCapabilityPublicSet (hook React)
        │
        ▼
DynamicModule
        │
        ▼
Dynamic Forms / DynamicRecordsView / ModuleDocumentViewer
```

---

## 3) Interfaz pública del CapabilityPublicSetAdapter

El adapter implementa **exactamente** la misma interfaz pública que tendrá el futuro `CapabilityPersistenceProvider`:

```js
// Método 1 — consumido por ModuleCapabilityResolver
adapter.listAssignmentsByModuleId({ moduleId }) → Promise<Assignment[]>

// Método 2 — consumido por ModuleCapabilityResolver y useCapabilityPublicSet
adapter.getPackageById({ packageId }) → Promise<Package | null>
```

### Migración Sprint 62 (cero cambios en DynamicModule / useCapabilityPublicSet / ModuleCapabilityResolver)

```js
// Sprint 61 (hoy)
const provider = new CapabilityPublicSetAdapter({ moduleSlug });

// Sprint 62+
const provider = new CapabilityPersistenceProvider({ repositories });
```

---

## 4) Standard Capability Packages definidos

| packageId | capabilityKey | label | Disponibilidad |
|-----------|--------------|-------|---------------|
| `pkg:standard:forms` | `forms` | Diligenciar Registros | Siempre activo |
| `pkg:standard:records` | `records` | Historial y Consultas | Siempre activo |
| `pkg:standard:repository` | `repository` | Repositorio Documental | Condicional (repositorios activos) |

---

## 5) Decisiones de UI eliminadas de DynamicModule

### Antes (Sprint 60.6)
```js
// ❌ Consulta directa a documentRepositoriesService en DynamicModule
const repos = await documentRepositoriesService.getRepositories({ moduleSlug });
const available = (repos || []).some((r) => r.is_active !== false);

// ❌ Condición hardcodeada
const isRepositorioTabAvailable = repositoryAvailability.available;
```

### Después (Sprint 61)
```js
// ✅ Una sola fuente de verdad
const { capabilityPublicSet } = useCapabilityPublicSet({ moduleSlug, moduleId: modInfo?.id });

// ✅ Tabs construidas dinámicamente desde el Capability Public Set
const tabs = capabilityPublicSet?.getTabs() ?? [];
```

---

## 6) Desacoplamiento verificado

| Verificación | Resultado |
|-------------|-----------|
| DynamicModule importa `documentRepositoriesService` | ❌ Eliminado |
| DynamicModule hace decisiones basadas en `moduleSlug` | ❌ Eliminado |
| DynamicModule importa `CapabilityPublicSetAdapter` | ❌ Nunca lo conoce |
| DynamicModule importa `ModuleCapabilityResolver` | ❌ Nunca lo conoce |
| DynamicModule solo lee `useCapabilityPublicSet` | ✅ Único canal |
| UI construida exclusivamente desde `capabilityPublicSet.getTabs()` | ✅ Certificado |

---

## 7) Reutilización de infraestructura certificada

Los siguientes componentes se reutilizaron **íntegramente sin modificación**:

- `ModuleCapabilityResolver` (Sprint 60)
- `CapabilitySetBuilder` (Sprint 60)
- `DependencyResolutionEngine` (Sprint 60)
- `NormalizationEngine` (Sprint 60)
- `CapabilitySetStructuralValidation` (Sprint 60)
- `CapabilityDiscovery` (Sprint 56)
- `CapabilityRegistry` (Sprint 55)

---

## 8) Compatibilidad con sprints anteriores

| Sprint | Compatibilidad |
|--------|---------------|
| Sprint 56 (Repository Capability) | ✅ Sin regresiones |
| Sprint 57 (Capability Framework) | ✅ Sin regresiones |
| Sprint 58 (Persistence Architecture) | ✅ Sin regresiones |
| Sprint 59 (Persistence Layer) | ✅ Sin regresiones |
| Sprint 60 (ModuleCapabilityResolver) | ✅ Consumido por primera vez |
| Sprint 60.5 / 60.6 | ✅ Sin regresiones |

---

## 9) Preparación para Sprint 62

La infraestructura queda lista para que Sprint 62 implemente el `CapabilityPersistenceProvider` real (con repositorios Supabase) sin modificar ninguno de los siguientes archivos:

- `DynamicModule.jsx`
- `useCapabilityPublicSet.js`
- `CapabilityPublicSet.js`
- `ModuleCapabilityResolver.js`

Solo se requiere:

1. Implementar los repository stubs de Sprint 59
2. Cambiar UNA línea en `useCapabilityPublicSet.js`:
   ```js
   const provider = new CapabilityPersistenceProvider({ repositories });
   ```

---

## 10) Build

```
npm run build ✅
✓ 2400 modules transformed.
✓ built in 1.38s
```

---

## 11) Criterios de aceptación — Resultado

| Criterio | Resultado |
|---------|-----------|
| DynamicModule consume exclusivamente el Capability Public Set | ✅ PASS |
| La UI se construye dinámicamente desde capacidades | ✅ PASS |
| No existen decisiones basadas en moduleSlug | ✅ PASS |
| No se exponen detalles internos del Core a la UI | ✅ PASS |
| Se preserva el funcionamiento de los módulos actuales | ✅ PASS |
| El Runtime permanece desacoplado de Persistencia | ✅ PASS |
| No se introducen hardcodes | ✅ PASS |
| npm run build finaliza correctamente | ✅ PASS |
| No existen regresiones funcionales | ✅ PASS |

---

## 12) Dictamen final

```text
SPRINT STATUS:
LEVEL 3 — CAPABILITY DRIVEN RUNTIME

STATUS:
DYNAMIC MODULE CAPABILITY DRIVEN CERTIFIED

Single Source of Truth (SSOT):
Capability Public Set → DynamicModule
```
